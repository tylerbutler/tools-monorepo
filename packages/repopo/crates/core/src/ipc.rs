use anyhow::{Context, Result};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

use crate::types::{
    IpcRequest, IpcResponse, LoadConfigParams, LoadConfigResponse, RunPoliciesParams, RunResults,
};

pub struct Sidecar {
    child: Child,
    stdin: ChildStdin,
    stdout_reader: BufReader<ChildStdout>,
    closed: bool,
}

impl Sidecar {
    pub fn spawn(runtime: &str, sidecar_path: &str, git_root: &str) -> Result<Self> {
        let mut child = Command::new(runtime)
            .arg(sidecar_path)
            .current_dir(git_root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .with_context(|| format!("Failed to spawn sidecar with {runtime} at {sidecar_path}"))?;
        let stdin = child.stdin.take().context("Failed to get sidecar stdin")?;
        let stdout = child
            .stdout
            .take()
            .context("Failed to get sidecar stdout")?;
        Ok(Self {
            child,
            stdin,
            stdout_reader: BufReader::new(stdout),
            closed: false,
        })
    }

    fn request(&mut self, req: &IpcRequest) -> Result<serde_json::Value> {
        let json = serde_json::to_string(req).context("Failed to serialize IPC request")?;
        writeln!(self.stdin, "{json}").context("Failed to write to sidecar stdin")?;
        self.stdin
            .flush()
            .context("Failed to flush sidecar stdin")?;
        let mut line = String::new();
        self.stdout_reader
            .read_line(&mut line)
            .context("Failed to read from sidecar stdout")?;
        if line.is_empty() {
            anyhow::bail!("Sidecar closed stdout unexpectedly");
        }
        let response: IpcResponse =
            serde_json::from_str(&line).context("Failed to parse sidecar response")?;
        if !response.ok {
            anyhow::bail!(
                "Sidecar error: {}",
                response.error.as_deref().unwrap_or("No error message")
            );
        }
        response.data.context("No data in sidecar response")
    }

    pub fn load_config(
        &mut self,
        config_path: Option<&str>,
        git_root: &str,
    ) -> Result<LoadConfigResponse> {
        let data = self.request(&IpcRequest::LoadConfig(LoadConfigParams {
            config_path: config_path.map(String::from),
            git_root: git_root.to_string(),
        }))?;
        serde_json::from_value(data).context("Failed to parse load_config response")
    }

    pub fn run_policies(
        &mut self,
        files: Vec<String>,
        fix: bool,
        concurrency: usize,
    ) -> Result<RunResults> {
        let data = self.request(&IpcRequest::RunPolicies(RunPoliciesParams {
            files,
            fix,
            concurrency,
        }))?;
        serde_json::from_value(data).context("Failed to parse canonical run results")
    }

    pub fn shutdown(&mut self) -> Result<()> {
        if !self.closed {
            self.closed = true;
            let json = serde_json::to_string(&IpcRequest::Shutdown)?;
            let _ = writeln!(self.stdin, "{json}");
            let _ = self.stdin.flush();
            self.child.wait().context("Failed to wait for sidecar")?;
        }
        Ok(())
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}
