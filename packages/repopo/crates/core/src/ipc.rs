use anyhow::{Context, Result};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::thread;
use std::time::Duration;

use crate::types::{
    BeginRunParams, ExecuteUnitsParams, ExecutionUnit, IpcRequest, IpcResponse, LoadConfigParams,
    LoadConfigResponse, MatchFilesParams, RunResults,
};

pub struct Sidecar {
    child: Child,
    stdin: Option<ChildStdin>,
    responses: Receiver<std::io::Result<String>>,
    reader: Option<thread::JoinHandle<()>>,
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
        let (send, responses) = mpsc::channel();
        let reader = thread::spawn(move || {
            let mut reader = BufReader::<ChildStdout>::new(stdout);
            loop {
                let mut line = String::new();
                let result = reader.read_line(&mut line).map(|_| line);
                let done = result.as_ref().map_or(true, |line| line.is_empty());
                if send.send(result).is_err() || done {
                    break;
                }
            }
        });
        Ok(Self {
            child,
            stdin: Some(stdin),
            responses,
            reader: Some(reader),
            closed: false,
        })
    }

    fn request(&mut self, req: &IpcRequest) -> Result<serde_json::Value> {
        let json = serde_json::to_string(req).context("Failed to serialize IPC request")?;
        anyhow::ensure!(
            crate::termination::signal() == 0,
            "Native execution cancelled"
        );
        let stdin = self.stdin.as_mut().context("Sidecar already closed")?;
        writeln!(stdin, "{json}").context("Failed to write to sidecar stdin")?;
        stdin.flush().context("Failed to flush sidecar stdin")?;
        let line = loop {
            if crate::termination::signal() != 0 {
                self.shutdown()?;
                anyhow::bail!("Native execution cancelled");
            }
            match self.responses.recv_timeout(Duration::from_millis(25)) {
                Ok(response) => break response.context("Failed to read sidecar response")?,
                Err(RecvTimeoutError::Timeout) => continue,
                Err(error) => return Err(error.into()),
            }
        };
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

    pub fn begin_run(&mut self, fix: bool) -> Result<()> {
        self.request(&IpcRequest::BeginRun(BeginRunParams { fix }))?;
        Ok(())
    }

    pub fn execute_units(&mut self, units: Vec<ExecutionUnit>) -> Result<Vec<RunResults>> {
        let data = self.request(&IpcRequest::ExecuteUnits(ExecuteUnitsParams { units }))?;
        serde_json::from_value(data).context("Failed to parse canonical unit results")
    }

    pub fn match_files(
        &mut self,
        pattern: serde_json::Value,
        files: Vec<String>,
    ) -> Result<Vec<bool>> {
        let data = self.request(&IpcRequest::MatchFiles(MatchFilesParams { pattern, files }))?;
        serde_json::from_value(data).context("Failed to parse regex matches")
    }

    pub fn shutdown(&mut self) -> Result<()> {
        if !self.closed {
            self.closed = true;
            if let Some(mut stdin) = self.stdin.take() {
                if crate::termination::signal() == 0 {
                    let json = serde_json::to_string(&IpcRequest::Shutdown)?;
                    let _ = writeln!(stdin, "{json}");
                    let _ = stdin.flush();
                }
                // EOF cancels active sidecar work; never kill it during teardown.
                drop(stdin);
            }
            self.child.wait().context("Failed to wait for sidecar")?;
            if let Some(reader) = self.reader.take() {
                let _ = reader.join();
            }
        }
        Ok(())
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}
