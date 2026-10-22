use anyhow::{Context, Result};
use std::collections::HashSet;
use std::io::{self, Read};
use std::process::Command;
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::Duration;

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

    let deleted = Command::new("git")
        .args(["ls-files", "--deleted", "-z", "--full-name"])
        .current_dir(git_root)
        .output()
        .context("Failed to enumerate deleted Git files")?;
    if !deleted.status.success() {
        anyhow::bail!(
            "git ls-files --deleted failed: {}",
            String::from_utf8_lossy(&deleted.stderr)
        );
    }
    let deleted = String::from_utf8(deleted.stdout).context("git output is not valid UTF-8")?;
    let deleted: HashSet<_> = parse_file_paths(&deleted).into_iter().collect();
    Ok(parse_file_paths(&stdout)
        .into_iter()
        .filter(|file| !deleted.contains(file))
        .collect())
}

/// Read file paths from stdin (one per line).
pub fn read_stdin_files() -> Result<Vec<String>> {
    read_file_selection(io::stdin())
}

fn read_file_selection(mut reader: impl Read + Send + 'static) -> Result<Vec<String>> {
    let (send, received) = mpsc::channel();
    thread::Builder::new()
        .name("stdin-selection".into())
        .spawn(move || {
            let mut input = String::new();
            let result = reader.read_to_string(&mut input).map(|_| input);
            let _ = send.send(result);
        })
        .context("Failed to start stdin selection reader")?;

    // Stdin belongs to the caller: cancellation cannot wait for its EOF.
    // A blocked reader is left to process exit, before any sidecar is spawned.
    let input = loop {
        anyhow::ensure!(
            crate::termination::signal() == 0,
            "Native execution cancelled"
        );
        match received.recv_timeout(Duration::from_millis(25)) {
            Ok(result) => break result.context("Failed to read file selection from stdin")?,
            Err(RecvTimeoutError::Timeout) => continue,
            Err(error) => return Err(error).context("Stdin selection reader stopped"),
        }
    };
    Ok(parse_file_paths(&input))
}

fn parse_file_paths(input: &str) -> Vec<String> {
    let mut normalized = input.replace('\\', "/");
    let nul_delimited = normalized.contains('\0');
    if !nul_delimited {
        normalized = normalized.replace("\r\n", "\n");
    }
    normalized
        .split(if nul_delimited { '\0' } else { '\n' })
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
    use super::{parse_file_paths, read_file_selection};
    use std::io::{self, Cursor, Read};

    #[test]
    fn selection_parsing_matches_typescript_for_nul_crlf_and_windows_paths() {
        assert_eq!(parse_file_paths("a\r\nb\\c\n\n"), vec!["a", "b/c"]);
        assert_eq!(parse_file_paths("a\nb\0c\r\0"), vec!["a\nb", "c\r"]);
        assert_eq!(parse_file_paths("a\r"), vec!["a\r"]);
        assert!(parse_file_paths("").is_empty());
    }

    #[test]
    fn selection_reader_preserves_delimiters_and_utf8_errors() {
        assert_eq!(
            read_file_selection(Cursor::new("a\nb\0c\r\0d\\e\0")).unwrap(),
            vec!["a\nb", "c\r", "d/e"]
        );
        assert_eq!(
            read_file_selection(Cursor::new("a\r\nb\\c\n\n")).unwrap(),
            vec!["a", "b/c"]
        );
        assert!(read_file_selection(Cursor::new("")).unwrap().is_empty());
        let error = read_file_selection(Cursor::new(vec![0xff])).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Failed to read file selection from stdin"
        );
        assert_eq!(
            error.downcast_ref::<io::Error>().unwrap().kind(),
            io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn selection_reader_propagates_io_errors_without_partial_selection() {
        struct Broken;
        impl Read for Broken {
            fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
                Err(io::Error::other("selection fixture failure"))
            }
        }
        let error = read_file_selection(Cursor::new(b"a.txt\n").chain(Broken)).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Failed to read file selection from stdin"
        );
        assert_eq!(
            error.downcast_ref::<io::Error>().unwrap().to_string(),
            "selection fixture failure"
        );
    }
}
