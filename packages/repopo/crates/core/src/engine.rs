use anyhow::{Context, Result};
use colored::Colorize;
use regex::{Regex, RegexBuilder};
use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::ipc::Sidecar;
use crate::quickjs_runtime::QuickJsRuntime;
use crate::types::{HandlerResult, LoadConfigResponse, PolicyMeta, RepositoryPolicyResult};

fn format_manual_fix(instructions: &str) -> String {
    format!(
        "\tManual fix: {}",
        instructions.lines().collect::<Vec<_>>().join("\n\t")
    )
}

fn log_manual_fix(result: &HandlerResult, fallback: Option<&str>) {
    if let Some(instructions) = result.manual_fix().or(fallback).filter(|s| !s.is_empty()) {
        eprintln!("{}", format_manual_fix(instructions));
    }
}

/// A compiled policy ready for matching.
struct CompiledPolicy {
    meta: PolicyMeta,
    match_regex: Regex,
    exclude_regexes: Vec<Regex>,
}

/// Performance statistics for policy execution.
struct PerfStats {
    total_files: usize,
    handler_times: HashMap<String, Duration>,
    resolver_times: HashMap<String, Duration>,
}

impl PerfStats {
    fn new() -> Self {
        Self {
            total_files: 0,
            handler_times: HashMap::new(),
            resolver_times: HashMap::new(),
        }
    }

    fn record_handler(&mut self, policy_name: &str, duration: Duration) {
        *self
            .handler_times
            .entry(policy_name.to_string())
            .or_default() += duration;
    }

    fn record_resolver(&mut self, policy_name: &str, duration: Duration) {
        *self
            .resolver_times
            .entry(policy_name.to_string())
            .or_default() += duration;
    }

    fn log(&self, verbose: bool) {
        if !verbose {
            return;
        }

        eprintln!("\n{}", "Performance Statistics".bold());
        eprintln!("  Files processed: {}", self.total_files);

        if !self.handler_times.is_empty() {
            eprintln!("  Handler execution times:");
            let mut entries: Vec<_> = self.handler_times.iter().collect();
            entries.sort_by(|a, b| b.1.cmp(a.1));
            for (name, dur) in entries {
                eprintln!("    {name}: {:.1}ms", dur.as_secs_f64() * 1000.0);
            }
        }

        if !self.resolver_times.is_empty() {
            eprintln!("  Resolver execution times:");
            let mut entries: Vec<_> = self.resolver_times.iter().collect();
            entries.sort_by(|a, b| b.1.cmp(a.1));
            for (name, dur) in entries {
                eprintln!("    {name}: {:.1}ms", dur.as_secs_f64() * 1000.0);
            }
        }
    }
}

/// Execution backend shared by file and repository policies.
pub enum PolicyBackend<'a> {
    Sidecar(&'a mut Sidecar),
    QuickJs { runtime: &'a QuickJsRuntime },
}

impl PolicyBackend<'_> {
    fn run_handler_batch(
        &mut self,
        policy_id: usize,
        files: &[String],
        root: &str,
        resolve: bool,
        concurrency: usize,
    ) -> Result<Vec<(String, HandlerResult)>> {
        match self {
            Self::Sidecar(sidecar) => {
                sidecar.run_handler_batch(policy_id, files, resolve, concurrency)
            }
            Self::QuickJs { runtime, .. } => {
                runtime.run_handler_batch(policy_id, files, root, resolve)
            }
        }
    }

    fn run_resolver_batch(
        &mut self,
        policy_id: usize,
        files: &[String],
        root: &str,
    ) -> Result<Vec<(String, HandlerResult)>> {
        match self {
            Self::Sidecar(sidecar) => sidecar.run_resolver_batch(policy_id, files),
            Self::QuickJs { runtime, .. } => runtime.run_resolver_batch(policy_id, files, root),
        }
    }

    fn run_repository_policies(
        &mut self,
        resolve: bool,
        root: &str,
        config: &LoadConfigResponse,
    ) -> Result<Vec<RepositoryPolicyResult>> {
        match self {
            Self::Sidecar(sidecar) => sidecar.run_repository_policies(resolve),
            Self::QuickJs { runtime } => {
                let mut inventory = None;
                let mut results = Vec::new();
                for (policy_id, policy) in config.policies.iter().enumerate() {
                    if policy.scope != "repository" {
                        continue;
                    }
                    // Resolve mode can change the inventory in both file and repository handlers.
                    if inventory.is_none() || resolve {
                        inventory = Some(crate::files::git_ls_files(root)?);
                    }
                    results.extend(runtime.run_repository_policy(
                        policy_id,
                        inventory.as_ref().unwrap(),
                        root,
                        resolve,
                    )?);
                }
                Ok(results)
            }
        }
    }
}

/// Build a Rust regex from a JS regex pattern and flags.
fn compile_js_regex(pattern: &str, flags: &str) -> Result<Regex> {
    let rust_pattern = if flags.contains('y') {
        format!(r"\A(?:{pattern})")
    } else {
        pattern.to_string()
    };

    RegexBuilder::new(&rust_pattern)
        .case_insensitive(flags.contains('i'))
        .multi_line(flags.contains('m'))
        .dot_matches_new_line(flags.contains('s'))
        .build()
        .with_context(|| format!("Failed to compile regex pattern: {pattern} (flags: {flags})"))
}

/// Compile policy metadata into regex-ready policies.
fn compile_policies(config: &LoadConfigResponse) -> Result<(Vec<CompiledPolicy>, Vec<Regex>)> {
    let mut compiled = Vec::with_capacity(config.policies.len());

    for meta in &config.policies {
        let match_regex = compile_js_regex(&meta.match_pattern, &meta.match_flags)?;

        // Repository exclusions run against the full inventory in JavaScript, where
        // RegExp features unsupported by Rust (such as lookaround) remain available.
        let exclude_regexes: Vec<Regex> = if meta.scope == "repository" {
            Vec::new()
        } else {
            meta.exclude_files
                .iter()
                .map(|pattern| compile_js_regex(pattern.source(), pattern.flags()))
                .collect::<Result<Vec<_>>>()
                .with_context(|| {
                    format!(
                        "Failed to compile exclude patterns for policy '{}'",
                        meta.name
                    )
                })?
        };

        compiled.push(CompiledPolicy {
            meta: meta.clone(),
            match_regex,
            exclude_regexes,
        });
    }

    let global_excludes: Vec<Regex> = if config
        .policies
        .iter()
        .any(|policy| policy.scope != "repository")
    {
        config
            .exclude_files
            .iter()
            .map(|pattern| compile_js_regex(pattern.source(), pattern.flags()))
            .collect::<Result<Vec<_>>>()
            .context("Failed to compile global exclude patterns")?
    } else {
        Vec::new()
    };

    Ok((compiled, global_excludes))
}

/// Run the check engine using policy-first batching.
///
/// Uses pre-loaded metadata and either the sidecar or QuickJS to execute file batches.
pub fn run_check(
    backend: &mut PolicyBackend,
    config: &LoadConfigResponse,
    files: Vec<String>,
    git_root: &str,
    fix: bool,
    verbose: bool,
    quiet: bool,
    concurrency: usize,
) -> Result<bool> {
    if verbose {
        eprintln!("{} policies loaded.", config.policies.len());
        for p in &config.policies {
            eprintln!("  - {}", p.name);
        }
    }

    // Step 2: Compile regexes
    let (compiled_policies, global_excludes) = compile_policies(config)?;

    // Step 3: Filter to non-empty, non-globally-excluded files
    let eligible_files: Vec<&String> = files
        .iter()
        .filter(|f| {
            if f.is_empty() {
                return false;
            }
            if global_excludes.iter().any(|re| re.is_match(f)) {
                if verbose {
                    eprintln!("Excluded all handlers: {f}");
                }
                return false;
            }
            true
        })
        .collect();

    let mut stats = PerfStats::new();
    stats.total_files = eligible_files.len();
    let mut had_failures = false;

    if fix && !quiet {
        eprintln!("Resolving errors if possible.");
    }

    // Step 4: Policy-first batching — one IPC call per policy
    for (policy_id, policy) in compiled_policies.iter().enumerate() {
        if policy.meta.scope == "repository" {
            continue;
        }
        // Collect files matching this policy
        let matching_files: Vec<String> = eligible_files
            .iter()
            .filter(|f| {
                if !policy.match_regex.is_match(f) {
                    return false;
                }
                if policy.exclude_regexes.iter().any(|re| re.is_match(f)) {
                    if verbose {
                        eprintln!("Excluded from '{}' policy: {f}", policy.meta.name);
                    }
                    return false;
                }
                true
            })
            .map(|f| f.to_string())
            .collect();

        if matching_files.is_empty() {
            continue;
        }

        if verbose {
            eprintln!(
                "Policy '{}': checking {} files (batch)",
                policy.meta.name,
                matching_files.len()
            );
        }

        // Batch handler call — single IPC round-trip for all files
        let start = Instant::now();
        let batch_results = backend
            .run_handler_batch(policy_id, &matching_files, git_root, fix, concurrency)
            .with_context(|| {
                format!(
                    "Error executing batch handler for policy '{}'",
                    policy.meta.name
                )
            })?;
        stats.record_handler(&policy.meta.name, start.elapsed());

        // Collect files that need standalone resolver
        let mut needs_resolver: Vec<String> = Vec::new();
        let mut resolver_guidance = HashMap::new();

        for (file, result) in &batch_results {
            if result.is_pass() {
                continue;
            }

            if result.is_fixed() {
                if !quiet {
                    eprintln!(
                        "Resolved {} policy failure for file: {file}",
                        policy.meta.name
                    );
                }
                continue;
            }

            if result.is_fix_failed() {
                had_failures = true;
                let msg = format!("Error fixing {} policy failure in {file}", policy.meta.name);
                eprintln!("{}", msg.yellow());
                if let Some(err) = result.error_message() {
                    eprintln!("\t{err}");
                }
                log_manual_fix(result, None);
                continue;
            }

            // Failure — try standalone resolver if available, otherwise report
            if fix && policy.meta.has_resolver {
                needs_resolver.push(file.clone());
                if let Some(instructions) = result.manual_fix() {
                    resolver_guidance.insert(file.clone(), instructions.to_string());
                }
            } else {
                had_failures = true;
                let fixable = result.is_fixable();
                let fixable_tag = if fixable {
                    " (autofixable)".green().to_string()
                } else {
                    String::new()
                };
                let msg = format!(
                    "'{}' policy failure{fixable_tag}: {file}",
                    policy.meta.name.bold()
                );
                eprintln!("{}", msg);
                if let Some(err) = result.error_message() {
                    eprintln!("\t{err}");
                }
                log_manual_fix(result, None);
            }
        }

        // Batch resolver call for failures that need fixing
        if !needs_resolver.is_empty() {
            if verbose {
                eprintln!(
                    "Policy '{}': resolving {} files (batch)",
                    policy.meta.name,
                    needs_resolver.len()
                );
            }

            let start = Instant::now();
            let resolver_results = backend
                .run_resolver_batch(policy_id, &needs_resolver, git_root)
                .with_context(|| {
                    format!(
                        "Error executing batch resolver for policy '{}'",
                        policy.meta.name
                    )
                })?;
            stats.record_resolver(&policy.meta.name, start.elapsed());

            for (file, resolve_result) in &resolver_results {
                if resolve_result.is_fixed() || resolve_result.is_pass() {
                    if !quiet {
                        eprintln!(
                            "Resolved {} policy failure for file: {file}",
                            policy.meta.name
                        );
                    }
                } else {
                    had_failures = true;
                    let msg = format!("Error fixing {} policy failure in {file}", policy.meta.name);
                    eprintln!("{}", msg.yellow());
                    if let Some(err) = resolve_result.error_message() {
                        eprintln!("\t{err}");
                    }
                    log_manual_fix(
                        resolve_result,
                        resolver_guidance.get(file).map(String::as_str),
                    );
                }
            }
        }
    }

    if config
        .policies
        .iter()
        .any(|policy| policy.scope == "repository")
    {
        for result in backend.run_repository_policies(fix, git_root, config)? {
            let finding = result.outcome;
            let location = if finding.files.is_empty() {
                "repository".to_string()
            } else {
                finding.files.join(", ")
            };
            if finding.fixed == Some(true) {
                if !quiet {
                    eprintln!("Resolved {} policy failure: {location}", result.policy_id);
                }
                continue;
            }
            had_failures = true;
            let fixable = if finding.fixable == Some(true) {
                " (autofixable)"
            } else {
                ""
            };
            eprintln!(
                "'{}' policy failure{fixable}: {location}\n\t{}",
                result.policy_id, finding.error
            );
            if let Some(manual_fix) = finding.manual_fix {
                eprintln!("\t{manual_fix}");
            }
        }
    }

    // Step 5: Log performance stats
    stats.log(verbose);

    Ok(!had_failures)
}

/// List all configured policies.
pub fn run_list(config: &LoadConfigResponse, verbose: bool) -> Result<()> {
    println!("{}", "Configured policies:".bold());
    for policy in &config.policies {
        let resolver_tag = if policy.has_resolver {
            " [auto-fixable]".green().to_string()
        } else {
            String::new()
        };

        println!(
            "  {} {}{resolver_tag}",
            policy.name.bold(),
            policy.description.dimmed()
        );

        if verbose {
            println!(
                "    scope: {}",
                if policy.scope.is_empty() {
                    "file"
                } else {
                    &policy.scope
                }
            );
            if policy.scope != "repository" {
                println!("    match: {}", policy.match_pattern);
            }
            if !policy.exclude_files.is_empty() {
                println!(
                    "    excludes: {}",
                    policy
                        .exclude_files
                        .iter()
                        .map(|pattern| format!("/{}/{}", pattern.source(), pattern.flags()))
                        .collect::<Vec<_>>()
                        .join(", ")
                );
            }
        }
    }

    println!(
        "\n{} policies configured.",
        config.policies.len().to_string().bold()
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{PolicyBackend, compile_js_regex, compile_policies, format_manual_fix, run_check};
    use crate::quickjs_runtime::QuickJsRuntime;
    use crate::types::LoadConfigResponse;
    use std::path::{Path, PathBuf};
    use std::process::Command;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct QuickJsFixture {
        root: PathBuf,
    }

    impl QuickJsFixture {
        fn new(config: &str, files: &[&str]) -> Self {
            static NEXT_ID: AtomicUsize = AtomicUsize::new(0);
            let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!(
                "target/quickjs-policy-tests/{}-{}",
                std::process::id(),
                NEXT_ID.fetch_add(1, Ordering::Relaxed)
            ));
            std::fs::create_dir_all(&root).unwrap();
            std::fs::write(root.join("repopo.config.mjs"), config).unwrap();
            for file in files {
                std::fs::write(root.join(file), "").unwrap();
            }
            let status = Command::new("git")
                .args(["init", "--quiet"])
                .current_dir(&root)
                .status()
                .unwrap();
            assert!(status.success());
            Self { root }
        }

        fn runtime(&self) -> QuickJsRuntime {
            QuickJsRuntime::new(self.root(), &self.bundle()).unwrap()
        }

        fn bundle(&self) -> String {
            let sidecar = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../sidecar/sidecar.mjs");
            let bridge = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../sidecar/shims/quickjs-bridge.mjs");
            // Isolate runtime tests from preparation/cache behavior and unrelated
            // default-policy dependencies while executing the actual bridge.
            let output = Command::new("node")
                .args([
                    "-e",
                    r#"
                    const { createRequire } = require("node:module");
                    const { dirname, join } = require("node:path");
                    const { buildSync } = createRequire(process.argv[1])("esbuild");
                    const bridge = process.argv[2];
                    const config = process.argv[3];
                    const shims = dirname(bridge);
                    const result = buildSync({
                        stdin: { resolveDir: dirname(config), contents:
                            `import config from ${JSON.stringify(config)};
                             import { initBridge } from ${JSON.stringify(bridge)};
                             initBridge(config);`
                        },
                        bundle: true, write: false, format: "iife", platform: "neutral",
                        target: "es2020",
                        alias: {
                            effection: join(shims, "effection-shim.mjs"),
                            "node:fs/promises": join(shims, "fs-promises-shim.mjs"),
                            "node:fs": join(shims, "fs-shim.mjs"),
                            "node:os": join(shims, "os-shim.mjs"),
                            "node:url": join(shims, "url-shim.mjs")
                        }
                    });
                    process.stdout.write(result.outputFiles[0].text);
                    "#,
                ])
                .arg(sidecar)
                .arg(bridge)
                .arg(self.root.join("repopo.config.mjs"))
                .output()
                .expect("QuickJS regression tests require Node and installed esbuild dependencies");
            assert!(
                output.status.success(),
                "QuickJS test bundle failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            String::from_utf8(output.stdout).unwrap()
        }

        fn root(&self) -> &str {
            self.root.to_str().unwrap()
        }

        fn check(&self, fix: bool) -> bool {
            let runtime = self.runtime();
            let metadata = serde_json::from_str(&runtime.read_metadata().unwrap()).unwrap();
            run_check(
                &mut PolicyBackend::QuickJs { runtime: &runtime },
                &metadata,
                vec!["input.txt".into()],
                self.root(),
                fix,
                false,
                true,
                1,
            )
            .unwrap()
        }
    }

    impl Drop for QuickJsFixture {
        fn drop(&mut self) {
            std::fs::remove_dir_all(&self.root).unwrap();
        }
    }

    #[test]
    fn quickjs_fs_ignores_jsonfile_format_options_but_rejects_unsupported_io_options() {
        let fixture = QuickJsFixture::new(
            r#"
            import fs from "node:fs";
            import * as promises from "node:fs/promises";
            function check(value, message) { if (!value) throw new Error(message); }
            export default { policies: [{
                name: "JsonfileOptions", description: "Node-compatible option normalization", scope: "repository",
                handler: async ({ root }) => {
                    const file = root + "/package.json";
                    const options = {
                        spaces: 2, EOL: "\n", finalEOL: true, replacer: null,
                        encoding: "utf8", flag: "w", withFileTypes: "irrelevant-to-write"
                    };
                    const text = JSON.stringify({ license: "MIT" }, options.replacer, options.spaces) + options.EOL;
                    await new Promise((resolve, reject) => {
                        fs.writeFile(file, text, options, error => error ? reject(error) : resolve());
                    });
                    check(await promises.readFile(file, { encoding: "utf8", throws: false, reviver: null }) === text,
                        "jsonfile formatting options must not be rejected");
                    await promises.writeFile(file, "20", { ...options, encoding: "hex", flag: "a" });
                    check(fs.readFileSync(file, "utf8") === text + " ", "Meaningful encoding/flag options must be preserved");
                    check((await promises.stat(file, { unknown: true })).isFile(), "Unknown stat options");
                    check((await promises.readdir(root, { spaces: 2 })).includes("package.json"), "Unknown readdir options");
                    for (const extra of [{ flush: true }, { signal: {} }]) {
                        let rejected = false;
                        const unsupported = root + "/unsupported";
                        try { await promises.writeFile(unsupported, "text", extra); }
                        catch (error) { rejected = error.message.includes("not supported"); }
                        check(rejected && !fs.existsSync(unsupported), "Unsupported I/O options must not succeed");
                    }
                    let readRejected = false;
                    try { await promises.readFile(file, { signal: {} }); }
                    catch (error) { readRejected = error.message.includes("not supported"); }
                    check(readRejected, "Unsupported read cancellation must not succeed");
                    return true;
                }
            }] };
            "#,
            &[],
        );
        assert!(fixture.check(false));
    }

    #[test]
    fn quickjs_host_fs_preserves_binary_file_urls_errors_and_callback_scheduling() {
        let fixture = QuickJsFixture::new(
            r#"
            import fs from "node:fs";
            import * as promises from "node:fs/promises";
            import { URL, fileURLToPath, pathToFileURL } from "node:url";
            import os from "node:os";
            function check(value, message) { if (!value) throw new Error(message); }
            export default { policies: [{
                name: "HostFilesystem", description: "Truthful filesystem", scope: "repository",
                handler: async ({ root }) => {
                    const resource = new URL("resource%20%23.bin", pathToFileURL(root + "/config.mjs"));
                    check(fileURLToPath(resource) === root + "/resource #.bin", "File URL path");
                    const bytes = await promises.readFile(resource);
                    check(Buffer.isBuffer(bytes) && bytes.toString("hex") === "00ffc3a9", "Binary read");
                    check((await promises.stat(resource)).size === 4, "Native stat");
                    const copy = root + "/copy.bin";
                    await promises.writeFile(copy, bytes);
                    check(fs.readFileSync(copy).toString("hex") === "00ffc3a9", "Binary write");
                    check(await promises.readFile(copy, "hex") === "00ffc3a9", "Encoded read");
                    let missing;
                    try { await promises.readFile(root + "/missing"); } catch (error) { missing = error; }
                    check(missing instanceof Error && missing.code === "ENOENT" &&
                        missing.path === root + "/missing" && missing.syscall === "open", "Native ENOENT");
                    let notdir;
                    try { fs.statSync(copy + "/child"); } catch (error) { notdir = error.code; }
                    check(notdir === "ENOTDIR", "Native ENOTDIR");
                    let exists;
                    try { fs.copyFileSync(resource, copy, fs.constants.COPYFILE_EXCL); }
                    catch (error) { exists = error.code; }
                    check(exists === "EEXIST", "Exclusive copy");
                    let accessUnsupported = false;
                    try { fs.accessSync(copy, fs.constants.R_OK); }
                    catch (error) { accessUnsupported = error.code === "ENOTSUP"; }
                    check(accessUnsupported, "Unsupported access modes must fail");
                    let callbackRan = false;
                    const callbackRead = new Promise((resolve, reject) => {
                        fs.readFile(resource, (error, value) => {
                            callbackRan = true;
                            error ? reject(error) : resolve(value);
                        });
                    });
                    check(!callbackRan, "Callback must not run synchronously");
                    check((await callbackRead).toString("hex") === "00ffc3a9", "Callback bytes");
                    const created = await promises.mkdir(root + "/nested/child", { recursive: true });
                    check(created === root + "/nested", "Recursive mkdir first-created path");
                    check(await promises.mkdir(root + "/nested/child", { recursive: true }) === undefined, "Existing mkdir");
                    check(os.platform() === process.platform && os.arch() === process.arch, "Host platform");
                    const home = process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
                    if (home) check(os.homedir() === home, "Home is not repository cwd");
                    for (const name of ["hostname", "release", "cpus", "freemem", "totalmem",
                        "uptime", "networkInterfaces", "userInfo"]) {
                        let rejected = false;
                        try { os[name](); } catch (error) { rejected = error.message.includes("not supported"); }
                        check(rejected, "Fabricated os." + name);
                    }
                    return true;
                }
            }] };
            "#,
            &[],
        );
        std::fs::write(fixture.root.join("resource #.bin"), [0, 255, 0xc3, 0xa9]).unwrap();
        assert!(fixture.check(false));
    }

    #[cfg(unix)]
    #[test]
    fn quickjs_host_fs_preserves_symlinks_dirents_realpath_and_chmod() {
        use std::os::unix::fs::{PermissionsExt, symlink};
        let fixture = QuickJsFixture::new(
            r#"
            import fs from "node:fs";
            import * as promises from "node:fs/promises";
            function check(value, message) { if (!value) throw new Error(message); }
            export default { policies: [{
                name: "SymlinkFilesystem", description: "Native symlink metadata", scope: "repository",
                handler: async ({ root }) => {
                    check((await promises.lstat(root + "/link")).isSymbolicLink(), "lstat follows link");
                    check((await promises.stat(root + "/link")).isFile(), "stat target");
                    const entries = await promises.readdir(root, { withFileTypes: true });
                    const broken = entries.find(entry => entry.name === "broken");
                    check(broken.isSymbolicLink() && !broken.isFile() && !broken.isDirectory(), "Broken link Dirent");
                    check(await promises.realpath(root + "/link") === root + "/original", "Canonical realpath");
                    let missing;
                    try { fs.realpathSync(root + "/missing"); } catch (error) { missing = error.code; }
                    check(missing === "ENOENT", "Realpath must not return nonexistent input");
                    await promises.chmod(root + "/original", 0o600);
                    check((fs.statSync(root + "/original").mode & 0o777) === 0o600, "chmod no-op");
                    return true;
                }
            }] };
            "#,
            &["original"],
        );
        symlink("original", fixture.root.join("link")).unwrap();
        symlink("does-not-exist", fixture.root.join("broken")).unwrap();
        assert!(fixture.check(false));
        assert_eq!(
            std::fs::metadata(fixture.root.join("original"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }

    #[test]
    fn quickjs_mixed_scopes_share_one_evaluation_and_stable_instance_ids() {
        let make_policy = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../esm/makePolicy.js");
        let config = format!(
            "import {{ policy }} from {};\n",
            serde_json::to_string(&make_policy).unwrap()
        ) + r#"
            globalThis.evaluations = (globalThis.evaluations ?? 0) + 1;
            let handled = 0;
            export default { policies: [policy({
                name: "Mixed", description: "file instance", defaultConfig: { increment: 1 },
                match: /txt$/i, handler: async ({ config }) => { handled += config.increment; return true; },
                resolver: async () => true
            }, undefined, { instanceId: "files", exclude: [/^README/, "vendor"] }), policy({
                name: "Mixed", description: "repository instance",
                scope: "repository", defaultConfig: { expected: 1 },
                handler: async (args) => [{
                    error: `${globalThis.evaluations}:${handled}:${args.config.expected}:${"file" in args}`,
                    files: args.files, fixed: true, fixable: true, manualFix: "Keep guidance"
                }]
            }, undefined, { instanceId: "repository" })] };
            "#;
        let fixture = QuickJsFixture::new(&config, &["input.txt"]);
        let runtime = fixture.runtime();
        let metadata: LoadConfigResponse =
            serde_json::from_str(&runtime.read_metadata().unwrap()).unwrap();
        assert_eq!(metadata.policies[0].instance_id, "files");
        assert_eq!(metadata.policies[0].match_flags, "i");
        assert!(metadata.policies[0].has_resolver);
        assert_eq!(metadata.policies[0].exclude_files[0].flags(), "");
        assert_eq!(metadata.policies[0].exclude_files[1].flags(), "i");
        assert_eq!(metadata.policies[1].instance_id, "repository");
        let files = vec!["input.txt".into()];
        assert!(
            runtime
                .run_handler_batch(0, &files, fixture.root(), false)
                .unwrap()[0]
                .1
                .is_pass()
        );
        let results = runtime
            .run_repository_policy(1, &files, fixture.root(), true)
            .unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].policy_id, "repository");
        assert_eq!(results[0].outcome.error, "1:1:1:false");
        assert_eq!(results[0].outcome.files, files);
        assert_eq!(results[0].outcome.fixed, Some(true));
        assert_eq!(results[0].outcome.fixable, Some(true));
        assert_eq!(
            results[0].outcome.manual_fix.as_deref(),
            Some("Keep guidance")
        );
    }

    #[test]
    fn quickjs_validates_duplicate_instances_during_evaluation() {
        for (instances, expected) in [
            (
                r#"[{ ...definition }, { ...definition }]"#,
                "Set a unique instanceId",
            ),
            (
                r#"[{ ...definition, instanceId: "same" }, { ...definition, instanceId: "same" }]"#,
                "Duplicate policy instance ID",
            ),
            (
                r#"[{ ...definition }, { ...definition, name: "Other", instanceId: "Duplicate" }]"#,
                "conflicts with another configured policy",
            ),
        ] {
            let fixture = QuickJsFixture::new(
                &format!(
                    r#"
                    const definition = {{
                        name: "Duplicate", description: "Identity validation",
                        scope: "repository", handler: async () => true
                    }};
                    export default {{ policies: {instances} }};
                    "#
                ),
                &[],
            );
            let bundle = fixture.bundle();
            let error = match QuickJsRuntime::new(fixture.root(), &bundle) {
                Ok(_) => panic!("Invalid instances were accepted"),
                Err(error) => error,
            };
            assert!(error.to_string().contains(expected), "{error}");
        }
    }

    #[test]
    fn quickjs_repository_inventory_is_independent_of_stdin_and_preserves_exclusion_flags() {
        let fixture = QuickJsFixture::new(
            r#"
            let handled = 0;
            export default {
                excludeFiles: [/^README/, "^vendor", /^global/g],
                policies: [{
                    name: "Files", description: "Only stdin files", match: /txt$/,
                    handler: async () => { handled++; return true; }
                }, {
                    name: "Inventory", description: "Full inventory", scope: "repository",
                    excludeFiles: [/^UPPER/, /^skip/g, "^ignored", /^line$/m, /^(?=lookaround)/],
                    handler: function* ({ files }) {
                        const expected = ["input.txt", "other.txt", "readme.txt", "upper.txt"];
                        if (handled !== 1 || expected.some(file => !files.includes(file)) ||
                            files.some(file => /^(README|VENDOR|UPPER|skip|IGNORED|global)/.test(file)) ||
                            files.includes("prefix\nline") || files.includes("lookaround.txt")) {
                            return [{ error: JSON.stringify({ files, handled }) }];
                        }
                        return true;
                    }
                }]
            };
            "#,
            &[
                "input.txt",
                "other.txt",
                "README.txt",
                "readme.txt",
                "VENDOR.txt",
                "UPPER.txt",
                "upper.txt",
                "skip-a.txt",
                "skip-b.txt",
                "IGNORED.txt",
                "global-a.txt",
                "global-b.txt",
                "prefix\nline",
                "lookaround.txt",
            ],
        );
        assert!(fixture.check(false));
    }

    #[test]
    fn quickjs_refreshes_inventory_after_file_and_repository_fixes() {
        let fixture = QuickJsFixture::new(
            r#"
            import { writeFile } from "node:fs/promises";
            export default { policies: [{
                name: "FileFix", description: "Create a file", match: /input.txt$/,
                handler: async ({ root, resolve }) => {
                    if (!resolve) throw new Error("Expected fix mode");
                    await writeFile(root + "/after-file.txt", "");
                    return { error: "Created file", fixed: true };
                }
            }, {
                name: "RepositoryFix", description: "Create another file", scope: "repository",
                handler: async ({ root, files, resolve }) => {
                    if (!resolve || !files.includes("after-file.txt")) throw new Error("Stale file inventory");
                    await writeFile(root + "/after-repository.txt", "");
                    return [{ error: "Created repository file", fixed: true }];
                }
            }, {
                name: "VerifyRefresh", description: "Observe both fixes", scope: "repository",
                handler: async ({ files }) => files.includes("after-file.txt") &&
                    files.includes("after-repository.txt") ? true : [{ error: "Stale repository inventory" }]
            }] };
            "#,
            &["input.txt"],
        );
        assert!(fixture.check(true));
        assert!(fixture.root.join("after-file.txt").exists());
        assert!(fixture.root.join("after-repository.txt").exists());
    }

    #[test]
    fn quickjs_invalid_repository_results_and_handler_errors_are_system_findings() {
        let fixture = QuickJsFixture::new(
            r#"
            const values = [false, undefined, {}, { error: "Not an array" },
                [{ error: 1 }], [{ error: "Invalid files", files: [1] }],
                [{ error: "Invalid flag", fixed: "yes" }], Array(1),
                [{ error: "Sparse paths", files: Array(1) }]];
            export default { policies: [
                ...values.map((value, index) => ({
                    name: `Invalid${index}`, description: "Invalid repository result", scope: "repository",
                    handler: async () => value
                })),
                { name: "Throws", description: "Handler error", scope: "repository",
                    handler: function* () { throw new Error("Repository exploded"); } },
                { name: "Empty", description: "No findings", scope: "repository",
                    handler: async () => [] },
                { name: "Passing", description: "Pass", scope: "repository",
                    handler: async () => true }
            ] };
            "#,
            &[],
        );
        let runtime = fixture.runtime();
        for index in 0..10 {
            let results = runtime
                .run_repository_policy(index, &[], fixture.root(), true)
                .unwrap();
            assert_eq!(results.len(), 1);
            assert!(
                results[0]
                    .outcome
                    .error
                    .starts_with("System Error: Error executing repository policy '")
            );
            assert!(results[0].outcome.files.is_empty());
            assert_eq!(results[0].outcome.fixed, None);
            if index == 9 {
                assert!(results[0].outcome.error.contains("Repository exploded"));
            } else {
                assert!(
                    results[0]
                        .outcome
                        .error
                        .contains("must return true or an array of findings")
                );
            }
        }
        for index in [10, 11] {
            assert!(
                runtime
                    .run_repository_policy(index, &[], fixture.root(), false)
                    .unwrap()
                    .is_empty()
            );
        }
        assert!(!fixture.check(true));
    }

    #[test]
    fn preserves_exclusion_flags_and_case_insensitive_string_defaults() {
        let config: LoadConfigResponse = serde_json::from_value(serde_json::json!({
            "policies": [{
                "name": "Example",
                "description": "Example",
                "matchPattern": ".*",
                "excludeFiles": [
                    { "source": "^README", "flags": "" },
                    { "source": "^skip$", "flags": "m" },
                    "vendor/"
                ]
            }],
            "excludeFiles": [
                { "source": "^README", "flags": "" },
                { "source": "^skip$", "flags": "m" },
                "vendor/"
            ]
        }))
        .unwrap();
        let (policies, global) = compile_policies(&config).unwrap();
        for exclusions in [&global, &policies[0].exclude_regexes] {
            assert!(exclusions[0].is_match("README.md"));
            assert!(!exclusions[0].is_match("readme.md"));
            assert!(exclusions[1].is_match("prefix\nskip"));
            assert!(exclusions[2].is_match("VENDOR/test.txt"));
        }
    }

    #[test]
    fn preserves_dotall_and_sticky_matching() {
        assert!(compile_js_regex("a.b", "s").unwrap().is_match("a\nb"));
        let sticky = compile_js_regex("a|b", "y").unwrap();
        assert!(sticky.is_match("abc"));
        assert!(!sticky.is_match("cab"));
    }

    #[test]
    fn indents_multiline_manual_fix_instructions() {
        assert_eq!(
            format_manual_fix("Use the shared helper.\r\nPreserve error handling."),
            "\tManual fix: Use the shared helper.\n\tPreserve error handling."
        );
    }
}
