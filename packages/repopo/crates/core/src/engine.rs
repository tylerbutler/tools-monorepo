use anyhow::{Context, Result};
use colored::Colorize;
use regex::Regex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::ipc::Sidecar;
use crate::quickjs_runtime::QuickJsRuntime;
use crate::types::{HandlerResult, LoadConfigResponse, PolicyMeta};

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

/// Execution backend for policy checks.
pub enum PolicyBackend<'a> {
    /// IPC-based execution via Node.js sidecar.
    Sidecar(&'a mut Sidecar),
    /// In-process execution via QuickJS.
    QuickJs(&'a QuickJsRuntime),
}

impl PolicyBackend<'_> {
    fn run_handler_batch(
        &mut self,
        policy_id: usize,
        files: &[String],
        root: &str,
        resolve: bool,
    ) -> anyhow::Result<Vec<(String, HandlerResult)>> {
        match self {
            PolicyBackend::Sidecar(s) => s.run_handler_batch(policy_id, files, resolve),
            PolicyBackend::QuickJs(js) => js.run_handler_batch(policy_id, files, root, resolve),
        }
    }

    fn run_resolver_batch(
        &mut self,
        policy_id: usize,
        files: &[String],
        root: &str,
    ) -> anyhow::Result<Vec<(String, HandlerResult)>> {
        match self {
            PolicyBackend::Sidecar(s) => s.run_resolver_batch(policy_id, files),
            PolicyBackend::QuickJs(js) => js.run_resolver_batch(policy_id, files, root),
        }
    }
}

/// Build a Rust regex from a JS regex pattern and flags.
fn compile_js_regex(pattern: &str, flags: &str) -> Result<Regex> {
    let case_insensitive = flags.contains('i');

    let rust_pattern = if case_insensitive {
        format!("(?i){pattern}")
    } else {
        pattern.to_string()
    };

    Regex::new(&rust_pattern)
        .with_context(|| format!("Failed to compile regex pattern: {pattern} (flags: {flags})"))
}

/// Compile policy metadata into regex-ready policies.
fn compile_policies(config: &LoadConfigResponse) -> Result<(Vec<CompiledPolicy>, Vec<Regex>)> {
    let mut compiled = Vec::with_capacity(config.policies.len());

    for meta in &config.policies {
        let match_regex = compile_js_regex(&meta.match_pattern, &meta.match_flags)?;

        let exclude_regexes: Vec<Regex> = meta
            .exclude_files
            .iter()
            .map(|pattern| compile_js_regex(pattern, "i"))
            .collect::<Result<Vec<_>>>()
            .with_context(|| {
                format!(
                    "Failed to compile exclude patterns for policy '{}'",
                    meta.name
                )
            })?;

        compiled.push(CompiledPolicy {
            meta: meta.clone(),
            match_regex,
            exclude_regexes,
        });
    }

    let global_excludes: Vec<Regex> = config
        .exclude_files
        .iter()
        .map(|pattern| compile_js_regex(pattern, "i"))
        .collect::<Result<Vec<_>>>()
        .context("Failed to compile global exclude patterns")?;

    Ok((compiled, global_excludes))
}

/// Run the check engine using policy-first batching.
///
/// Takes a pre-loaded config and an execution backend (IPC sidecar or QuickJS).
/// For each policy, collects matching files and runs a single batch call,
/// then reports results.
pub fn run_check(
    backend: &mut PolicyBackend,
    config: &LoadConfigResponse,
    files: Vec<String>,
    git_root: &str,
    fix: bool,
    verbose: bool,
    quiet: bool,
) -> Result<bool> {
    if verbose {
        eprintln!("{} policies loaded.", config.policies.len());
        for p in &config.policies {
            eprintln!("  - {}", p.name);
        }
    }

    // Step 1: Compile regexes
    let (compiled_policies, global_excludes) = compile_policies(config)?;

    // Step 2: Filter to non-empty, non-globally-excluded files
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

    // Step 3: Policy-first batching — one batch call per policy
    for (policy_id, policy) in compiled_policies.iter().enumerate() {
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

        // Batch handler call
        let start = Instant::now();
        let batch_results = backend
            .run_handler_batch(policy_id, &matching_files, git_root, fix)
            .with_context(|| {
                format!(
                    "Error executing batch handler for policy '{}'",
                    policy.meta.name
                )
            })?;
        stats.record_handler(&policy.meta.name, start.elapsed());

        // Collect files that need standalone resolver
        let mut needs_resolver: Vec<String> = Vec::new();

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
                let msg = format!(
                    "Error fixing {} policy failure in {file}",
                    policy.meta.name
                );
                eprintln!("{}", msg.yellow());
                if let Some(err) = result.error_message() {
                    eprintln!("\t{err}");
                }
                continue;
            }

            // Failure — try standalone resolver if available, otherwise report
            if fix && policy.meta.has_resolver {
                needs_resolver.push(file.clone());
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
                    let msg = format!(
                        "Error fixing {} policy failure in {file}",
                        policy.meta.name
                    );
                    eprintln!("{}", msg.yellow());
                    if let Some(err) = resolve_result.error_message() {
                        eprintln!("\t{err}");
                    }
                }
            }
        }
    }

    // Step 4: Log performance stats
    stats.log(verbose);

    Ok(!had_failures)
}

/// List all configured policies.
pub fn run_list(
    config: &LoadConfigResponse,
    verbose: bool,
) -> Result<()> {
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
            println!("    match: {}", policy.match_pattern);
            if !policy.exclude_files.is_empty() {
                println!("    excludes: {}", policy.exclude_files.join(", "));
            }
        }
    }

    println!(
        "\n{} policies configured.",
        config.policies.len().to_string().bold()
    );

    Ok(())
}
