use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};

use crate::types::{PreparedArtifact, PreparedInput};

const SCHEMA_VERSION: u32 = 1;
const ABI_VERSION: u32 = 1;
static TEMP_ID: AtomicU64 = AtomicU64::new(0);

fn digest(bytes: impl AsRef<[u8]>) -> String {
    format!("{:x}", Sha256::digest(bytes.as_ref()))
}

fn canonical(path: &Path) -> Result<String> {
    let resolved = fs::canonicalize(path)
        .with_context(|| format!("Cannot resolve preparation input {}", path.display()))?;
    let value = resolved.to_string_lossy();
    #[cfg(windows)]
    let value = if let Some(unc) = value.strip_prefix(r"\\?\UNC\") {
        format!("//{}", unc.replace('\\', "/"))
    } else {
        value.trim_start_matches(r"\\?\").replace('\\', "/")
    };
    Ok(value.to_string())
}

fn fingerprint(path: &str) -> Result<PreparedInput> {
    let info = match fs::metadata(path) {
        Ok(info) => info,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(PreparedInput {
                path: path.into(),
                real_path: None,
                kind: "missing".into(),
                digest: String::new(),
            });
        }
        Err(error) => return Err(error).with_context(|| format!("Cannot inspect {path}")),
    };
    let (kind, hash) = if info.is_dir() {
        let mut entries = fs::read_dir(path)?
            .map(|entry| {
                entry?
                    .file_name()
                    .into_string()
                    .map_err(|_| anyhow::anyhow!("Non-UTF-8 preparation input in {path}"))
            })
            .collect::<Result<Vec<_>>>()?;
        entries.sort();
        ("directory", digest(entries.join("\0")))
    } else if info.is_file() {
        ("file", digest(fs::read(path)?))
    } else {
        anyhow::bail!("Unsupported preparation input: {path}");
    };
    Ok(PreparedInput {
        path: path.into(),
        real_path: Some(canonical(Path::new(path))?),
        kind: kind.into(),
        digest: hash,
    })
}

fn valid(artifact: &PreparedArtifact, root: &str, request: &str, producer: &str) -> Result<bool> {
    if artifact.schema_version != SCHEMA_VERSION
        || artifact.abi_version != ABI_VERSION
        || artifact.root != root
        || artifact.request != request
        || artifact.producer != producer
        || artifact.bundle_digest != digest(&artifact.bundle)
        || artifact.inputs.is_empty()
        || !artifact.inputs.iter().any(|input| input.path == producer)
        || (artifact.bundle.is_empty() && artifact.reasons.is_empty())
    {
        return Ok(false);
    }
    for input in &artifact.inputs {
        let actual = fingerprint(&input.path)?;
        if input.kind != actual.kind
            || input.real_path != actual.real_path
            || input.digest != actual.digest
        {
            return Ok(false);
        }
    }
    Ok(true)
}

fn cache_directory(root: &str) -> Result<PathBuf> {
    let output = Command::new("git")
        .args(["rev-parse", "--git-path", "repopo/prepared"])
        .current_dir(root)
        .output()
        .context("Cannot resolve the worktree preparation cache")?;
    if !output.status.success() {
        anyhow::bail!(
            "Cannot resolve the worktree preparation cache: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    let path = PathBuf::from(String::from_utf8(output.stdout)?.trim());
    Ok(if path.is_absolute() {
        path
    } else {
        Path::new(root).join(path)
    })
}

/// Cache code only. Selection and config evaluation happen after this returns.
pub fn load_or_prepare(
    root: &str,
    config: Option<&str>,
    producer: &str,
    runtime: impl FnOnce() -> String,
    verbose: bool,
    quiet: bool,
) -> Result<PreparedArtifact> {
    let root = canonical(Path::new(root))?;
    let producer = canonical(Path::new(producer))?;
    let request = match config {
        Some(config) => {
            let path = Path::new(config);
            let path = if path.is_absolute() {
                path.to_owned()
            } else {
                Path::new(&root).join(path)
            };
            // Config files and directories must exist, including in explicit IPC preparation.
            canonical(&path)?.replace('\\', "/")
        }
        None => root.replace('\\', "/"),
    };
    let directory = cache_directory(&root)?;
    let key = digest(format!("{root}\0{request}\0{producer}"));
    let destination = directory.join(format!("{key}.json"));
    match fs::read(&destination) {
        Ok(bytes) => match serde_json::from_slice::<PreparedArtifact>(&bytes) {
            Ok(artifact) if valid(&artifact, &root, &request, &producer)? => {
                if verbose && !quiet {
                    eprintln!("Prepared cache hit: {}", destination.display());
                }
                return Ok(artifact);
            }
            _ => {
                if !quiet {
                    eprintln!("Rebuilding stale or invalid prepared artifact.");
                }
            }
        },
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error).context("Cannot read prepared artifact"),
    }
    if verbose && !quiet {
        eprintln!("Preparing policy code: {request}");
    }
    let output = Command::new(runtime())
        .arg(&producer)
        .args(["--git-root", &root, "--config", &request])
        .current_dir(&root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .output()
        .context("Cannot start the policy compiler; cold preparation requires Node or Bun")?;
    if !output.status.success() {
        anyhow::bail!("Policy preparation failed: {}", output.status);
    }
    let artifact: PreparedArtifact =
        serde_json::from_slice(&output.stdout).context("Invalid policy compiler response")?;
    if !valid(&artifact, &root, &request, &producer)? {
        anyhow::bail!(
            "Preparation inputs changed or the compiler ABI is incompatible; rerun preparation"
        );
    }
    fs::create_dir_all(&directory).context("Cannot create the preparation cache")?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))?;
    }
    let temporary = directory.join(format!(
        ".{key}.{}.{}.tmp",
        std::process::id(),
        TEMP_ID.fetch_add(1, Ordering::Relaxed)
    ));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let publication = (|| -> Result<()> {
        let mut file = options.open(&temporary)?;
        file.write_all(&serde_json::to_vec(&artifact)?)?;
        file.sync_all()?;
        fs::rename(&temporary, &destination)?;
        Ok(())
    })();
    if let Err(error) = publication {
        if temporary.exists() {
            fs::remove_file(&temporary)
                .context("Cannot clean up failed preparation publication")?;
        }
        return Err(error).context("Cannot publish the prepared artifact");
    }
    Ok(artifact)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/prepared-cache-tests")
            .join(format!(
                "{}-{}",
                std::process::id(),
                TEMP_ID.fetch_add(1, Ordering::Relaxed)
            ));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn artifact(root: &Path, paths: &[&Path]) -> PreparedArtifact {
        let bundle = "globalThis.prepared = true;".to_string();
        PreparedArtifact {
            schema_version: SCHEMA_VERSION,
            abi_version: ABI_VERSION,
            root: canonical(root).unwrap(),
            request: canonical(&root.join("config.mjs")).unwrap(),
            producer: canonical(&root.join("prepare.mjs")).unwrap(),
            inputs: paths
                .iter()
                .map(|path| fingerprint(path.to_str().unwrap()).unwrap())
                .collect(),
            bundle_digest: digest(&bundle),
            bundle,
            reasons: vec![],
        }
    }

    fn is_valid(artifact: &PreparedArtifact) -> bool {
        valid(
            artifact,
            &artifact.root,
            &artifact.request,
            &artifact.producer,
        )
        .unwrap()
    }

    #[test]
    fn fingerprints_contents_not_only_size_or_timestamp() {
        let directory = scratch();
        let path = directory.join("input");
        fs::write(&path, "first").unwrap();
        let first = fingerprint(path.to_str().unwrap()).unwrap();
        fs::write(&path, "other").unwrap();
        let second = fingerprint(path.to_str().unwrap()).unwrap();
        assert_ne!(first.digest, second.digest);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn validates_all_code_inputs_without_caching_checked_data() {
        let directory = scratch();
        let names = [
            "prepare.mjs",
            "config.mjs",
            "policy.mjs",
            "shim.mjs",
            "package.json",
            "pnpm-lock.yaml",
            "tsconfig.json",
            "resource.json",
        ];
        let paths = names
            .iter()
            .map(|name| directory.join(name))
            .collect::<Vec<_>>();
        for path in &paths {
            fs::write(path, "first").unwrap();
        }
        let checked = directory.join("checked.txt");
        fs::write(&checked, "before").unwrap();
        let mut tracked = paths.iter().map(PathBuf::as_path).collect::<Vec<_>>();
        tracked.push(&directory);
        let missing = directory.join("policy.ts");
        tracked.push(&missing);
        let prepared = artifact(&directory, &tracked);
        assert!(is_valid(&prepared));
        fs::write(&checked, "changed checked-file content").unwrap();
        assert!(is_valid(&prepared));
        for path in &paths {
            fs::write(path, "other").unwrap();
            assert!(!is_valid(&prepared), "content change: {}", path.display());
            fs::remove_file(path).unwrap();
            assert!(!is_valid(&prepared), "deleted input: {}", path.display());
            fs::write(path, "first").unwrap();
            assert!(is_valid(&prepared));
        }
        fs::write(&missing, "new resolution candidate").unwrap();
        assert!(!is_valid(&prepared));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_changed_identity_versions_integrity_and_missing_producer() {
        let directory = scratch();
        let producer = directory.join("prepare.mjs");
        let config = directory.join("config.mjs");
        fs::write(&producer, "compiler").unwrap();
        fs::write(&config, "config").unwrap();
        let prepared = artifact(&directory, &[&producer, &config]);
        for (field, replacement) in [
            ("schemaVersion", serde_json::json!(999)),
            ("abiVersion", serde_json::json!(999)),
            ("root", serde_json::json!("another root")),
            ("request", serde_json::json!("another config")),
            ("producer", serde_json::json!("another compiler")),
            ("bundle", serde_json::json!("corrupt source")),
            ("bundleDigest", serde_json::json!("corrupt digest")),
            ("inputs", serde_json::json!([])),
        ] {
            let mut changed = serde_json::to_value(&prepared).unwrap();
            changed[field] = replacement;
            let changed = serde_json::from_value(changed).unwrap();
            assert!(
                !valid(
                    &changed,
                    &prepared.root,
                    &prepared.request,
                    &prepared.producer
                )
                .unwrap(),
                "{field}"
            );
        }
        let mut changed = artifact(&directory, &[&config]);
        assert!(!is_valid(&changed));
        changed
            .inputs
            .push(fingerprint(producer.to_str().unwrap()).unwrap());
        assert!(is_valid(&changed));
        fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn invalidates_retargeted_symlinks_even_with_identical_contents() {
        let directory = scratch();
        let producer = directory.join("prepare.mjs");
        let config = directory.join("config.mjs");
        let first = directory.join("first");
        let second = directory.join("second");
        let link = directory.join("policy.mjs");
        for path in [&producer, &config, &first, &second] {
            fs::write(path, "same").unwrap();
        }
        std::os::unix::fs::symlink(&first, &link).unwrap();
        let prepared = artifact(&directory, &[&producer, &config, &link]);
        assert!(is_valid(&prepared));
        fs::remove_file(&link).unwrap();
        std::os::unix::fs::symlink(&second, &link).unwrap();
        assert!(!is_valid(&prepared));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn git_cache_is_private_to_each_linked_worktree() {
        let directory = scratch();
        let root = directory.join("root");
        let linked = directory.join("linked");
        fs::create_dir_all(&root).unwrap();
        let git = |args: &[&str]| {
            let result = Command::new("git")
                .args(args)
                .current_dir(&root)
                .output()
                .unwrap();
            assert!(
                result.status.success(),
                "{}",
                String::from_utf8_lossy(&result.stderr)
            );
        };
        git(&["init", "--quiet"]);
        git(&[
            "-c",
            "user.name=RepopoTests",
            "-c",
            "user.email=tests@example.invalid",
            "-c",
            "commit.gpgSign=false",
            "-c",
            "core.hooksPath=/dev/null",
            "commit",
            "--allow-empty",
            "--quiet",
            "-m",
            "fixture",
        ]);
        git(&[
            "worktree",
            "add",
            "--quiet",
            "--detach",
            linked.to_str().unwrap(),
            "HEAD",
        ]);
        let main_cache = cache_directory(root.to_str().unwrap()).unwrap();
        let linked_cache = cache_directory(linked.to_str().unwrap()).unwrap();
        assert_ne!(main_cache, linked_cache);
        assert!(linked.join(".git").is_file());
        assert!(linked_cache.starts_with(root.join(".git/worktrees")));
        assert!(main_cache.ends_with(".git/repopo/prepared"));
        assert!(linked_cache.ends_with("repopo/prepared"));
        fs::remove_dir_all(directory).unwrap();
    }
}
