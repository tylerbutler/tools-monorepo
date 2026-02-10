use anyhow::{Context, Result};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

use crate::types::{
    BatchResponse, HandlerResult, IpcRequest, IpcResponse, LoadConfigParams, LoadConfigResponse,
    RunHandlerBatchParams, RunHandlerParams, RunResolverBatchParams, RunResolverParams,
};

/// A connection to the Node.js sidecar process that loads TypeScript
/// configurations and executes policy handlers.
pub struct Sidecar {
    child: Child,
    stdin: ChildStdin,
    stdout_reader: BufReader<ChildStdout>,
}

impl Sidecar {
    /// Spawn the Node.js sidecar process.
    ///
    /// The `sidecar_path` should point to the sidecar .mjs file.
    pub fn spawn(sidecar_path: &str) -> Result<Self> {
        let mut child = Command::new("node")
            .arg(sidecar_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .with_context(|| format!("Failed to spawn Node.js sidecar at {sidecar_path}"))?;

        let stdin = child.stdin.take().context("Failed to get sidecar stdin")?;
        let stdout = child
            .stdout
            .take()
            .context("Failed to get sidecar stdout")?;
        let stdout_reader = BufReader::new(stdout);

        Ok(Self {
            child,
            stdin,
            stdout_reader,
        })
    }

    /// Send a request to the sidecar and read the response.
    fn request(&mut self, req: &IpcRequest) -> Result<IpcResponse> {
        let mut json = serde_json::to_string(req).context("Failed to serialize IPC request")?;
        json.push('\n');

        self.stdin
            .write_all(json.as_bytes())
            .context("Failed to write to sidecar stdin")?;
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
            if let Some(ref err) = response.error {
                anyhow::bail!("Sidecar error: {err}");
            }
            anyhow::bail!("Sidecar returned error with no message");
        }

        Ok(response)
    }

    /// Ask the sidecar to load the repopo configuration and return policy metadata.
    pub fn load_config(
        &mut self,
        config_path: Option<&str>,
        git_root: &str,
    ) -> Result<LoadConfigResponse> {
        let req = IpcRequest::LoadConfig(LoadConfigParams {
            config_path: config_path.map(String::from),
            git_root: git_root.to_string(),
        });

        let response = self.request(&req)?;
        let data = response.data.context("No data in load_config response")?;
        let config: LoadConfigResponse =
            serde_json::from_value(data).context("Failed to parse load_config response data")?;

        Ok(config)
    }

    /// Ask the sidecar to run a policy handler on a file.
    pub fn run_handler(
        &mut self,
        policy_name: &str,
        file: &str,
        root: &str,
        resolve: bool,
    ) -> Result<HandlerResult> {
        let req = IpcRequest::RunHandler(RunHandlerParams {
            policy_name: policy_name.to_string(),
            file: file.to_string(),
            root: root.to_string(),
            resolve,
        });

        let response = self.request(&req)?;
        let data = response.data.context("No data in run_handler response")?;

        // The data can be `true` (pass) or an error object
        if data.is_boolean() {
            if data.as_bool() == Some(true) {
                return Ok(HandlerResult::Pass(true));
            }
            anyhow::bail!("Handler returned false (unexpected)");
        }

        let result: crate::types::PolicyErrorResult =
            serde_json::from_value(data).context("Failed to parse handler result")?;
        Ok(HandlerResult::Failure(result))
    }

    /// Ask the sidecar to run a policy resolver on a file.
    pub fn run_resolver(
        &mut self,
        policy_name: &str,
        file: &str,
        root: &str,
    ) -> Result<HandlerResult> {
        let req = IpcRequest::RunResolver(RunResolverParams {
            policy_name: policy_name.to_string(),
            file: file.to_string(),
            root: root.to_string(),
        });

        let response = self.request(&req)?;
        let data = response
            .data
            .context("No data in run_resolver response")?;

        if data.is_boolean() {
            if data.as_bool() == Some(true) {
                return Ok(HandlerResult::Pass(true));
            }
            anyhow::bail!("Resolver returned false (unexpected)");
        }

        let result: crate::types::PolicyErrorResult =
            serde_json::from_value(data).context("Failed to parse resolver result")?;
        Ok(HandlerResult::Failure(result))
    }

    /// Ask the sidecar to run a policy handler on a batch of files.
    /// Returns a Vec of (file, HandlerResult) pairs in the same order as the input files.
    pub fn run_handler_batch(
        &mut self,
        policy_name: &str,
        files: &[String],
        root: &str,
        resolve: bool,
    ) -> Result<Vec<(String, HandlerResult)>> {
        let req = IpcRequest::RunHandlerBatch(RunHandlerBatchParams {
            policy_name: policy_name.to_string(),
            files: files.to_vec(),
            root: root.to_string(),
            resolve,
        });

        let response = self.request(&req)?;
        let data = response
            .data
            .context("No data in run_handler_batch response")?;
        let batch: BatchResponse =
            serde_json::from_value(data).context("Failed to parse batch handler response")?;

        batch
            .results
            .into_iter()
            .map(|item| {
                let result = Self::parse_handler_data(item.data)?;
                Ok((item.file, result))
            })
            .collect()
    }

    /// Ask the sidecar to run a policy resolver on a batch of files.
    /// Returns a Vec of (file, HandlerResult) pairs in the same order as the input files.
    pub fn run_resolver_batch(
        &mut self,
        policy_name: &str,
        files: &[String],
        root: &str,
    ) -> Result<Vec<(String, HandlerResult)>> {
        let req = IpcRequest::RunResolverBatch(RunResolverBatchParams {
            policy_name: policy_name.to_string(),
            files: files.to_vec(),
            root: root.to_string(),
        });

        let response = self.request(&req)?;
        let data = response
            .data
            .context("No data in run_resolver_batch response")?;
        let batch: BatchResponse =
            serde_json::from_value(data).context("Failed to parse batch resolver response")?;

        batch
            .results
            .into_iter()
            .map(|item| {
                let result = Self::parse_handler_data(item.data)?;
                Ok((item.file, result))
            })
            .collect()
    }

    /// Parse a single handler/resolver result value into a HandlerResult.
    fn parse_handler_data(data: serde_json::Value) -> Result<HandlerResult> {
        if data.is_boolean() {
            if data.as_bool() == Some(true) {
                return Ok(HandlerResult::Pass(true));
            }
            anyhow::bail!("Handler returned false (unexpected)");
        }

        let result: crate::types::PolicyErrorResult =
            serde_json::from_value(data).context("Failed to parse handler result")?;
        Ok(HandlerResult::Failure(result))
    }

    /// Tell the sidecar to shut down gracefully.
    pub fn shutdown(&mut self) -> Result<()> {
        let req = IpcRequest::Shutdown;
        // Best-effort: write the shutdown request
        let json = serde_json::to_string(&req).unwrap_or_default();
        let _ = writeln!(self.stdin, "{json}");
        let _ = self.stdin.flush();
        let _ = self.child.wait();
        Ok(())
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        let _ = self.shutdown();
    }
}
