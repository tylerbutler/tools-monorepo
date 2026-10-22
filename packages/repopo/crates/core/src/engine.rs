use anyhow::Result;
use colored::Colorize;

use crate::ipc::Sidecar;
use crate::types::{FixStatus, RunResults, Scope, SkipReason};

fn format_manual_fix(instructions: &str) -> String {
    format!(
        "\tManual fix: {}",
        instructions.lines().collect::<Vec<_>>().join("\n\t")
    )
}

/// The shared sidecar runtime owns execution semantics, including JS regex
/// matching. Rust regexes cannot faithfully implement arbitrary JS expressions.
pub struct CheckOptions<'a> {
    pub files: Vec<String>,
    pub git_root: &'a str,
    pub config_path: Option<&'a str>,
    pub fix: bool,
    pub verbose: bool,
    pub quiet: bool,
    pub concurrency: usize,
}

pub fn run_check(sidecar: &mut Sidecar, options: CheckOptions<'_>) -> Result<bool> {
    let config = sidecar.load_config(options.config_path, options.git_root)?;
    if options.verbose {
        eprintln!("{} policies loaded.", config.policies.len());
    }
    if options.fix && !options.quiet {
        eprintln!("Resolving errors if possible.");
    }
    let result = sidecar.run_policies(options.files, options.fix, options.concurrency)?;
    report_results(&result, options.verbose, options.quiet);
    Ok(result.success())
}

fn report_results(result: &RunResults, verbose: bool, quiet: bool) {
    for finding in &result.findings {
        let message = format!(
            "{}: {}: {}",
            finding.policy_id,
            finding.location.display(),
            finding.message
        );
        if finding.fix_status == Some(FixStatus::Fixed) {
            if !quiet {
                eprintln!("Resolved {message}");
            }
        } else {
            eprintln!("{message}");
            if let Some(guidance) = &finding.manual_fix
                && !guidance.is_empty()
            {
                eprintln!("{}", format_manual_fix(guidance));
            }
        }
    }
    for error in &result.errors {
        eprintln!(
            "Execution error ({:?}, {:?}) {}: {}: {}",
            error.kind,
            error.phase,
            error.policy_id,
            error.location.display(),
            error.message
        );
        if verbose {
            eprintln!("\tCause: {}", error.cause);
        }
    }
    for work in &result.skipped {
        if verbose || work.reason != SkipReason::Excluded {
            eprintln!(
                "Skipped {}: {} ({:?})",
                work.policy_id,
                work.location.display(),
                work.reason
            );
        }
    }
    if verbose && !quiet {
        eprintln!("\nPerformance Statistics");
        eprintln!(
            "  Files processed: {} ({} candidates)",
            result.perf_stats.processed, result.perf_stats.count
        );
        for (action, timings) in &result.perf_stats.data {
            for (id, millis) in timings {
                eprintln!("  {action} {id}: {millis:.1}ms");
            }
        }
    }
}

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
            " [auto-fixable]"
        } else {
            ""
        };
        println!(
            "  {} ({}) {}{resolver_tag}",
            policy.instance_id.bold(),
            policy.name,
            policy.description
        );
        if verbose {
            println!("    scope: {:?}", policy.scope);
            if policy.scope == Scope::File
                && let Some(pattern) = &policy.r#match
            {
                println!("    match: {pattern}");
            }
            println!("    excludes: {:?}", policy.exclude);
        }
    }
    if verbose {
        println!("Global exclusions: {:?}", config.exclude_files);
    }
    println!("\n{} policies configured.", config.policies.len());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn indents_multiline_manual_fix_instructions() {
        assert_eq!(
            format_manual_fix("Use the shared helper.\r\nPreserve error handling."),
            "\tManual fix: Use the shared helper.\n\tPreserve error handling."
        );
    }
}
