use anyhow::{Context, Result};
use std::io::{self, BufRead};
use std::process::Command;

/// Enumerate files tracked by git in the given repository root.
///
/// Runs `git ls-files -co --exclude-standard --full-name` and returns
/// repo-relative paths with forward slashes.
pub fn git_ls_files(git_root: &str) -> Result<Vec<String>> {
    let output = Command::new("git")
        .args(["ls-files", "-co", "--exclude-standard", "--full-name"])
        .current_dir(git_root)
        .output()
        .context("Failed to run git ls-files")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("git ls-files failed: {}", stderr);
    }

    let stdout = String::from_utf8(output.stdout).context("git output is not valid UTF-8")?;

    let files: Vec<String> = stdout
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| line.replace('\\', "/"))
        .collect();

    Ok(files)
}

/// Read file paths from stdin (one per line).
pub fn read_stdin_files() -> Result<Vec<String>> {
    let stdin = io::stdin();
    let files: Vec<String> = stdin
        .lock()
        .lines()
        .map_while(Result::ok)
        .filter(|line| !line.is_empty())
        .map(|line| line.replace('\\', "/"))
        .collect();

    Ok(files)
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
