use anyhow::{Context, Result};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

use crate::types::{
    BundleResponse, CompactBatchResponse, HandlerResult, IpcRequest, IpcResponse,
    LoadConfigParams, LoadConfigResponse, PolicyErrorResult, RunHandlerBatchParams,
    RunHandlerParams, RunResolverBatchParams, RunResolverParams,
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
    /// The `git_root` sets the sidecar's working directory so that
    /// policy handlers can use repo-relative file paths directly.
    pub fn spawn(sidecar_path: &str, git_root: &str) -> Result<Self> {
        let mut child = Command::new("node")
            .arg(sidecar_path)
            .current_dir(git_root)
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
    /// Returns a Vec of (file, HandlerResult) pairs.
    pub fn run_handler_batch(
        &mut self,
        policy_id: usize,
        files: &[String],
        resolve: bool,
    ) -> Result<Vec<(String, HandlerResult)>> {
        let req = IpcRequest::RunHandlerBatch(RunHandlerBatchParams {
            policy_id,
            files: files.to_vec(),
            resolve,
        });

        let response = self.request(&req)?;
        let data = response
            .data
            .context("No data in run_handler_batch response")?;
        let batch: CompactBatchResponse =
            serde_json::from_value(data).context("Failed to parse batch handler response")?;

        Ok(Self::expand_compact_response(batch))
    }

    /// Ask the sidecar to run a policy resolver on a batch of files.
    /// Returns a Vec of (file, HandlerResult) pairs.
    pub fn run_resolver_batch(
        &mut self,
        policy_id: usize,
        files: &[String],
    ) -> Result<Vec<(String, HandlerResult)>> {
        let req = IpcRequest::RunResolverBatch(RunResolverBatchParams {
            policy_id,
            files: files.to_vec(),
        });

        let response = self.request(&req)?;
        let data = response
            .data
            .context("No data in run_resolver_batch response")?;
        let batch: CompactBatchResponse =
            serde_json::from_value(data).context("Failed to parse batch resolver response")?;

        Ok(Self::expand_compact_response(batch))
    }

    /// Parse a single handler/resolver result value into a HandlerResult.
    /// Used by single-call methods (run_handler, run_resolver).
    fn parse_handler_data(data: serde_json::Value) -> Result<HandlerResult> {
        if data.is_boolean() {
            if data.as_bool() == Some(true) {
                return Ok(HandlerResult::Pass(true));
            }
            anyhow::bail!("Handler returned false (unexpected)");
        }

        let result: PolicyErrorResult =
            serde_json::from_value(data).context("Failed to parse handler result")?;
        Ok(HandlerResult::Failure(result))
    }

    /// Convert a compact batch response into the Vec<(file, HandlerResult)> format
    /// expected by callers.
    fn expand_compact_response(batch: CompactBatchResponse) -> Vec<(String, HandlerResult)> {
        let mut results =
            Vec::with_capacity(batch.pass.len() + batch.fail.len());

        for file in batch.pass {
            results.push((file, HandlerResult::Pass(true)));
        }

        for item in batch.fail {
            results.push((
                item.file,
                HandlerResult::Failure(PolicyErrorResult {
                    error: item.error,
                    error_messages: item.error_messages,
                    name: None,
                    file: None,
                    fixable: item.fixable,
                    fixed: item.fixed,
                    manual_fix: item.manual_fix,
                }),
            ));
        }

        results
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

/// Spawn the sidecar in one-shot bundle mode.
///
/// The sidecar loads the config, bundles all policy code with esbuild into a
/// QuickJS-compatible IIFE, writes JSON to stdout, and exits.
/// Returns the bundle response containing metadata + JS bundle string.
pub fn run_bundle_mode(
    sidecar_path: &str,
    git_root: &str,
    config_path: Option<&str>,
) -> Result<BundleResponse> {
    let mut cmd = Command::new("node");
    cmd.arg(sidecar_path)
        .args(["--mode", "bundle"])
        .args(["--git-root", git_root]);

    if let Some(config) = config_path {
        cmd.args(["--config", config]);
    }

    cmd.current_dir(git_root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());

    let output = cmd
        .output()
        .with_context(|| format!("Failed to spawn sidecar in bundle mode at {sidecar_path}"))?;

    if !output.status.success() {
        anyhow::bail!(
            "Sidecar bundle mode exited with status {}",
            output.status
        );
    }

    let response: BundleResponse = serde_json::from_slice(&output.stdout)
        .context("Failed to parse sidecar bundle response")?;

    Ok(response)
}
