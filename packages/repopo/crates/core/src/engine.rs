use anyhow::{Context, Result};
use colored::Colorize;
use regex::{Regex, RegexBuilder};
use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::ipc::Sidecar;
use crate::types::{HandlerResult, LoadConfigResponse, PolicyMeta};

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

        let exclude_regexes: Vec<Regex> = meta
            .exclude_files
            .iter()
            .map(|pattern| compile_js_regex(pattern.source(), pattern.flags()))
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
        .map(|pattern| compile_js_regex(pattern.source(), pattern.flags()))
        .collect::<Result<Vec<_>>>()
        .context("Failed to compile global exclude patterns")?;

    Ok((compiled, global_excludes))
}

/// Run the check engine using policy-first batching.
///
/// This is the main entry point for the Rust core. It:
/// 1. Loads config from the Node sidecar
/// 2. Compiles regexes
/// 3. For each policy, collects matching files and runs a single batch IPC call
/// 4. Reports results
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
        let batch_results = sidecar
            .run_handler_batch(policy_id, &matching_files, fix)
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
            let resolver_results = sidecar
                .run_resolver_batch(policy_id, &needs_resolver)
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
        for result in sidecar.run_repository_policies(fix)? {
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
    use super::{compile_js_regex, compile_policies, format_manual_fix};
    use crate::types::LoadConfigResponse;

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
