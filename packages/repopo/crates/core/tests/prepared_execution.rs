#![cfg(unix)]

use std::fs;
use std::io::Write;
use std::os::unix::fs::{PermissionsExt, symlink};
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};

static ID: AtomicU64 = AtomicU64::new(0);

struct Fixture {
    root: PathBuf,
    sidecar: PathBuf,
}

fn executable(name: &str) -> PathBuf {
    std::env::split_paths(&std::env::var_os("PATH").expect("PATH"))
        .map(|path| path.join(name))
        .find(|path| path.is_file())
        .and_then(|path| fs::canonicalize(path).ok())
        .unwrap_or_else(|| panic!("Required executable is missing: {name}"))
}

fn quote(path: &Path) -> String {
    format!("'{}'", path.to_str().unwrap().replace('\'', "'\"'\"'"))
}

impl Fixture {
    fn new(source: &str) -> Self {
        let package = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/prepared-execution-tests")
            .join(format!(
                "{}-{}",
                std::process::id(),
                ID.fetch_add(1, Ordering::Relaxed)
            ));
        fs::create_dir_all(root.join("helpers")).unwrap();
        fs::create_dir_all(root.join("git-only")).unwrap();
        let root = fs::canonicalize(root).unwrap();
        let git = executable("git");
        for directory in ["helpers", "git-only"] {
            symlink(&git, root.join(directory).join("git")).unwrap();
        }
        let node = root.join("helpers/node");
        let script = format!(
            "#!/bin/sh\nprintf 'node\\n' >> {}\nexec {} \"$@\"\n",
            quote(&root.join("helpers/invocations")),
            quote(&executable("node")),
        );
        fs::write(&node, script).unwrap();
        fs::set_permissions(&node, fs::Permissions::from_mode(0o755)).unwrap();
        fs::write(root.join(".gitignore"), "helpers/\ngit-only/\n").unwrap();
        fs::write(root.join("repopo.config.mjs"), source).unwrap();
        fs::write(root.join("selected.txt"), "selected").unwrap();
        fs::write(root.join("untouched.txt"), "full inventory").unwrap();
        let initialized = Command::new(&git)
            .args(["init", "--quiet"])
            .current_dir(&root)
            .output()
            .unwrap();
        assert!(initialized.status.success(), "{}", text(&initialized));
        Self {
            root,
            sidecar: fs::canonicalize(package.join("sidecar/sidecar.mjs")).unwrap(),
        }
    }

    fn run(&self, args: &[&str], helpers: bool) -> Output {
        let mut child = Command::new(env!("CARGO_BIN_EXE_repopo-core"))
            .args(args)
            .arg("--sidecar-path")
            .arg(&self.sidecar)
            .current_dir(&self.root)
            .env(
                "PATH",
                self.root.join(if helpers { "helpers" } else { "git-only" }),
            )
            .env("REPOPO_TEST_VALUE", if helpers { "cold" } else { "live" })
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        child
            .stdin
            .take()
            .unwrap()
            .write_all(b"selected.txt\n")
            .unwrap();
        child.wait_with_output().unwrap()
    }

    fn invocations(&self) -> usize {
        match fs::read_to_string(self.root.join("helpers/invocations")) {
            Ok(text) => text.lines().count(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => 0,
            Err(error) => panic!("{error}"),
        }
    }

    fn artifacts(&self) -> Vec<PathBuf> {
        fs::read_dir(self.root.join(".git/repopo/prepared"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|path| {
                path.extension()
                    .is_some_and(|extension| extension == "json")
            })
            .collect()
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.root).expect("clean integration fixture");
    }
}

fn text(output: &Output) -> String {
    format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

const MIXED: &str = r#"
console.error("CONFIG_INITIALIZED:" + process.env.REPOPO_TEST_VALUE);
let fileCalls = 0;
export default { policies: [
  { name: "File", description: "", match: /^selected.txt$/,
    handler: async () => { fileCalls++; return true; } },
  { name: "Repository", description: "", scope: "repository",
    handler: async ({files}) => fileCalls === 1 && files.includes("untouched.txt") &&
      !files.some(file => file.startsWith(".git/"))
      ? true : [{error: "Wrong shared context or repository inventory"}] }
] };
"#;

#[test]
fn cold_checks_compile_once_and_warm_checks_need_no_javascript_executable() {
    let fixture = Fixture::new(MIXED);
    let cold = fixture.run(
        &["check", "--mode", "quickjs", "--runtime", "node", "--stdin"],
        true,
    );
    assert!(cold.status.success(), "{}", text(&cold));
    assert_eq!(text(&cold).matches("CONFIG_INITIALIZED:").count(), 1);
    assert!(text(&cold).contains("CONFIG_INITIALIZED:cold"));
    assert_eq!(fixture.invocations(), 1);
    let warm = fixture.run(
        &["check", "--mode", "quickjs", "--stdin", "--verbose"],
        false,
    );
    assert!(warm.status.success(), "{}", text(&warm));
    assert_eq!(text(&warm).matches("CONFIG_INITIALIZED:").count(), 1);
    assert!(text(&warm).contains("CONFIG_INITIALIZED:live"));
    assert!(text(&warm).contains("Prepared cache hit"));
    assert_eq!(fixture.invocations(), 1);
    let prepared = fixture.run(&["prepare", "--quiet"], false);
    assert!(prepared.status.success(), "{}", text(&prepared));
    assert!(!text(&prepared).contains("CONFIG_INITIALIZED:"));
    assert_eq!(fixture.invocations(), 1);
    assert_eq!(fixture.artifacts().len(), 1);
    assert_eq!(
        fs::metadata(&fixture.artifacts()[0])
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o600
    );
}

#[test]
fn preparation_does_not_evaluate_a_throwing_config_and_errors_never_retry() {
    let fixture = Fixture::new(
        r#"
console.error("CONFIG_INITIALIZED");
throw new Error("Initialization deliberately failed");
export default {policies: []};
"#,
    );
    let prepared = fixture.run(&["prepare", "--runtime", "node"], true);
    assert!(prepared.status.success(), "{}", text(&prepared));
    assert!(!text(&prepared).contains("CONFIG_INITIALIZED"));
    assert_eq!(fixture.invocations(), 1);
    let checked = fixture.run(&["check", "--mode", "auto"], false);
    assert!(!checked.status.success());
    assert!(text(&checked).contains("Initialization deliberately failed"));
    assert_eq!(text(&checked).matches("CONFIG_INITIALIZED").count(), 1);
    assert!(!text(&checked).contains("Using IPC"));
    assert_eq!(fixture.invocations(), 1);
}

#[test]
fn auto_selects_whole_run_ipc_and_strict_quickjs_rejects_before_initialization() {
    let fixture = Fixture::new(
        r#"
import { createHash } from "node:crypto";
console.error("CONFIG_INITIALIZED");
export default {policies: [{
  name: "Crypto", description: "", match: /\.txt$/,
  handler: async () => createHash("sha256").update("value").digest("hex").length === 64
}]};
"#,
    );
    let automatic = fixture.run(&["check", "--runtime", "node"], true);
    assert!(automatic.status.success(), "{}", text(&automatic));
    assert!(text(&automatic).contains("Using IPC for the whole run"));
    assert_eq!(text(&automatic).matches("CONFIG_INITIALIZED").count(), 1);
    assert_eq!(fixture.invocations(), 2);
    let strict = fixture.run(&["check", "--mode", "quickjs"], false);
    assert!(!strict.status.success());
    assert!(text(&strict).contains("node:crypto"));
    assert!(!text(&strict).contains("CONFIG_INITIALIZED"));
    assert_eq!(fixture.invocations(), 2);
    let quiet = fixture.run(&["check", "--quiet", "--runtime", "node"], true);
    assert!(quiet.status.success(), "{}", text(&quiet));
    assert!(!text(&quiet).contains("Using IPC"));
    assert_eq!(fixture.invocations(), 3);
}

#[test]
fn forced_ipc_bypasses_preparation_and_handler_errors_do_not_restart() {
    let fixture = Fixture::new(
        r#"
console.error("CONFIG_INITIALIZED");
export default {policies: [{
  name: "Error", description: "", match: /^selected/,
  handler: async () => { throw new Error("Handler deliberately failed"); }
}]};
"#,
    );
    let ipc = fixture.run(&["check", "--mode", "ipc", "--runtime", "node"], true);
    assert!(!ipc.status.success());
    assert_eq!(fixture.invocations(), 1);
    assert!(!fixture.root.join(".git/repopo").exists());
    assert_eq!(text(&ipc).matches("CONFIG_INITIALIZED").count(), 1);
    let quickjs = fixture.run(&["check", "--runtime", "node", "--mode", "auto"], true);
    assert!(!quickjs.status.success());
    assert!(text(&quickjs).contains("Handler deliberately failed"));
    assert_eq!(text(&quickjs).matches("CONFIG_INITIALIZED").count(), 1);
    assert!(!text(&quickjs).contains("Using IPC"));
    assert_eq!(fixture.invocations(), 2);
}

#[test]
fn stale_and_corrupt_entries_rebuild_but_failed_compilation_cannot_run_old_code() {
    let fixture =
        Fixture::new("import policy from './policy.mjs'; export default {policies:[policy]};");
    let policy = fixture.root.join("policy.mjs");
    fs::write(
        &policy,
        "export default {name:'First',description:'',match:/./,handler:async()=>true};",
    )
    .unwrap();
    let first = fixture.run(&["list", "--runtime", "node", "--mode", "quickjs"], true);
    assert!(first.status.success(), "{}", text(&first));
    assert!(text(&first).contains("First"));
    assert_eq!(fixture.invocations(), 1);
    fs::write(
        fixture.root.join("selected.txt"),
        "changed data, not executable code",
    )
    .unwrap();
    let warm = fixture.run(&["list", "--mode", "quickjs"], false);
    assert!(warm.status.success(), "{}", text(&warm));
    assert_eq!(fixture.invocations(), 1);
    fs::write(
        &policy,
        "export default {name:'Other',description:'',match:/./,handler:async()=>true};",
    )
    .unwrap();
    let changed = fixture.run(&["list", "--runtime", "node", "--mode", "quickjs"], true);
    assert!(changed.status.success(), "{}", text(&changed));
    assert!(text(&changed).contains("Other"));
    assert!(!text(&changed).contains("First"));
    assert_eq!(fixture.invocations(), 2);
    fs::write(&fixture.artifacts()[0], "{\"partial\":").unwrap();
    let rebuilt = fixture.run(&["list", "--runtime", "node", "--mode", "quickjs"], true);
    assert!(rebuilt.status.success(), "{}", text(&rebuilt));
    assert_eq!(fixture.invocations(), 3);
    fs::write(&policy, "export default { syntax error").unwrap();
    let failed = fixture.run(&["list", "--runtime", "node", "--mode", "auto"], true);
    assert!(!failed.status.success());
    assert!(!text(&failed).contains("Configured policies:"));
    assert!(!text(&failed).contains("Using IPC"));
    assert_eq!(fixture.invocations(), 4);
}

#[test]
fn concurrent_preparations_publish_only_complete_artifacts() {
    let fixture = Fixture::new("export default {policies:[]};");
    std::thread::scope(|scope| {
        let children = (0..3)
            .map(|_| scope.spawn(|| fixture.run(&["prepare", "--runtime", "node"], true)))
            .collect::<Vec<_>>();
        for child in children {
            let result = child.join().unwrap();
            assert!(result.status.success(), "{}", text(&result));
        }
    });
    let artifacts = fixture.artifacts();
    assert_eq!(artifacts.len(), 1);
    let artifact: serde_json::Value =
        serde_json::from_slice(&fs::read(&artifacts[0]).unwrap()).unwrap();
    assert!(
        artifact["bundle"]
            .as_str()
            .unwrap()
            .contains("__repopo_metadata")
    );
    assert!(
        !fs::read_dir(fixture.root.join(".git/repopo/prepared"))
            .unwrap()
            .any(|entry| entry
                .unwrap()
                .path()
                .extension()
                .is_some_and(|extension| extension == "tmp"))
    );
    let warm = fixture.run(&["list", "--mode", "quickjs"], false);
    assert!(warm.status.success(), "{}", text(&warm));
}

#[test]
fn real_repository_config_preserves_findings_and_fixes_without_policy_stubs() {
    let repository =
        fs::canonicalize(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../..")).unwrap();
    let config =
        serde_json::to_string(repository.join("repopo.config.ts").to_str().unwrap()).unwrap();
    let fixture = Fixture::new(&format!(
        "import config from {config}; export default config;"
    ));
    let mut root_package: serde_json::Value =
        serde_json::from_slice(&fs::read(repository.join("package.json")).unwrap()).unwrap();
    root_package["license"] = serde_json::json!("Apache-2.0");
    fs::write(
        fixture.root.join("package.json"),
        serde_json::to_vec_pretty(&root_package).unwrap(),
    )
    .unwrap();
    fs::copy(repository.join("LICENSE"), fixture.root.join("LICENSE")).unwrap();
    fs::write(fixture.root.join("ambiguous.js"), "export const value = 1;").unwrap();
    fs::create_dir_all(fixture.root.join("packages/private")).unwrap();
    fs::create_dir_all(fixture.root.join("packages/public")).unwrap();
    fs::write(fixture.root.join("packages/public/project.json"), "{}").unwrap();
    let private = serde_json::json!({
        "name": "@tylerbu/private", "private": true, "type": "module",
        "license": "MIT", "author": root_package["author"], "bugs": root_package["bugs"],
        "repository": root_package["repository"],
        "scripts": {"clean": "echo clean", "release:license": "echo license"}
    });
    let mut public = private.clone();
    public["name"] = serde_json::json!("@tylerbu/public");
    public["private"] = serde_json::json!(false);
    public["dependencies"] = serde_json::json!({"@tylerbu/private": "workspace:^"});
    fs::write(
        fixture.root.join("packages/private/package.json"),
        serde_json::to_vec_pretty(&private).unwrap(),
    )
    .unwrap();
    fs::write(
        fixture.root.join("packages/public/package.json"),
        serde_json::to_vec_pretty(&public).unwrap(),
    )
    .unwrap();
    fs::write(
        fixture.root.join("pnpm-workspace.yaml"),
        "packages:\n  - packages/*\n",
    )
    .unwrap();

    let quickjs = fixture.run(&["check", "--mode", "quickjs", "--runtime", "node"], true);
    assert!(!quickjs.status.success());
    let checked = text(&quickjs);
    for policy in [
        "NoJsFileExtensions",
        "NoPackageProjectJson",
        "PackageJsonProperties",
        "PackageJsonRepoDirectoryProperty",
        "PackageJsonSorted",
        "NoPrivateWorkspaceDependencies",
        "PackageLicense",
        "RequiredGitignorePatterns",
    ] {
        assert!(
            checked.contains(&format!("'{policy}' policy failure")),
            "Missing {policy}:\n{checked}"
        );
    }
    assert!(!checked.contains("Handler error:"), "{checked}");
    assert!(!checked.contains("System Error"), "{checked}");
    assert_eq!(fixture.invocations(), 1);
    let warm = fixture.run(&["check", "--mode", "quickjs"], false);
    assert!(!warm.status.success());
    assert_eq!(fixture.invocations(), 1);

    let ipc = fixture.run(&["check", "--mode", "ipc", "--runtime", "node"], true);
    assert!(!ipc.status.success());
    fn failures(output: &Output) -> Vec<String> {
        let mut lines = text(output)
            .lines()
            .filter(|line| line.starts_with('\''))
            .map(str::to_owned)
            .collect::<Vec<_>>();
        lines.sort();
        lines
    }
    assert_eq!(failures(&quickjs), failures(&ipc), "IPC:\n{}", text(&ipc));

    let fixed = fixture.run(&["check", "--mode", "quickjs", "--fix"], false);
    let root: serde_json::Value =
        serde_json::from_slice(&fs::read(fixture.root.join("package.json")).unwrap()).unwrap();
    assert_eq!(root["license"], "MIT", "{}", text(&fixed));
    let public: serde_json::Value = serde_json::from_slice(
        &fs::read(fixture.root.join("packages/public/package.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(
        public["repository"]["directory"],
        "packages/public",
        "{}",
        text(&fixed)
    );
    assert!(
        fixture.root.join("packages/public/LICENSE").is_file(),
        "{}",
        text(&fixed)
    );
    assert!(
        fs::read_to_string(fixture.root.join(".gitignore"))
            .unwrap()
            .contains("node_modules/")
    );
    assert!(!text(&fixed).contains("Handler error:"), "{}", text(&fixed));
}
