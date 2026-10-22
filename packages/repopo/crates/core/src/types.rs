use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyMeta {
    pub name: String,
    pub instance_id: String,
    pub description: String,
    pub scope: Scope,
    pub has_resolver: bool,
    pub exclude: Vec<serde_json::Value>,
    pub r#match: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    File,
    Repository,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FixStatus {
    Available,
    Fixed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "scope", rename_all = "lowercase", deny_unknown_fields)]
pub enum Location {
    File {
        file: String,
    },
    Repository {
        #[serde(skip_serializing_if = "Option::is_none")]
        files: Option<Vec<String>>,
    },
}

impl Location {
    pub fn display(&self) -> String {
        match self {
            Self::File { file } => file.clone(),
            Self::Repository { files } => files
                .as_ref()
                .filter(|files| !files.is_empty())
                .map(|files| files.join(", "))
                .unwrap_or_else(|| "repository".to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub policy: String,
    pub policy_id: String,
    #[serde(flatten)]
    pub location: Location,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manual_fix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fix_status: Option<FixStatus>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Handle,
    Resolve,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ErrorKind {
    Contract,
    Exception,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionError {
    pub policy: String,
    pub policy_id: String,
    #[serde(flatten)]
    pub location: Location,
    pub phase: Phase,
    pub kind: ErrorKind,
    pub message: String,
    pub cause: serde_json::Value,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SkipReason {
    Excluded,
    FileFixError,
    RepositoryFixError,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedWork {
    pub policy: String,
    pub policy_id: String,
    #[serde(flatten)]
    pub location: Location,
    pub reason: SkipReason,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerfStats {
    pub count: usize,
    pub processed: usize,
    pub data: BTreeMap<String, BTreeMap<String, f64>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResults {
    pub findings: Vec<Finding>,
    pub errors: Vec<ExecutionError>,
    pub skipped: Vec<SkippedWork>,
    pub perf_stats: PerfStats,
}

impl RunResults {
    pub fn success(&self) -> bool {
        self.errors.is_empty()
            && self
                .skipped
                .iter()
                .all(|work| work.reason == SkipReason::Excluded)
            && self
                .findings
                .iter()
                .all(|finding| finding.fix_status == Some(FixStatus::Fixed))
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "method", content = "params", rename_all = "snake_case")]
pub enum IpcRequest {
    LoadConfig(LoadConfigParams),
    RunPolicies(RunPoliciesParams),
    Shutdown,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadConfigParams {
    pub config_path: Option<String>,
    pub git_root: String,
}

#[derive(Debug, Serialize)]
pub struct RunPoliciesParams {
    pub files: Vec<String>,
    pub fix: bool,
    pub concurrency: usize,
}

#[derive(Debug, Deserialize)]
pub struct IpcResponse {
    pub ok: bool,
    pub error: Option<String>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadConfigResponse {
    pub policies: Vec<PolicyMeta>,
    pub exclude_files: Vec<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn results() -> serde_json::Value {
        json!({
            "findings": [
                {"scope":"file", "file":"a.txt", "policy":"P", "policyId":"p",
                 "message":"fixed", "fixStatus":"fixed"},
                {"scope":"repository", "files":["a.txt","b.txt"], "policy":"P", "policyId":"r",
                 "message":"unresolved", "manualFix":"Do this.\nThen that.", "fixStatus":"failed"}
            ],
            "errors": [], "skipped": [],
            "perfStats": {"count":2,"processed":1,"data":{"handle":{"p":1.5,"r":2.0}}}
        })
    }

    #[test]
    fn canonical_results_round_trip_without_losing_findings_or_guidance() {
        let value = results();
        let result: RunResults = serde_json::from_value(value.clone()).unwrap();
        assert!(!result.success());
        assert_eq!(serde_json::to_value(&result).unwrap(), value);
        assert_eq!(result.findings[1].location.display(), "a.txt, b.txt");
    }

    #[test]
    fn only_fixed_findings_are_resolved_and_error_skips_fail() {
        let mut value = results();
        value["findings"].as_array_mut().unwrap().pop();
        let result: RunResults = serde_json::from_value(value.clone()).unwrap();
        assert!(result.success());
        for status in [json!("available"), json!("failed"), json!(null)] {
            value["findings"][0]["fixStatus"] = status;
            assert!(
                !serde_json::from_value::<RunResults>(value.clone())
                    .unwrap()
                    .success()
            );
        }
        value["findings"] = json!([]);
        value["skipped"] = json!([{
            "scope":"repository","policy":"P","policyId":"r","reason":"file-fix-error"
        }]);
        assert!(
            !serde_json::from_value::<RunResults>(value.clone())
                .unwrap()
                .success()
        );
        value["skipped"][0]["reason"] = json!("excluded");
        assert!(
            serde_json::from_value::<RunResults>(value)
                .unwrap()
                .success()
        );
    }

    #[test]
    fn structured_execution_errors_preserve_cause_and_scope() {
        let mut value = results();
        value["errors"] = json!([{
            "scope":"repository","files":[],"policy":"P","policyId":"r",
            "phase":"resolve","kind":"exception","message":"broken",
            "cause":{"name":"Error","message":"broken","cause":{"code":"EIO"}}
        }]);
        let result: RunResults = serde_json::from_value(value.clone()).unwrap();
        assert!(!result.success());
        assert_eq!(serde_json::to_value(result).unwrap(), value);
    }

    #[test]
    fn retired_results_and_invalid_statuses_are_not_a_protocol() {
        for value in [
            json!(true),
            json!({"outcome":{"error":"old"},"resolution":{"resolved":true}}),
            json!({"scope":"file","file":"a","policy":"P","policyId":"p","message":"a","fixStatus":"resolved"}),
            json!({"scope":"repository","file":"synthetic","policy":"P","policyId":"p","message":"a"}),
        ] {
            assert!(serde_json::from_value::<Finding>(value).is_err());
        }
    }
}
