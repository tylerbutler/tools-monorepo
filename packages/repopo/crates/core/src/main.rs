mod engine;
mod files;
mod ipc;
mod types;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use std::env;
use std::process;

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
    },
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
            fix,
            stdin,
            verbose,
            quiet,
            config,
            sidecar_path,
        } => {
            let sidecar_script = resolve_sidecar_path(sidecar_path.as_deref())?;

            if verbose {
                eprintln!("Using sidecar: {sidecar_script}");
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

            // Spawn sidecar with cwd set to git root so relative file paths work
            let mut sidecar = ipc::Sidecar::spawn(&sidecar_script, &git_root)?;

            let success = engine::run_check(
                &mut sidecar,
                file_list,
                &git_root,
                config.as_deref(),
                fix,
                verbose,
                quiet,
            )?;

            sidecar.shutdown()?;

            if !success {
                process::exit(1);
            }
        }

        Commands::List {
            verbose,
            quiet: _,
            config,
            sidecar_path,
        } => {
            let sidecar_script = resolve_sidecar_path(sidecar_path.as_deref())?;

            let cwd = env::current_dir()
                .context("Failed to get current directory")?
                .to_string_lossy()
                .to_string();

            let git_root = files::find_git_root(&cwd)?;

            let mut sidecar = ipc::Sidecar::spawn(&sidecar_script, &git_root)?;
            engine::run_list(&mut sidecar, &git_root, config.as_deref(), verbose)?;
            sidecar.shutdown()?;
        }
    }

    Ok(())
}
