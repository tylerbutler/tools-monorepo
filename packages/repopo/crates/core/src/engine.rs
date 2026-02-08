use anyhow::{Context, Result};
use colored::Colorize;
use regex::Regex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::ipc::Sidecar;
use crate::types::{LoadConfigResponse, PolicyMeta};

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

/// The outcome of checking a single file against a single policy.
enum CheckOutcome {
    /// File passed the policy.
    Pass,
    /// File was excluded from the policy.
    Excluded,
    /// Policy violation was auto-fixed.
    Fixed { file: String, policy: String },
    /// Auto-fix was attempted but failed.
    FixFailed {
        file: String,
        policy: String,
        error: Option<String>,
    },
    /// Policy violation detected.
    Failure {
        file: String,
        policy: String,
        error: Option<String>,
        fixable: bool,
    },
}

/// Run the check engine.
///
/// This is the main entry point for the Rust core. It:
/// 1. Loads config from the Node sidecar
/// 2. Compiles regexes
/// 3. Enumerates and matches files
/// 4. Calls handlers via IPC
/// 5. Reports results
pub fn run_check(
    sidecar: &mut Sidecar,
    files: Vec<String>,
    git_root: &str,
    config_path: Option<&str>,
    fix: bool,
    verbose: bool,
    quiet: bool,
) -> Result<bool> {
    // Step 1: Load config from sidecar
    if verbose {
        eprintln!("Loading configuration...");
    }

    let config = sidecar.load_config(config_path, git_root)?;

    if verbose {
        eprintln!("{} policies loaded.", config.policies.len());
        for p in &config.policies {
            eprintln!("  - {}", p.name);
        }
    }

    // Step 2: Compile regexes
    let (compiled_policies, global_excludes) = compile_policies(&config)?;

    // Step 3: Process files
    let mut stats = PerfStats::new();
    let mut had_failures = false;

    if fix && !quiet {
        eprintln!("Resolving errors if possible.");
    }

    for file in &files {
        if file.is_empty() {
            continue;
        }

        stats.total_files += 1;

        // Check global exclusions
        if global_excludes.iter().any(|re| re.is_match(file)) {
            if verbose {
                eprintln!("Excluded all handlers: {file}");
            }
            continue;
        }

        // Find matching policies
        for policy in &compiled_policies {
            if !policy.match_regex.is_match(file) {
                continue;
            }

            // Check per-policy exclusions
            if policy.exclude_regexes.iter().any(|re| re.is_match(file)) {
                if verbose {
                    eprintln!("Excluded from '{}' policy: {file}", policy.meta.name);
                }
                continue;
            }

            // Run the handler via IPC
            let outcome =
                run_policy_on_file(sidecar, &policy.meta, file, git_root, fix, &mut stats)?;

            match &outcome {
                CheckOutcome::Pass | CheckOutcome::Excluded => {}
                CheckOutcome::Fixed { file, policy } => {
                    if !quiet {
                        eprintln!("Resolved {policy} policy failure for file: {file}");
                    }
                }
                CheckOutcome::FixFailed {
                    file,
                    policy,
                    error,
                } => {
                    had_failures = true;
                    let msg = format!("Error fixing {policy} policy failure in {file}");
                    eprintln!("{}", msg.yellow());
                    if let Some(err) = error {
                        eprintln!("\t{err}");
                    }
                }
                CheckOutcome::Failure {
                    file,
                    policy,
                    error,
                    fixable,
                } => {
                    had_failures = true;
                    let fixable_tag = if *fixable {
                        " (autofixable)".green().to_string()
                    } else {
                        String::new()
                    };
                    let msg = format!(
                        "'{}' policy failure{fixable_tag}: {file}",
                        policy.bold()
                    );
                    eprintln!("{}", msg);
                    if let Some(err) = error {
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

/// Run a single policy handler on a file, optionally attempting a fix.
fn run_policy_on_file(
    sidecar: &mut Sidecar,
    policy: &PolicyMeta,
    file: &str,
    root: &str,
    fix: bool,
    stats: &mut PerfStats,
) -> Result<CheckOutcome> {
    // Run handler
    let start = Instant::now();
    let result = sidecar
        .run_handler(&policy.name, file, root, fix)
        .with_context(|| {
            format!(
                "Error executing policy '{}' for file '{file}'",
                policy.name
            )
        })?;
    stats.record_handler(&policy.name, start.elapsed());

    if result.is_pass() {
        return Ok(CheckOutcome::Pass);
    }

    // Handler returned a failure. Check if it already resolved itself.
    if result.is_fixed() {
        return Ok(CheckOutcome::Fixed {
            file: file.to_string(),
            policy: policy.name.clone(),
        });
    }

    if result.is_fix_failed() {
        return Ok(CheckOutcome::FixFailed {
            file: file.to_string(),
            policy: policy.name.clone(),
            error: result.error_message(),
        });
    }

    // If --fix is set and the policy has a standalone resolver, try it
    if fix && policy.has_resolver {
        let start = Instant::now();
        let resolve_result = sidecar
            .run_resolver(&policy.name, file, root)
            .with_context(|| {
                format!(
                    "Error resolving policy '{}' for file '{file}'",
                    policy.name
                )
            })?;
        stats.record_resolver(&policy.name, start.elapsed());

        if resolve_result.is_fixed() || resolve_result.is_pass() {
            return Ok(CheckOutcome::Fixed {
                file: file.to_string(),
                policy: policy.name.clone(),
            });
        }

        return Ok(CheckOutcome::FixFailed {
            file: file.to_string(),
            policy: policy.name.clone(),
            error: resolve_result.error_message(),
        });
    }

    // Report failure
    Ok(CheckOutcome::Failure {
        file: file.to_string(),
        policy: policy.name.clone(),
        error: result.error_message(),
        fixable: result.is_fixable(),
    })
}

/// List all configured policies.
pub fn run_list(
    sidecar: &mut Sidecar,
    git_root: &str,
    config_path: Option<&str>,
    verbose: bool,
) -> Result<()> {
    let config = sidecar.load_config(config_path, git_root)?;

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
