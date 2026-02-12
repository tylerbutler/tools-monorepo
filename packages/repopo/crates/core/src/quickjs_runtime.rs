//! QuickJS runtime for in-process policy execution.
//!
//! Embeds QuickJS via rquickjs to execute policy handler/resolver code
//! directly in the Rust process, eliminating IPC overhead. The JS bundle
//! (produced by the sidecar in `--mode=bundle`) is evaluated in a QuickJS
//! context with Rust-backed `std::fs` polyfills registered as globals.

use anyhow::{Context, Result};
use rquickjs::{CatchResultExt, Ctx, Function, Object, Runtime, Value};
use std::path::Path;

use crate::types::{CompactBatchResponse, HandlerResult, PolicyErrorResult};

/// A QuickJS runtime initialized with an esbuild bundle and Rust fs polyfills.
pub struct QuickJsRuntime {
    runtime: Runtime,
    context: rquickjs::Context,
}

/// Resolve a file path relative to the git root.
/// Absolute paths are returned as-is; relative paths are joined with git_root.
fn resolve_path(git_root: &str, path: &str) -> String {
    if Path::new(path).is_absolute() {
        path.to_string()
    } else {
        format!("{}/{}", git_root.trim_end_matches('/'), path)
    }
}

impl QuickJsRuntime {
    /// Create a new QuickJS runtime, register fs polyfills, and evaluate the bundle.
    ///
    /// The `git_root` is used as the base directory for relative file path resolution.
    /// The `bundle_js` is the esbuild-generated IIFE containing all policy code and shims.
    pub fn new(git_root: &str, bundle_js: &str) -> Result<Self> {
        let runtime = Runtime::new().context("Failed to create QuickJS runtime")?;

        // Set reasonable memory limits
        runtime.set_memory_limit(256 * 1024 * 1024); // 256MB
        runtime.set_max_stack_size(1024 * 1024); // 1MB stack

        let context =
            rquickjs::Context::full(&runtime).context("Failed to create QuickJS context")?;

        let git_root_owned = git_root.to_string();

        context.with(|ctx| {
            let globals = ctx.globals();

            // Register all fs polyfills
            Self::register_fs_globals(&ctx, &globals, &git_root_owned)?;

            // Register process.cwd() polyfill
            Self::register_process_globals(&ctx, &globals, &git_root_owned)?;

            // Create the `process` global and other Node.js globals that code
            // accesses without importing (e.g., process.version, Buffer).
            Self::create_node_globals(&ctx)?;

            // Evaluate the bundle
            ctx.eval::<Value, _>(bundle_js)
                .catch(&ctx)
                .map_err(|e| anyhow::anyhow!("Failed to evaluate JS bundle: {e:?}"))?;

            Ok::<(), anyhow::Error>(())
        })?;

        Ok(Self { runtime, context })
    }

    /// Register Rust-backed filesystem functions on globalThis.
    fn register_fs_globals<'js>(ctx: &Ctx<'js>, globals: &Object<'js>, git_root: &str) -> Result<()> {
        // __fs_readFileSync(path, encoding) -> string
        let root = git_root.to_string();
        globals.set(
            "__fs_readFileSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String, _encoding: String| -> rquickjs::Result<String> {
                    let full_path = resolve_path(&root, &path);
                    std::fs::read_to_string(&full_path).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("ENOENT: no such file or directory, open '{full_path}': {e}"),
                        )
                    })
                }
            })?,
        )?;

        // __fs_writeFileSync(path, data) -> void
        globals.set(
            "__fs_writeFileSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String, data: String| -> rquickjs::Result<()> {
                    let full_path = resolve_path(&root, &path);
                    // Ensure parent directory exists
                    if let Some(parent) = Path::new(&full_path).parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    std::fs::write(&full_path, data).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("Failed to write '{full_path}': {e}"),
                        )
                    })
                }
            })?,
        )?;

        // __fs_existsSync(path) -> bool
        globals.set(
            "__fs_existsSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String| -> bool {
                    let full_path = resolve_path(&root, &path);
                    Path::new(&full_path).exists()
                }
            })?,
        )?;

        // __fs_statSync(path) -> JSON string with stat info
        globals.set(
            "__fs_statSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String| -> rquickjs::Result<String> {
                    let full_path = resolve_path(&root, &path);
                    let metadata = std::fs::metadata(&full_path).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("ENOENT: no such file or directory, stat '{full_path}': {e}"),
                        )
                    })?;
                    let stat = serde_json::json!({
                        "size": metadata.len(),
                        "isDirectory": metadata.is_dir(),
                        "isFile": metadata.is_file(),
                        "mode": 0,
                        "mtimeMs": metadata.modified()
                            .ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_millis() as u64)
                            .unwrap_or(0),
                        "atimeMs": 0,
                        "ctimeMs": 0,
                    });
                    Ok(stat.to_string())
                }
            })?,
        )?;

        // __fs_copyFileSync(src, dest) -> void
        globals.set(
            "__fs_copyFileSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |src: String, dest: String| -> rquickjs::Result<()> {
                    let full_src = resolve_path(&root, &src);
                    let full_dest = resolve_path(&root, &dest);
                    std::fs::copy(&full_src, &full_dest).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("Failed to copy '{full_src}' to '{full_dest}': {e}"),
                        )
                    })?;
                    Ok(())
                }
            })?,
        )?;

        // __fs_mkdirSync(path, recursive) -> void
        globals.set(
            "__fs_mkdirSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String, recursive: bool| -> rquickjs::Result<()> {
                    let full_path = resolve_path(&root, &path);
                    if recursive {
                        std::fs::create_dir_all(&full_path)
                    } else {
                        std::fs::create_dir(&full_path)
                    }
                    .map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("Failed to mkdir '{full_path}': {e}"),
                        )
                    })
                }
            })?,
        )?;

        // __fs_readdirSync(path) -> JSON string array of filenames
        globals.set(
            "__fs_readdirSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String| -> rquickjs::Result<String> {
                    let full_path = resolve_path(&root, &path);
                    let entries: Vec<String> = std::fs::read_dir(&full_path)
                        .map_err(|e| {
                            rquickjs::Error::new_from_js_message(
                                "io",
                                "string",
                                format!(
                                    "ENOENT: no such file or directory, scandir '{full_path}': {e}"
                                ),
                            )
                        })?
                        .filter_map(|entry| entry.ok().map(|e| e.file_name().to_string_lossy().to_string()))
                        .collect();
                    Ok(serde_json::to_string(&entries).unwrap_or_else(|_| "[]".to_string()))
                }
            })?,
        )?;

        // __fs_unlinkSync(path) -> void
        globals.set(
            "__fs_unlinkSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String| -> rquickjs::Result<()> {
                    let full_path = resolve_path(&root, &path);
                    std::fs::remove_file(&full_path).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("Failed to unlink '{full_path}': {e}"),
                        )
                    })
                }
            })?,
        )?;

        // __fs_rmdirSync(path) -> void
        globals.set(
            "__fs_rmdirSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |path: String| -> rquickjs::Result<()> {
                    let full_path = resolve_path(&root, &path);
                    std::fs::remove_dir(&full_path).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("Failed to rmdir '{full_path}': {e}"),
                        )
                    })
                }
            })?,
        )?;

        // __fs_renameSync(oldPath, newPath) -> void
        globals.set(
            "__fs_renameSync",
            Function::new(ctx.clone(), {
                let root = root.clone();
                move |old_path: String, new_path: String| -> rquickjs::Result<()> {
                    let full_old = resolve_path(&root, &old_path);
                    let full_new = resolve_path(&root, &new_path);
                    std::fs::rename(&full_old, &full_new).map_err(|e| {
                        rquickjs::Error::new_from_js_message(
                            "io",
                            "string",
                            format!("Failed to rename '{full_old}' to '{full_new}': {e}"),
                        )
                    })
                }
            })?,
        )?;

        // __stderr_write(msg) -> void (for process.stderr.write polyfill)
        globals.set(
            "__stderr_write",
            Function::new(ctx.clone(), |msg: String| {
                eprint!("{msg}");
            })?,
        )?;

        Ok(())
    }

    /// Register process-related globals.
    fn register_process_globals<'js>(
        ctx: &Ctx<'js>,
        globals: &Object<'js>,
        git_root: &str,
    ) -> Result<()> {
        let root = git_root.to_string();
        globals.set(
            "__process_cwd",
            Function::new(ctx.clone(), {
                move || -> String { root.clone() }
            })?,
        )?;
        Ok(())
    }

    /// Create Node.js global objects (process, Buffer, etc.) via JS evaluation.
    /// These are globals that Node.js code accesses without importing.
    fn create_node_globals(ctx: &Ctx<'_>) -> Result<()> {
        ctx.eval::<Value, _>(r#"
            // Node.js uses `global` as an alias for `globalThis`
            if (typeof globalThis.global === "undefined") {
                globalThis.global = globalThis;
            }

            // CJS module globals (__dirname, __filename) used by some packages
            if (typeof globalThis.__dirname === "undefined") {
                const cwd = typeof __process_cwd === "function" ? __process_cwd() : "/";
                globalThis.__dirname = cwd;
                globalThis.__filename = cwd + "/bundle.js";
            }

            globalThis.process = {
                version: "v20.0.0",
                versions: { node: "20.0.0", v8: "0.0.0", modules: "0" },
                platform: "linux",
                arch: "x64",
                env: {},
                argv: ["/usr/bin/node", "repopo"],
                argv0: "node",
                execPath: "/usr/bin/node",
                execArgv: [],
                cwd: typeof __process_cwd === "function" ? __process_cwd : () => "/",
                chdir: () => {},
                exit: () => {},
                abort: () => {},
                umask: () => 0o22,
                getuid: () => 1000,
                getgid: () => 1000,
                hrtime: Object.assign(
                    () => [0, 0],
                    { bigint: () => BigInt(0) }
                ),
                memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }),
                cpuUsage: () => ({ user: 0, system: 0 }),
                uptime: () => 0,
                stdout: { write: () => true, isTTY: false },
                stderr: { write: typeof __stderr_write === "function" ? __stderr_write : () => true, isTTY: false },
                stdin: { isTTY: false },
                on: () => globalThis.process,
                off: () => globalThis.process,
                once: () => globalThis.process,
                emit: () => false,
                addListener: () => globalThis.process,
                removeListener: () => globalThis.process,
                removeAllListeners: () => globalThis.process,
                listeners: () => [],
                listenerCount: () => 0,
                pid: 1,
                ppid: 0,
                title: "repopo-quickjs",
                nextTick: (fn, ...args) => { fn(...args); },
                config: { variables: {} },
                release: { name: "node" },
            };

            // URL global (used by various packages for path/URL manipulation)
            if (typeof globalThis.URL === "undefined") {
                globalThis.URL = class URL {
                    constructor(url, base) {
                        let full = url;
                        if (base && !url.includes("://")) {
                            full = base.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
                        }
                        this.href = full;
                        const match = full.match(/^(\w+:)\/\/([^/?#]*)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
                        this.protocol = match ? match[1] : "";
                        this.host = match ? match[2] : "";
                        this.hostname = this.host.split(":")[0];
                        this.port = this.host.includes(":") ? this.host.split(":")[1] : "";
                        this.pathname = match ? (match[3] || "/") : full;
                        this.search = match ? (match[4] || "") : "";
                        this.hash = match ? (match[5] || "") : "";
                        this.origin = this.protocol + "//" + this.host;
                        this.searchParams = new Map();
                    }
                    toString() { return this.href; }
                };
            }

            // Buffer global (minimal shim for code that references Buffer without importing)
            if (typeof globalThis.Buffer === "undefined") {
                globalThis.Buffer = {
                    from: (x) => ({ toString: () => String(x), length: typeof x === "string" ? x.length : 0 }),
                    alloc: (n) => ({ length: n, toString: () => "" }),
                    isBuffer: () => false,
                    concat: (list) => list[0] || { toString: () => "", length: 0 },
                };
            }
        "#)
        .catch(ctx)
        .map_err(|e| anyhow::anyhow!("Failed to create Node.js globals: {e:?}"))?;
        Ok(())
    }

    /// Run a handler batch for the given policy on the given files.
    ///
    /// Calls `__repopo_runHandlerBatchSync` in QuickJS, pumps the event loop
    /// until the Promise resolves, then reads the result from `__repopo_lastResult`.
    pub fn run_handler_batch(
        &self,
        policy_id: usize,
        files: &[String],
        root: &str,
        resolve: bool,
    ) -> Result<Vec<(String, HandlerResult)>> {
        let result_json = self.call_js_batch("__repopo_runHandlerBatchSync", policy_id, files, root, Some(resolve))?;
        let batch: CompactBatchResponse = serde_json::from_str(&result_json)
            .with_context(|| format!("Failed to parse QuickJS handler batch response: {result_json}"))?;
        Ok(expand_compact_response(batch))
    }

    /// Run a resolver batch for the given policy on the given files.
    pub fn run_resolver_batch(
        &self,
        policy_id: usize,
        files: &[String],
        root: &str,
    ) -> Result<Vec<(String, HandlerResult)>> {
        let result_json = self.call_js_batch("__repopo_runResolverBatchSync", policy_id, files, root, None)?;
        let batch: CompactBatchResponse = serde_json::from_str(&result_json)
            .with_context(|| format!("Failed to parse QuickJS resolver batch response: {result_json}"))?;
        Ok(expand_compact_response(batch))
    }

    /// Call a JS batch function, pump the event loop, and return the result string.
    fn call_js_batch(
        &self,
        fn_name: &str,
        policy_id: usize,
        files: &[String],
        root: &str,
        resolve: Option<bool>,
    ) -> Result<String> {
        let files_json = serde_json::to_string(files)?;
        // Escape for embedding in JS string literals
        let files_escaped = files_json.replace('\\', "\\\\").replace('\'', "\\'");
        let root_escaped = root.replace('\\', "\\\\").replace('\'', "\\'");

        let call_js = if let Some(resolve) = resolve {
            format!("{fn_name}({policy_id}, '{files_escaped}', '{root_escaped}', {resolve})")
        } else {
            format!("{fn_name}({policy_id}, '{files_escaped}', '{root_escaped}')")
        };

        // Phase 1: Reset state and invoke the sync wrapper inside context scope.
        // This starts the async chain but does NOT pump the event loop here.
        self.context.with(|ctx| {
            ctx.globals()
                .set("__repopo_lastResult", Value::new_null(ctx.clone()))?;

            ctx.eval::<Value, _>(call_js.as_str())
                .catch(&ctx)
                .map_err(|e| anyhow::anyhow!("QuickJS eval error: {e:?}"))?;

            Ok::<(), anyhow::Error>(())
        })?;

        // Phase 2: Pump the event loop OUTSIDE context.with() to avoid
        // potential conflicts between the context lock and job execution.
        let max_iterations = 500_000;
        let mut iterations = 0;
        while self.runtime.is_job_pending() {
            match self.runtime.execute_pending_job() {
                Ok(true) => {}
                Ok(false) => break,
                Err(_e) => {
                    // Job threw an error. This is expected for things like
                    // unhandled rejections. Keep pumping to drain the queue.
                }
            }
            iterations += 1;
            if iterations >= max_iterations {
                return Err(anyhow::anyhow!(
                    "QuickJS event loop exceeded {max_iterations} iterations — aborting"
                ));
            }
        }

        // Phase 3: Read the result inside a fresh context scope.
        self.context.with(|ctx| {
            let result: String = ctx
                .globals()
                .get::<_, String>("__repopo_lastResult")
                .map_err(|e| {
                    anyhow::anyhow!("Failed to read __repopo_lastResult from QuickJS: {e:?}")
                })?;

            Ok(result)
        })
    }

    /// Read the policy metadata that was stored by initBridge() during bundle eval.
    pub fn read_metadata(&self) -> Result<String> {
        self.context.with(|ctx| {
            let result: String = ctx
                .globals()
                .get::<_, String>("__repopo_metadata")
                .map_err(|e| {
                    anyhow::anyhow!("Failed to read __repopo_metadata from QuickJS: {e:?}")
                })?;
            Ok(result)
        })
    }
}

/// Convert a compact batch response into Vec<(file, HandlerResult)>.
/// This is the same logic as Sidecar::expand_compact_response, extracted as a
/// standalone function so both IPC and QuickJS paths can use it.
pub fn expand_compact_response(batch: CompactBatchResponse) -> Vec<(String, HandlerResult)> {
    let mut results = Vec::with_capacity(batch.pass.len() + batch.fail.len());

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
