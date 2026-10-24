use anyhow::Result;
use colored::Colorize;
use regex::RegexBuilder;
use serde_json::Value;

use crate::ipc::Sidecar;
use crate::types::{
    ExecutionUnit, FixStatus, Location, PolicyMeta, RunResults, Scope, SkipReason, SkippedWork,
};

fn format_manual_fix(instructions: &str) -> String {
    format!(
        "\tManual fix: {}",
        instructions.lines().collect::<Vec<_>>().join("\n\t")
    )
}

/// Native scheduling with sidecar calls restricted to individual policy units.
pub struct CheckOptions<'a> {
    pub files: Vec<String>,
    pub git_root: &'a str,
    pub config_path: Option<&'a str>,
    pub fix: bool,
    pub verbose: bool,
    pub quiet: bool,
    pub concurrency: usize,
    pub json: bool,
}

/// Compile the shared ASCII subset. Advanced JS syntax and Unicode/line-ending
/// edge cases use only the match_files bridge, never a shared-run fallback.
fn compile_pattern(pattern: &Value) -> Option<regex::Regex> {
    let source = pattern
        .as_str()
        .or_else(|| pattern.get("source")?.as_str())?;
    let flags = if pattern.is_string() {
        "i"
    } else {
        pattern.get("flags")?.as_str()?
    };
    if !source.is_ascii() || flags.chars().any(|flag| !"dgimsuy".contains(flag)) {
        return None;
    }
    let mut escaped = false;
    let mut character_class = false;
    for (offset, ch) in source.char_indices() {
        if escaped {
            if !".\\/^$()*+?|[]{}-dDsSwWbBnrtfvx".contains(ch) {
                return None;
            }
            if ch == 'x'
                && !source
                    .get(offset + 1..offset + 3)
                    .is_some_and(|digits| digits.bytes().all(|byte| byte.is_ascii_hexdigit()))
            {
                return None;
            }
            escaped = false;
        } else if ch == '\\' {
            escaped = true;
        } else if ch == '[' {
            if character_class {
                return None;
            }
            character_class = true;
        } else if ch == ']' {
            if !character_class {
                return None;
            }
            character_class = false;
        } else if character_class && (ch == '&' || ch == '~') {
            // Rust class set operations differ from legacy JavaScript classes.
            return None;
        }
    }
    if escaped
        || character_class
        || source.replace("(?:", "(").contains("(?")
        || source.contains("--")
        || source.contains(r"\b{")
        || source.contains(r"\B{")
        || source.contains("[]")
        || source.contains("[^]")
    {
        return None;
    }
    let source = if flags.contains('y') {
        format!(r"\A(?:{source})")
    } else {
        source.to_string()
    };
    RegexBuilder::new(&source)
        .case_insensitive(flags.contains('i'))
        .multi_line(flags.contains('m'))
        .dot_matches_new_line(flags.contains('s'))
        .build()
        .ok()
}

fn match_pattern(sidecar: &mut Sidecar, pattern: &Value, files: &[String]) -> Result<Vec<bool>> {
    let regex = compile_pattern(pattern);
    let mut output = vec![false; files.len()];
    let mut fallback = Vec::new();
    let mut indices = Vec::new();
    for (index, file) in files.iter().enumerate() {
        if let Some(regex) = &regex
            && file.is_ascii()
            && !file.contains(['\n', '\r'])
        {
            output[index] = regex.is_match(file);
        } else {
            fallback.push(file.clone());
            indices.push(index);
        }
    }
    if !fallback.is_empty() {
        let matches = sidecar.match_files(pattern.clone(), fallback)?;
        anyhow::ensure!(
            matches.len() == indices.len(),
            "Invalid match response length"
        );
        for (index, matched) in indices.into_iter().zip(matches) {
            output[index] = matched;
        }
    }
    Ok(output)
}

fn exclusions(sidecar: &mut Sidecar, patterns: &[Value], files: &[String]) -> Result<Vec<bool>> {
    let mut excluded = vec![false; files.len()];
    for pattern in patterns {
        for (entry, matched) in excluded
            .iter_mut()
            .zip(match_pattern(sidecar, pattern, files)?)
        {
            *entry |= matched;
        }
    }
    Ok(excluded)
}

fn skip(policy: &PolicyMeta, file: Option<&str>, reason: SkipReason) -> SkippedWork {
    SkippedWork {
        policy: policy.name.clone(),
        policy_id: policy.instance_id.clone(),
        reason,
        location: file.map_or(Location::Repository { files: None }, |file| {
            Location::File {
                file: file.to_string(),
            }
        }),
    }
}

pub fn run_check(sidecar: &mut Sidecar, options: CheckOptions<'_>) -> Result<bool> {
    let config = sidecar.load_config(options.config_path, options.git_root)?;
    if options.verbose {
        eprintln!("{} policies loaded.", config.policies.len());
    }
    if options.fix && !options.quiet {
        eprintln!("Resolving errors if possible.");
    }
    sidecar.begin_run(options.fix)?;
    let files = &options.files;
    let globally_excluded = exclusions(sidecar, &config.exclude_files, files)?;
    let mut result = RunResults::default();
    result.perf_stats.count = files.len();
    result.perf_stats.processed = globally_excluded
        .iter()
        .filter(|excluded| !**excluded)
        .count();
    let mut file_outputs: Vec<RunResults> =
        (0..files.len()).map(|_| RunResults::default()).collect();
    let mut stopped = vec![false; files.len()];
    let mut routing = Vec::new();
    for policy in config
        .policies
        .iter()
        .filter(|policy| policy.scope == Scope::File)
    {
        let pattern = policy
            .r#match
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("File policy missing match"))?;
        let matches = match_pattern(sidecar, pattern, files)?;
        let excluded = exclusions(sidecar, &policy.exclude, files)?;
        routing.push((policy, matches, excluded));
    }
    let width = if options.fix { 1 } else { options.concurrency };
    // A wave contains at most `width` files. Each file's policies remain ordered,
    // and only read-only units in the same wave can execute concurrently.
    for start in (0..files.len()).step_by(width) {
        let end = files.len().min(start.saturating_add(width));
        for (policy, matches, excluded) in &routing {
            let mut units = Vec::new();
            let mut indices = Vec::new();
            for index in start..end {
                if !matches[index] {
                    continue;
                }
                if stopped[index] || globally_excluded[index] || excluded[index] {
                    file_outputs[index].skipped.push(skip(
                        policy,
                        Some(&files[index]),
                        if stopped[index] {
                            SkipReason::FileFixError
                        } else {
                            SkipReason::Excluded
                        },
                    ));
                } else {
                    units.push(ExecutionUnit {
                        policy_id: policy.instance_id.clone(),
                        file: Some(files[index].clone()),
                        files: None,
                    });
                    indices.push(index);
                }
            }
            if !units.is_empty() {
                let outputs = sidecar.execute_units(units)?;
                anyhow::ensure!(
                    outputs.len() == indices.len(),
                    "Invalid unit response length"
                );
                for (index, output) in indices.into_iter().zip(outputs) {
                    stopped[index] |= options.fix && !output.errors.is_empty();
                    file_outputs[index].append(output);
                }
            }
        }
    }
    for output in file_outputs {
        result.append(output);
    }
    let file_error = stopped.iter().any(|stopped| *stopped);
    let mut repository_error = false;
    let mut inventory = None;
    for policy in config
        .policies
        .iter()
        .filter(|policy| policy.scope == Scope::Repository)
    {
        if file_error || repository_error {
            result.skipped.push(skip(
                policy,
                None,
                if file_error {
                    SkipReason::FileFixError
                } else {
                    SkipReason::RepositoryFixError
                },
            ));
            continue;
        }
        if inventory.is_none() || options.fix {
            inventory = Some(crate::files::git_ls_files(options.git_root)?);
        }
        let files = inventory.as_ref().expect("Inventory explicitly loaded");
        let global = exclusions(sidecar, &config.exclude_files, files)?;
        let local = exclusions(sidecar, &policy.exclude, files)?;
        let eligible = files
            .iter()
            .enumerate()
            .filter(|(index, _)| !global[*index] && !local[*index])
            .map(|(_, file)| file.clone())
            .collect();
        let mut outputs = sidecar.execute_units(vec![ExecutionUnit {
            policy_id: policy.instance_id.clone(),
            file: None,
            files: Some(eligible),
        }])?;
        anyhow::ensure!(outputs.len() == 1, "Invalid repository response length");
        let output = outputs.remove(0);
        repository_error = options.fix && !output.errors.is_empty();
        result.append(output);
    }
    if options.json {
        println!("{}", serde_json::to_string(&result)?);
    } else {
        report_results(&result, options.verbose, options.quiet);
    }
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
    use serde_json::json;

    #[test]
    fn native_match_subset_retains_flags_and_advanced_js_is_delegated_only_for_matching() {
        let regex = compile_pattern(&json!({"source":r"\.(txt|md)$","flags":"g"})).unwrap();
        assert!(regex.is_match("file.txt"));
        assert!(!regex.is_match("file.TXT"));
        assert!(
            compile_pattern(&json!({"source":"file","flags":"i"}))
                .unwrap()
                .is_match("FILE")
        );
        let sticky = compile_pattern(&json!({"source":"file","flags":"y"})).unwrap();
        assert!(sticky.is_match("file.txt"));
        assert!(!sticky.is_match("a/file.txt"));
        for (source, flags) in [
            ("(?<=^)file", ""),
            (r"(a)\1", ""),
            (r"\u212a", ""),
            (r"\x{41}", ""),
            (r"\b{start}", ""),
            ("[a&&b]", ""),
            ("file", "v"),
            ("é", ""),
        ] {
            assert!(compile_pattern(&json!({"source":source,"flags":flags})).is_none());
        }
        for (source, flags) in [
            (r"(?:^|/)[a-z]+\.\w{3}$", "g"),
            (r"^\d+\.txt$", "m"),
            (r"file", "u"),
            (r"file", "s"),
        ] {
            assert!(compile_pattern(&json!({"source":source,"flags":flags})).is_some());
        }
    }

    #[test]
    fn indents_multiline_manual_fix_instructions() {
        assert_eq!(
            format_manual_fix("Use the shared helper.\r\nPreserve error handling."),
            "\tManual fix: Use the shared helper.\n\tPreserve error handling."
        );
    }
}
