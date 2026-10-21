mod engine;
mod files;
mod ipc;
mod quickjs_runtime;
mod types;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand, ValueEnum};
use std::env;
use std::process::{self, Command, Stdio};

/// Execution mode for policy checks.
#[derive(Clone, Debug, ValueEnum)]
enum ExecutionMode {
    /// In-process JavaScript execution via QuickJS (default).
    Quickjs,
    /// IPC-based execution via Node.js sidecar process.
    Ipc,
}

#[derive(Parser)]
#[command(
    name = "repopo-core",
    about = "Repository policy enforcement engine",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Check and enforce policies on repository files.
    Check {
        /// Maximum concurrent files in read-only checks. Fixes remain sequential.
        #[arg(long, default_value = "8", value_parser = parse_concurrency)]
        concurrency: usize,

        /// Fix policy violations if possible.
        #[arg(short, long, alias = "resolve")]
        fix: bool,

        /// Read list of files from stdin instead of git.
        #[arg(long)]
        stdin: bool,

        /// Show verbose output including per-policy timing.
        #[arg(short, long)]
        verbose: bool,

        /// Suppress all output except errors.
        #[arg(short, long)]
        quiet: bool,

        /// Path to the config file.
        #[arg(short, long)]
        config: Option<String>,

        /// Path to the Node.js sidecar script.
        #[arg(long, env = "REPOPO_SIDECAR_PATH")]
        sidecar_path: Option<String>,

        /// Execution mode: quickjs (default) or ipc.
        #[arg(long, default_value = "quickjs")]
        mode: ExecutionMode,

        /// JS runtime to use for the sidecar process.
        #[arg(long, value_enum, env = "REPOPO_RUNTIME", default_value_t = Runtime::Auto)]
        runtime: Runtime,
    },

    /// List all configured policies.
    List {
        /// Show verbose output.
        #[arg(short, long)]
        verbose: bool,

        /// Suppress non-essential output.
        #[arg(short, long)]
        quiet: bool,

        /// Path to the config file.
        #[arg(short, long)]
        config: Option<String>,

        /// Path to the Node.js sidecar script.
        #[arg(long, env = "REPOPO_SIDECAR_PATH")]
        sidecar_path: Option<String>,

        /// Execution mode: quickjs (default) or ipc.
        #[arg(long, default_value = "quickjs")]
        mode: ExecutionMode,

        /// JS runtime to use for the sidecar process.
        #[arg(long, value_enum, env = "REPOPO_RUNTIME", default_value_t = Runtime::Auto)]
        runtime: Runtime,
    },
}

fn parse_concurrency(value: &str) -> std::result::Result<usize, String> {
    let parsed = value
        .parse::<u64>()
        .map_err(|_| "Concurrency must be a positive safe integer.".to_string())?;
    if parsed == 0 || parsed > 9_007_199_254_740_991 {
        return Err("Concurrency must be a positive safe integer.".to_string());
    }
    usize::try_from(parsed).map_err(|_| "Concurrency exceeds platform limits.".to_string())
}

#[derive(Clone, Debug, ValueEnum)]
enum Runtime {
    /// Auto-detect: use bun if available, otherwise node.
    Auto,
    /// Use Node.js.
    Node,
    /// Use Bun.
    Bun,
}

fn resolve_runtime(runtime: &Runtime) -> String {
    match runtime {
        Runtime::Node => "node".to_string(),
        Runtime::Bun => "bun".to_string(),
        Runtime::Auto => {
            if Command::new("bun")
                .arg("--version")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .is_ok()
            {
                "bun".to_string()
            } else {
                "node".to_string()
            }
        }
    }
}

/// Resolve the sidecar path. Looks for it relative to the binary location
/// or uses the provided/env-var path.
fn resolve_sidecar_path(explicit: Option<&str>) -> Result<String> {
    if let Some(path) = explicit {
        return Ok(path.to_string());
    }

    // Try to find the sidecar relative to the binary
    if let Ok(exe) = env::current_exe() {
        let candidates = [
            // Postinstall binaries live in native/ beside the sidecar directory.
            exe.parent()
                .and_then(|p| p.parent())
                .map(|p| p.join("sidecar").join("sidecar.mjs")),
            // Development: binary is in target/debug or target/release,
            // sidecar is in the package root
            exe.parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .map(|p| p.join("sidecar").join("sidecar.mjs")),
            // Installed: sidecar is next to the binary
            exe.parent().map(|p| p.join("sidecar.mjs")),
        ];

        for candidate in candidates.iter().flatten() {
            if candidate.exists() {
                return Ok(candidate.to_string_lossy().to_string());
            }
        }
    }

    // Try common locations relative to cwd
    let cwd = env::current_dir().context("Failed to get current directory")?;
    let cwd_candidates = [
        cwd.join("sidecar").join("sidecar.mjs"),
        cwd.join("sidecar.mjs"),
    ];

    for candidate in &cwd_candidates {
        if candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    anyhow::bail!(
        "Could not find the Node.js sidecar script. \
         Set REPOPO_SIDECAR_PATH or pass --sidecar-path."
    )
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Check {
            concurrency,
            fix,
            stdin,
            verbose,
            quiet,
            config,
            sidecar_path,
            mode,
            runtime,
        } => {
            let sidecar_script = resolve_sidecar_path(sidecar_path.as_deref())?;
            let runtime_bin = resolve_runtime(&runtime);

            if verbose {
                eprintln!("Using sidecar: {sidecar_script} (runtime: {runtime_bin})");
            }

            let cwd = env::current_dir()
                .context("Failed to get current directory")?
                .to_string_lossy()
                .to_string();

            let git_root = files::find_git_root(&cwd)?;

            if verbose {
                eprintln!("Git root: {git_root}");
            }

            // Enumerate files
            let file_list = if stdin {
                files::read_stdin_files()?
            } else {
                files::git_ls_files(&git_root)?
            };

            if verbose {
                eprintln!("{} files to check.", file_list.len());
            }

            let success = match mode {
                ExecutionMode::Quickjs => {
                    if verbose {
                        eprintln!("Mode: QuickJS (in-process)");
                        eprintln!("Bundling policy code...");
                    }

                    let bundle = ipc::run_bundle_mode(
                        &runtime_bin,
                        &sidecar_script,
                        &git_root,
                        config.as_deref(),
                    )?;

                    let config_resp = types::LoadConfigResponse {
                        policies: bundle.policies,
                        exclude_files: bundle.exclude_files,
                    };

                    if verbose {
                        eprintln!("Initializing QuickJS runtime...");
                    }

                    let js_runtime =
                        quickjs_runtime::QuickJsRuntime::new(&git_root, &bundle.bundle)?;

                    let mut repository_sidecar = if config_resp
                        .policies
                        .iter()
                        .any(|policy| policy.scope == "repository")
                    {
                        let mut sidecar =
                            ipc::Sidecar::spawn(&runtime_bin, &sidecar_script, &git_root)?;
                        sidecar.load_config(config.as_deref(), &git_root)?;
                        Some(sidecar)
                    } else {
                        None
                    };
                    let mut backend = engine::PolicyBackend::QuickJs {
                        runtime: &js_runtime,
                        repository_sidecar: repository_sidecar.as_mut(),
                    };
                    let success = engine::run_check(
                        &mut backend,
                        &config_resp,
                        file_list,
                        &git_root,
                        fix,
                        verbose,
                        quiet,
                        concurrency,
                    )?;
                    if let Some(sidecar) = repository_sidecar.as_mut() {
                        sidecar.shutdown()?;
                    }
                    success
                }
                ExecutionMode::Ipc => {
                    if verbose {
                        eprintln!("Mode: IPC (Node.js sidecar)");
                    }

                    let mut sidecar =
                        ipc::Sidecar::spawn(&runtime_bin, &sidecar_script, &git_root)?;
                    let config_resp = sidecar.load_config(config.as_deref(), &git_root)?;

                    let mut backend = engine::PolicyBackend::Sidecar(&mut sidecar);
                    let success = engine::run_check(
                        &mut backend,
                        &config_resp,
                        file_list,
                        &git_root,
                        fix,
                        verbose,
                        quiet,
                        concurrency,
                    )?;
                    sidecar.shutdown()?;
                    success
                }
            };

            if !success {
                process::exit(1);
            }
        }

        Commands::List {
            verbose,
            quiet: _,
            config,
            sidecar_path,
            mode,
            runtime,
        } => {
            let sidecar_script = resolve_sidecar_path(sidecar_path.as_deref())?;
            let runtime_bin = resolve_runtime(&runtime);

            let cwd = env::current_dir()
                .context("Failed to get current directory")?
                .to_string_lossy()
                .to_string();

            let git_root = files::find_git_root(&cwd)?;

            let config_resp = match mode {
                ExecutionMode::Quickjs => {
                    let bundle = ipc::run_bundle_mode(
                        &runtime_bin,
                        &sidecar_script,
                        &git_root,
                        config.as_deref(),
                    )?;

                    types::LoadConfigResponse {
                        policies: bundle.policies,
                        exclude_files: bundle.exclude_files,
                    }
                }
                ExecutionMode::Ipc => {
                    let mut sidecar =
                        ipc::Sidecar::spawn(&runtime_bin, &sidecar_script, &git_root)?;
                    let config_resp = sidecar.load_config(config.as_deref(), &git_root)?;
                    sidecar.shutdown()?;
                    config_resp
                }
            };

            engine::run_list(&config_resp, verbose)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_check_concurrency() {
        for value in ["0", "-1", "1.5", "bad", "9007199254740992"] {
            assert!(Cli::try_parse_from(["repopo-core", "check", "--concurrency", value]).is_err());
        }
        for value in ["1", "8", "32"] {
            let cli =
                Cli::try_parse_from(["repopo-core", "check", "--concurrency", value]).unwrap();
            assert!(
                matches!(cli.command, Commands::Check { concurrency, .. } if concurrency == value.parse::<usize>().unwrap())
            );
        }
        let cli = Cli::try_parse_from(["repopo-core", "check"]).unwrap();
        assert!(matches!(
            cli.command,
            Commands::Check { concurrency: 8, .. }
        ));
    }
}
