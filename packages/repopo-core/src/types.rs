use serde::{Deserialize, Serialize};

/// Metadata about a policy, received from the Node sidecar.
/// Does not include the handler function itself — that stays in Node.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyMeta {
    /// The name of the policy.
    pub name: String,

    /// A description of what the policy checks.
    pub description: String,

    /// The regex pattern string that determines which files this policy applies to.
    /// This is the source string from the JS RegExp, without delimiters.
    pub match_pattern: String,

    /// Regex flags from the JS RegExp (e.g. "i" for case-insensitive).
    #[serde(default)]
    pub match_flags: String,

    /// Whether this policy has a resolver (auto-fix capability).
    #[serde(default)]
    pub has_resolver: bool,

    /// Per-policy file exclusion patterns (regex strings).
    #[serde(default)]
    pub exclude_files: Vec<String>,
}

/// The result of running a policy handler, received from the Node sidecar.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum HandlerResult {
    /// The file passed the policy check.
    Pass(bool),
    /// The file failed — contains error details.
    Failure(PolicyErrorResult),
}

/// A policy error result from a handler.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyErrorResult {
    /// The error message.
    pub error: Option<String>,

    /// Legacy: array of error messages.
    pub error_messages: Option<Vec<String>>,

    /// Legacy: the policy name (set by legacy handlers).
    pub name: Option<String>,

    /// Legacy: the file path (set by legacy handlers).
    pub file: Option<String>,

    /// Whether this violation can be auto-fixed.
    #[serde(alias = "autoFixable")]
    pub fixable: Option<bool>,

    /// Whether the violation was fixed (only set when resolve=true).
    #[serde(alias = "resolved")]
    pub fixed: Option<bool>,

    /// Instructions for manual fix.
    pub manual_fix: Option<String>,
}

impl HandlerResult {
    /// Returns true if the policy check passed.
    pub fn is_pass(&self) -> bool {
        matches!(self, HandlerResult::Pass(true))
    }

    /// Returns true if an auto-fix was attempted and succeeded.
    pub fn is_fixed(&self) -> bool {
        match self {
            HandlerResult::Failure(err) => err.fixed == Some(true),
            _ => false,
        }
    }

    /// Returns true if an auto-fix was attempted but failed.
    pub fn is_fix_failed(&self) -> bool {
        match self {
            HandlerResult::Failure(err) => err.fixed == Some(false),
            _ => false,
        }
    }

    /// Returns true if the violation is auto-fixable (but wasn't fixed yet).
    pub fn is_fixable(&self) -> bool {
        match self {
            HandlerResult::Failure(err) => err.fixable == Some(true),
            _ => false,
        }
    }

    /// Get error messages as a combined string.
    pub fn error_message(&self) -> Option<String> {
        match self {
            HandlerResult::Pass(_) => None,
            HandlerResult::Failure(err) => {
                if let Some(ref msg) = err.error {
                    Some(msg.clone())
                } else if let Some(ref msgs) = err.error_messages {
                    if msgs.is_empty() {
                        None
                    } else {
                        Some(msgs.join("; "))
                    }
                } else {
                    None
                }
            }
        }
    }

    /// Get manual fix instructions.
    pub fn manual_fix(&self) -> Option<&str> {
        match self {
            HandlerResult::Failure(err) => err.manual_fix.as_deref(),
            _ => None,
        }
    }
}

/// IPC request sent from Rust to the Node sidecar.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum IpcRequest {
    /// Ask the sidecar to load the config and return policy metadata.
    #[serde(rename = "load_config")]
    LoadConfig(LoadConfigParams),

    /// Ask the sidecar to run a policy handler on a file.
    #[serde(rename = "run_handler")]
    RunHandler(RunHandlerParams),

    /// Ask the sidecar to run a policy resolver on a file.
    #[serde(rename = "run_resolver")]
    RunResolver(RunResolverParams),

    /// Ask the sidecar to run a policy handler on a batch of files.
    #[serde(rename = "run_handler_batch")]
    RunHandlerBatch(RunHandlerBatchParams),

    /// Ask the sidecar to run a policy resolver on a batch of files.
    #[serde(rename = "run_resolver_batch")]
    RunResolverBatch(RunResolverBatchParams),

    /// Tell the sidecar to shut down.
    #[serde(rename = "shutdown")]
    Shutdown,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadConfigParams {
    /// Path to the config file.
    pub config_path: Option<String>,

    /// Absolute path to the git root.
    pub git_root: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunHandlerParams {
    /// Name of the policy to run.
    pub policy_name: String,

    /// Repo-relative path to the file.
    pub file: String,

    /// Absolute path to the repo root.
    pub root: String,

    /// Whether to attempt auto-fix.
    pub resolve: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResolverParams {
    /// Name of the policy whose resolver to run.
    pub policy_name: String,

    /// Repo-relative path to the file.
    pub file: String,

    /// Absolute path to the repo root.
    pub root: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunHandlerBatchParams {
    /// Index of the policy in the load_config response array.
    pub policy_id: usize,

    /// Repo-relative paths to the files.
    pub files: Vec<String>,

    /// Whether to attempt auto-fix.
    pub resolve: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResolverBatchParams {
    /// Index of the policy in the load_config response array.
    pub policy_id: usize,

    /// Repo-relative paths to the files.
    pub files: Vec<String>,
}

/// A single result item within a batch response.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResultItem {
    /// The file this result corresponds to.
    pub file: String,

    /// The handler/resolver result for this file.
    pub data: serde_json::Value,
}

/// Response payload for batch handler/resolver calls.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResponse {
    /// Results for each file in the batch.
    pub results: Vec<BatchResultItem>,
}

/// A failure item in the compact batch response.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompactBatchFailureItem {
    /// The file this failure corresponds to.
    pub file: String,

    /// The error message.
    pub error: Option<String>,

    /// Legacy: array of error messages.
    pub error_messages: Option<Vec<String>>,

    /// Whether this violation can be auto-fixed.
    pub fixable: Option<bool>,

    /// Whether the violation was fixed (only set when resolve=true).
    pub fixed: Option<bool>,

    /// Instructions for manual fix.
    pub manual_fix: Option<String>,
}

/// Compact response payload for batch handler/resolver calls.
/// Passing files are listed as bare strings; only failures carry detail.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompactBatchResponse {
    /// Files that passed the policy check (returned `true`).
    pub pass: Vec<String>,

    /// Files that failed, with error details.
    pub fail: Vec<CompactBatchFailureItem>,
}

/// IPC response sent from the Node sidecar to Rust.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcResponse {
    /// Whether the request succeeded.
    pub ok: bool,

    /// Error message if the request failed.
    pub error: Option<String>,

    /// The response payload.
    pub data: Option<serde_json::Value>,
}

/// Response payload for load_config.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadConfigResponse {
    /// Metadata for all configured policies.
    pub policies: Vec<PolicyMeta>,

    /// Global file exclusion patterns (regex strings).
    #[serde(default)]
    pub exclude_files: Vec<String>,
}
