use anyhow::{Context, Result};
use std::io::{self, Read};
use std::process::Command;

/// Enumerate files tracked by git in the given repository root.
///
/// Runs `git ls-files -co -z --exclude-standard --full-name` and returns
/// repo-relative paths with forward slashes.
pub fn git_ls_files(git_root: &str) -> Result<Vec<String>> {
    let output = Command::new("git")
        .args(["ls-files", "-co", "-z", "--exclude-standard", "--full-name"])
        .current_dir(git_root)
        .output()
        .context("Failed to run git ls-files")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("git ls-files failed: {}", stderr);
    }

    let stdout = String::from_utf8(output.stdout).context("git output is not valid UTF-8")?;

    Ok(parse_file_paths(&stdout))
}

/// Read file paths from stdin (one per line).
pub fn read_stdin_files() -> Result<Vec<String>> {
    let stdin = io::stdin();
    let mut input = String::new();
    stdin
        .lock()
        .read_to_string(&mut input)
        .context("Failed to read file selection from stdin")?;
    Ok(parse_file_paths(&input))
}

fn parse_file_paths(input: &str) -> Vec<String> {
    let normalized = input.replace('\\', "/");
    let nul_delimited = normalized.contains('\0');
    normalized
        .split(if nul_delimited { '\0' } else { '\n' })
        .map(|path| {
            if nul_delimited {
                path
            } else {
                path.strip_suffix('\r').unwrap_or(path)
            }
        })
        .filter(|path| !path.is_empty())
        .map(str::to_owned)
        .collect()
}

/// Find the root of the git repository containing the given path.
pub fn find_git_root(start_dir: &str) -> Result<String> {
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(start_dir)
        .output()
        .context("Failed to run git rev-parse")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Not a git repository: {}", stderr);
    }

    let root = String::from_utf8(output.stdout)
        .context("git output is not valid UTF-8")?
        .trim()
        .to_string();

    Ok(root)
}

#[cfg(test)]
mod tests {
    use super::parse_file_paths;

    #[test]
    fn selection_parsing_matches_typescript_for_nul_crlf_and_windows_paths() {
        assert_eq!(parse_file_paths("a\r\nb\\c\n\n"), vec!["a", "b/c"]);
        assert_eq!(parse_file_paths("a\nb\0c\r\0"), vec!["a\nb", "c\r"]);
        assert!(parse_file_paths("").is_empty());
    }
}
