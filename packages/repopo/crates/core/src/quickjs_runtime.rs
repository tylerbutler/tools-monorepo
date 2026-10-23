//! QuickJS runtime for in-process policy execution.
//!
//! Embeds QuickJS via rquickjs to execute policy handler/resolver code
//! directly in the Rust process, eliminating IPC overhead. The JS bundle
//! (produced by the sidecar in `--mode=bundle`) is evaluated in a QuickJS
//! context with Rust-backed `std::fs` polyfills registered as globals.

use anyhow::{Context, Result};
use rquickjs::{CatchResultExt, Ctx, Function, Object, Runtime, Value};
use std::path::Path;

use crate::types::{
    CompactBatchResponse, HandlerResult, PolicyErrorResult, RepositoryPolicyResult,
};

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

fn invalid_input(message: impl Into<String>) -> std::io::Error {
    std::io::Error::new(std::io::ErrorKind::InvalidInput, message.into())
}

fn unsupported_io(message: &str) -> std::io::Error {
    std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        format!("{message} is not supported in the QuickJS runtime"),
    )
}

fn file_type_json(kind: std::fs::FileType) -> serde_json::Value {
    let mut value = serde_json::json!({
        "isDirectory": kind.is_dir(),
        "isFile": kind.is_file(),
        "isSymbolicLink": kind.is_symlink(),
    });
    #[cfg(unix)]
    {
        use std::os::unix::fs::FileTypeExt;
        value["isBlockDevice"] = kind.is_block_device().into();
        value["isCharacterDevice"] = kind.is_char_device().into();
        value["isFIFO"] = kind.is_fifo().into();
        value["isSocket"] = kind.is_socket().into();
    }
    #[cfg(not(unix))]
    for name in ["isBlockDevice", "isCharacterDevice", "isFIFO", "isSocket"] {
        value[name] = serde_json::Value::Null;
    }
    value
}

fn stat_json(metadata: std::fs::Metadata) -> serde_json::Value {
    let mut value = file_type_json(metadata.file_type());
    value["size"] = metadata.len().into();
    let timestamp = |result: std::io::Result<std::time::SystemTime>| {
        result
            .ok()
            .map(|time| match time.duration_since(std::time::UNIX_EPOCH) {
                Ok(duration) => duration.as_secs_f64() * 1000.0,
                Err(error) => -error.duration().as_secs_f64() * 1000.0,
            })
    };
    value["mtimeMs"] = serde_json::json!(timestamp(metadata.modified()));
    value["atimeMs"] = serde_json::json!(timestamp(metadata.accessed()));
    value["birthtimeMs"] = serde_json::json!(timestamp(metadata.created()));
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        value["mode"] = metadata.mode().into();
        value["uid"] = metadata.uid().into();
        value["gid"] = metadata.gid().into();
        value["ino"] = metadata.ino().into();
        value["dev"] = metadata.dev().into();
        value["nlink"] = metadata.nlink().into();
        value["rdev"] = metadata.rdev().into();
        value["blksize"] = metadata.blksize().into();
        value["blocks"] = metadata.blocks().into();
        value["ctimeMs"] = serde_json::json!(
            metadata.ctime() as f64 * 1000.0 + metadata.ctime_nsec() as f64 / 1_000_000.0
        );
    }
    #[cfg(not(unix))]
    {
        value["ctimeMs"] = serde_json::Value::Null;
        value["mode"] = serde_json::Value::Null;
    }
    value
}

fn fs_operation(
    root: &str,
    operation: &str,
    args: &serde_json::Value,
) -> std::io::Result<serde_json::Value> {
    use std::io::Write;
    let path = resolve_path(
        root,
        args["path"]
            .as_str()
            .ok_or_else(|| invalid_input("Expected a path"))?,
    );
    let mode = |default| -> std::io::Result<u32> {
        args.get("mode").map_or(Ok(default), |value| {
            value
                .as_u64()
                .and_then(|mode| u32::try_from(mode).ok())
                .ok_or_else(|| invalid_input("Expected an unsigned file mode"))
        })
    };
    match operation {
        "readFile" => Ok(serde_json::json!(std::fs::read(path)?)),
        "writeFile" => {
            let bytes: Vec<u8> = serde_json::from_value(args["data"].clone())
                .map_err(|error| invalid_input(error.to_string()))?;
            let mut options = std::fs::OpenOptions::new();
            options.write(true);
            match args["flag"].as_str().unwrap_or("w") {
                "w" => {
                    options.create(true).truncate(true);
                }
                "wx" => {
                    options.create_new(true);
                }
                "a" => {
                    options.create(true).append(true);
                }
                "ax" => {
                    options.create_new(true).append(true);
                }
                _ => return Err(unsupported_io("writeFile flag")),
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.mode(mode(0o666)?);
            }
            #[cfg(not(unix))]
            if args.get("mode").is_some() {
                return Err(unsupported_io("file creation modes"));
            }
            options.open(path)?.write_all(&bytes)?;
            Ok(serde_json::Value::Null)
        }
        "stat" => Ok(stat_json(std::fs::metadata(path)?)),
        "lstat" => Ok(stat_json(std::fs::symlink_metadata(path)?)),
        "realpath" => {
            let canonical = std::fs::canonicalize(path)?;
            #[cfg(unix)]
            let bytes = {
                use std::os::unix::ffi::OsStrExt;
                Some(canonical.as_os_str().as_bytes().to_owned())
            };
            #[cfg(not(unix))]
            let bytes: Option<Vec<u8>> = None;
            Ok(serde_json::json!({
                "path": canonical.to_str().map(|path| path.trim_start_matches(r"\\?\")),
                "bytes": bytes,
            }))
        }
        "readdir" => {
            let mut entries = Vec::new();
            for entry in std::fs::read_dir(&path)? {
                let entry = entry?;
                let mut value = file_type_json(entry.file_type()?);
                value["name"] = entry.file_name().to_string_lossy().into_owned().into();
                value["parentPath"] = args["path"].clone();
                #[cfg(unix)]
                {
                    use std::os::unix::ffi::OsStrExt;
                    value["nameBytes"] = serde_json::json!(entry.file_name().as_bytes());
                }
                #[cfg(not(unix))]
                {
                    value["nameBytes"] = serde_json::Value::Null;
                }
                entries.push(value);
            }
            entries.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
            Ok(entries.into())
        }
        "access" => {
            if mode(0)? != 0 {
                return Err(unsupported_io("access permission modes"));
            }
            std::fs::metadata(path)?;
            Ok(serde_json::Value::Null)
        }
        "chmod" => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode(0o666)?))?;
                Ok(serde_json::Value::Null)
            }
            #[cfg(not(unix))]
            Err(unsupported_io("chmod"))
        }
        "mkdir" => {
            let recursive = args["recursive"].as_bool().unwrap_or(false);
            let mut created = None;
            if recursive {
                let mut candidate = Path::new(&path);
                while !candidate.try_exists()? {
                    created = Some(candidate.to_string_lossy().into_owned());
                    match candidate.parent() {
                        Some(parent) => candidate = parent,
                        None => break,
                    }
                }
            }
            let mut builder = std::fs::DirBuilder::new();
            builder.recursive(recursive);
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                builder.mode(mode(0o777)?);
            }
            #[cfg(not(unix))]
            if args.get("mode").is_some() {
                return Err(unsupported_io("directory creation modes"));
            }
            builder.create(path)?;
            Ok(serde_json::json!(created))
        }
        "unlink" => {
            std::fs::remove_file(path)?;
            Ok(serde_json::Value::Null)
        }
        "rmdir" => {
            std::fs::remove_dir(path)?;
            Ok(serde_json::Value::Null)
        }
        "rename" | "copyFile" => {
            let dest = resolve_path(
                root,
                args["dest"]
                    .as_str()
                    .ok_or_else(|| invalid_input("Expected a destination path"))?,
            );
            if operation == "rename" {
                std::fs::rename(path, dest)?;
            } else {
                match args["flags"]
                    .as_u64()
                    .ok_or_else(|| invalid_input("Expected copyFile flags"))?
                {
                    0 => {
                        std::fs::copy(path, dest)?;
                    }
                    1 => {
                        let mut source = std::fs::File::open(path)?;
                        let mut destination = std::fs::OpenOptions::new()
                            .write(true)
                            .create_new(true)
                            .open(dest)?;
                        std::io::copy(&mut source, &mut destination)?;
                        destination.set_permissions(source.metadata()?.permissions())?;
                    }
                    _ => return Err(unsupported_io("copyFile reflink flags")),
                }
            }
            Ok(serde_json::Value::Null)
        }
        _ => Err(unsupported_io(operation)),
    }
}

fn fs_response(root: &str, operation: &str, args: &str) -> serde_json::Value {
    let args: serde_json::Value = match serde_json::from_str(args) {
        Ok(args) => args,
        Err(error) => {
            return serde_json::json!({ "ok": false, "error": {
                "message": error.to_string(), "code": "EINVAL", "syscall": operation
            }});
        }
    };
    match fs_operation(root, operation, &args) {
        Ok(value) => serde_json::json!({ "ok": true, "value": value }),
        Err(error) => {
            use std::io::ErrorKind;
            let code = match error.kind() {
                ErrorKind::NotFound => "ENOENT",
                ErrorKind::PermissionDenied => "EACCES",
                ErrorKind::AlreadyExists => "EEXIST",
                ErrorKind::NotADirectory => "ENOTDIR",
                ErrorKind::IsADirectory => "EISDIR",
                ErrorKind::DirectoryNotEmpty => "ENOTEMPTY",
                ErrorKind::InvalidInput => "EINVAL",
                ErrorKind::Unsupported => "ENOTSUP",
                ErrorKind::Interrupted => "EINTR",
                ErrorKind::WouldBlock => "EAGAIN",
                _ => "EIO",
            };
            let syscall = match operation {
                "readFile" | "writeFile" => "open",
                "readdir" => "scandir",
                other => other,
            };
            let mut detail = serde_json::json!({
                "message": format!("{code}: {syscall} '{}': {error}", args["path"].as_str().unwrap_or("")),
                "code": code, "errno": error.raw_os_error().map(|errno| -errno),
                "syscall": syscall, "path": args["path"]
            });
            if let Some(dest) = args.get("dest") {
                detail["dest"] = dest.clone();
            }
            serde_json::json!({ "ok": false, "error": detail })
        }
    }
}

fn url_response(operation: &str, input: &str, base: &str) -> serde_json::Value {
    let result = (|| -> Result<serde_json::Value> {
        let parsed = || -> Result<url::Url> {
            if base.is_empty() {
                Ok(url::Url::parse(input)?)
            } else {
                Ok(url::Url::parse(base)?.join(input)?)
            }
        };
        match operation {
            "parse" => {
                let url = parsed()?;
                let hostname = url.host_str().unwrap_or("");
                let port = url
                    .port()
                    .map(|value| value.to_string())
                    .unwrap_or_default();
                Ok(serde_json::json!({
                    "href": url.as_str(), "protocol": format!("{}:", url.scheme()),
                    "host": if port.is_empty() { hostname.to_owned() } else { format!("{hostname}:{port}") },
                    "hostname": hostname, "port": port, "pathname": url.path(),
                    "search": url.query().filter(|value| !value.is_empty()).map(|value| format!("?{value}")).unwrap_or_default(),
                    "hash": url.fragment().filter(|value| !value.is_empty()).map(|value| format!("#{value}")).unwrap_or_default(),
                    "username": url.username(), "password": url.password().unwrap_or(""),
                    "origin": url.origin().ascii_serialization(),
                }))
            }
            "fileToPath" => {
                let url = parsed()?;
                let lower = url.path().to_ascii_lowercase();
                if lower.contains("%2f") || (cfg!(windows) && lower.contains("%5c")) {
                    anyhow::bail!("File URLs must not contain encoded path separators");
                }
                let path = url
                    .to_file_path()
                    .map_err(|_| anyhow::anyhow!("Expected a local file URL"))?;
                Ok(path
                    .to_str()
                    .ok_or_else(|| anyhow::anyhow!("File URL path is not valid UTF-8"))?
                    .to_owned()
                    .into())
            }
            "pathToFile" => {
                let path = Path::new(input);
                let absolute = if path.is_absolute() {
                    path.to_owned()
                } else {
                    std::env::current_dir()?.join(path)
                };
                let url = url::Url::from_file_path(absolute)
                    .map_err(|_| anyhow::anyhow!("Cannot convert path to a file URL"))?;
                Ok(url.to_string().into())
            }
            _ => anyhow::bail!("Unsupported URL operation"),
        }
    })();
    match result {
        Ok(value) => serde_json::json!({ "ok": true, "value": value }),
        Err(error) => serde_json::json!({ "ok": false, "error": error.to_string() }),
    }
}

fn decode_web_base64(input: &str) -> Result<Vec<u8>, base64::DecodeError> {
    use base64::Engine;
    use base64::engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig};
    let mut input: String = input
        .chars()
        .filter(|ch| !matches!(ch, '\t' | '\n' | '\x0c' | '\r' | ' '))
        .collect();
    // WHATWG forgiving-base64 accepts omitted padding and nonzero trailing bits,
    // but removes padding only from inputs whose padded length is divisible by four.
    if input.len() % 4 == 0 {
        if input.ends_with("==") {
            input.truncate(input.len() - 2);
        } else if input.ends_with('=') {
            input.truncate(input.len() - 1);
        }
    }
    GeneralPurpose::new(
        &base64::alphabet::STANDARD,
        GeneralPurposeConfig::new()
            .with_decode_padding_mode(DecodePaddingMode::RequireNone)
            .with_decode_allow_trailing_bits(true),
    )
    .decode(input.as_bytes())
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
            Self::register_process_globals(&ctx, &globals)?;
            Self::register_value_globals(&ctx, &globals)?;

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
    fn register_fs_globals<'js>(
        ctx: &Ctx<'js>,
        globals: &Object<'js>,
        git_root: &str,
    ) -> Result<()> {
        let root = git_root.to_string();
        globals.set(
            "__fs_call",
            Function::new(ctx.clone(), move |operation: String, args: String| {
                fs_response(&root, &operation, &args).to_string()
            })?,
        )?;
        globals.set(
            "__stderr_write",
            Function::new(ctx.clone(), |msg: String| {
                eprint!("{msg}");
            })?,
        )?;

        Ok(())
    }

    /// Register process-related globals.
    fn register_process_globals<'js>(ctx: &Ctx<'js>, globals: &Object<'js>) -> Result<()> {
        globals.set(
            "__process_cwd",
            Function::new(ctx.clone(), || -> rquickjs::Result<String> {
                std::env::current_dir()
                    .map(|path| path.to_string_lossy().into_owned())
                    .map_err(|e| {
                        rquickjs::Error::new_from_js_message("io", "string", e.to_string())
                    })
            })?,
        )?;
        let platform = match std::env::consts::OS {
            "windows" => "win32",
            "macos" => "darwin",
            other => other,
        };
        let arch = match std::env::consts::ARCH {
            "x86_64" => "x64",
            "x86" => "ia32",
            "aarch64" => "arm64",
            other => other,
        };
        let env: std::collections::BTreeMap<String, String> = std::env::vars_os()
            .filter_map(|(key, value)| Some((key.into_string().ok()?, value.into_string().ok()?)))
            .collect();
        use std::io::IsTerminal;
        globals.set(
            "__process_info",
            serde_json::json!({
                "env": env,
                "platform": platform,
                "arch": arch,
                "argv": std::env::args_os().map(|arg| arg.to_string_lossy().into_owned()).collect::<Vec<_>>(),
                "execPath": std::env::current_exe()?.to_string_lossy(),
                "pid": std::process::id(),
                "stdoutIsTTY": std::io::stdout().is_terminal(),
                "stderrIsTTY": std::io::stderr().is_terminal(),
                "stdinIsTTY": std::io::stdin().is_terminal(),
            }).to_string(),
        )?;
        globals.set(
            "__stdout_write",
            Function::new(ctx.clone(), |msg: String| {
                print!("{msg}");
                true
            })?,
        )?;
        Ok(())
    }

    fn register_value_globals<'js>(ctx: &Ctx<'js>, globals: &Object<'js>) -> Result<()> {
        globals.set(
            "__base64_encode",
            Function::new(ctx.clone(), |bytes: String| -> rquickjs::Result<String> {
                use base64::Engine;
                let bytes: Vec<u8> = serde_json::from_str(&bytes).map_err(|error| {
                    rquickjs::Error::new_from_js_message("bytes", "base64", error.to_string())
                })?;
                Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
            })?,
        )?;
        globals.set(
            "__base64_decode",
            Function::new(ctx.clone(), |input: String| {
                match decode_web_base64(&input) {
                    Ok(value) => serde_json::json!({ "ok": true, "value": value }),
                    Err(_) => serde_json::json!({ "ok": false }),
                }
                .to_string()
            })?,
        )?;
        globals.set(
            "__url_call",
            Function::new(
                ctx.clone(),
                |operation: String, input: String, base: String| {
                    url_response(&operation, &input, &base).to_string()
                },
            )?,
        )?;
        globals.set(
            "__encoding_utf8Encode",
            Function::new(ctx.clone(), |text: String| {
                serde_json::json!(text.into_bytes()).to_string()
            })?,
        )?;
        globals.set(
            "__encoding_utf8Decode",
            Function::new(ctx.clone(), |bytes: String| -> rquickjs::Result<String> {
                let bytes: Vec<u8> = serde_json::from_str(&bytes).map_err(|error| {
                    rquickjs::Error::new_from_js_message("bytes", "string", error.to_string())
                })?;
                Ok(String::from_utf8_lossy(&bytes).into_owned())
            })?,
        )?;
        let os_type = match std::env::consts::OS {
            "windows" => Some("Windows_NT"),
            "macos" => Some("Darwin"),
            "linux" | "android" => Some("Linux"),
            "freebsd" => Some("FreeBSD"),
            "openbsd" => Some("OpenBSD"),
            _ => None,
        };
        globals.set(
            "__os_info",
            serde_json::json!({
                "type": os_type,
                "tmpdir": std::env::temp_dir().to_str(),
                "eol": if cfg!(windows) { "\r\n" } else { "\n" },
                "endianness": if cfg!(target_endian = "little") { "LE" } else { "BE" },
                "availableParallelism": std::thread::available_parallelism().ok().map(|value| value.get()),
            }).to_string(),
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

            function unsupported(name) {
                return function () {
                    throw new Error(name + " is not supported in the QuickJS runtime");
                };
            }

            if (typeof globalThis.DOMException === "undefined") {
                const details = new WeakMap();
                const names = [
                    ["IndexSizeError", "INDEX_SIZE_ERR"], ["DOMStringSizeError", "DOMSTRING_SIZE_ERR"],
                    ["HierarchyRequestError", "HIERARCHY_REQUEST_ERR"], ["WrongDocumentError", "WRONG_DOCUMENT_ERR"],
                    ["InvalidCharacterError", "INVALID_CHARACTER_ERR"], ["NoDataAllowedError", "NO_DATA_ALLOWED_ERR"],
                    ["NoModificationAllowedError", "NO_MODIFICATION_ALLOWED_ERR"], ["NotFoundError", "NOT_FOUND_ERR"],
                    ["NotSupportedError", "NOT_SUPPORTED_ERR"], ["InUseAttributeError", "INUSE_ATTRIBUTE_ERR"],
                    ["InvalidStateError", "INVALID_STATE_ERR"], ["SyntaxError", "SYNTAX_ERR"],
                    ["InvalidModificationError", "INVALID_MODIFICATION_ERR"], ["NamespaceError", "NAMESPACE_ERR"],
                    ["InvalidAccessError", "INVALID_ACCESS_ERR"], ["ValidationError", "VALIDATION_ERR"],
                    ["TypeMismatchError", "TYPE_MISMATCH_ERR"], ["SecurityError", "SECURITY_ERR"],
                    ["NetworkError", "NETWORK_ERR"], ["AbortError", "ABORT_ERR"],
                    ["URLMismatchError", "URL_MISMATCH_ERR"], ["QuotaExceededError", "QUOTA_EXCEEDED_ERR"],
                    ["TimeoutError", "TIMEOUT_ERR"], ["InvalidNodeTypeError", "INVALID_NODE_TYPE_ERR"],
                    ["DataCloneError", "DATA_CLONE_ERR"],
                ];
                globalThis.DOMException = class DOMException extends Error {
                    constructor(message = "", name = "Error") {
                        const text = `${message}`;
                        super(text);
                        delete this.message;
                        details.set(this, { message: text, name: `${name}` });
                    }
                    get message() { return details.get(this).message; }
                    get name() { return details.get(this).name; }
                    get code() { return names.findIndex(([name]) => name === details.get(this).name) + 1; }
                    get [Symbol.toStringTag]() { return "DOMException"; }
                };
                names.forEach(([, name], index) => {
                    const descriptor = { value: index + 1, enumerable: true };
                    Object.defineProperty(DOMException, name, descriptor);
                    Object.defineProperty(DOMException.prototype, name, descriptor);
                });
            }
            const WebDOMException = globalThis.DOMException;
            globalThis.atob = function atob(value) {
                if (arguments.length === 0) throw new TypeError("atob requires one argument");
                const decoded = JSON.parse(__base64_decode(`${value}`));
                if (!decoded.ok) throw new WebDOMException("The string to be decoded is not correctly encoded.", "InvalidCharacterError");
                let result = "";
                for (const byte of decoded.value) result += String.fromCharCode(byte);
                return result;
            };
            globalThis.btoa = function btoa(value) {
                if (arguments.length === 0) throw new TypeError("btoa requires one argument");
                const text = `${value}`;
                const bytes = [];
                for (let index = 0; index < text.length; index++) {
                    const byte = text.charCodeAt(index);
                    if (byte > 255) throw new WebDOMException("The string to be encoded contains characters outside of the Latin1 range.", "InvalidCharacterError");
                    bytes.push(byte);
                }
                return __base64_encode(JSON.stringify(bytes));
            };

            const info = JSON.parse(__process_info);
            globalThis.process = {
                get version() { throw new Error("process.version is not supported in the QuickJS runtime"); },
                versions: {},
                platform: info.platform,
                arch: info.arch,
                env: info.env,
                argv: info.argv,
                argv0: info.argv[0],
                execPath: info.execPath,
                execArgv: [],
                cwd: __process_cwd,
                chdir: unsupported("process.chdir"),
                exit: unsupported("process.exit"),
                abort: unsupported("process.abort"),
                umask: unsupported("process.umask"),
                getuid: unsupported("process.getuid"),
                getgid: unsupported("process.getgid"),
                hrtime: Object.assign(unsupported("process.hrtime"), {
                    bigint: unsupported("process.hrtime.bigint"),
                }),
                memoryUsage: unsupported("process.memoryUsage"),
                cpuUsage: unsupported("process.cpuUsage"),
                uptime: unsupported("process.uptime"),
                stdout: { write: __stdout_write, isTTY: info.stdoutIsTTY },
                stderr: { write: (message) => { __stderr_write(message); return true; }, isTTY: info.stderrIsTTY },
                stdin: { isTTY: info.stdinIsTTY },
                on: unsupported("process.on"),
                off: unsupported("process.off"),
                once: unsupported("process.once"),
                emit: unsupported("process.emit"),
                addListener: unsupported("process.addListener"),
                removeListener: unsupported("process.removeListener"),
                removeAllListeners: unsupported("process.removeAllListeners"),
                listeners: unsupported("process.listeners"),
                listenerCount: unsupported("process.listenerCount"),
                pid: info.pid,
                title: "repopo-quickjs",
                nextTick: (fn, ...args) => { Promise.resolve().then(() => fn(...args)); },
            };

            function urlCall(operation, input, base = "") {
                const result = JSON.parse(__url_call(operation, input, base));
                if (!result.ok) throw new TypeError(result.error);
                return result.value;
            }
            globalThis.__url_fileToPath = (href) => urlCall("fileToPath", href);
            globalThis.__url_pathToFile = (path) => urlCall("pathToFile", path);
            if (typeof globalThis.URL === "undefined") {
                const urls = new WeakMap();
                globalThis.URL = class URL {
                    constructor(input, base) {
                        urls.set(this, urlCall("parse", String(input), base === undefined ? "" : String(base)));
                    }
                    get href() { return urls.get(this).href; }
                    set href(value) { urls.set(this, urlCall("parse", String(value))); }
                    get protocol() { return urls.get(this).protocol; }
                    get host() { return urls.get(this).host; }
                    get hostname() { return urls.get(this).hostname; }
                    get port() { return urls.get(this).port; }
                    get pathname() { return urls.get(this).pathname; }
                    get search() { return urls.get(this).search; }
                    get hash() { return urls.get(this).hash; }
                    get username() { return urls.get(this).username; }
                    get password() { return urls.get(this).password; }
                    get origin() { return urls.get(this).origin; }
                    get searchParams() { throw new Error("URL.searchParams is not supported in the QuickJS runtime"); }
                    toString() { return this.href; }
                    toJSON() { return this.href; }
                    static canParse(input, base) {
                        try { new URL(input, base); return true; } catch (_) { return false; }
                    }
                };
                for (const name of ["protocol", "host", "hostname", "port", "pathname",
                    "search", "hash", "username", "password"]) {
                    Object.defineProperty(URL.prototype, name, {
                        ...Object.getOwnPropertyDescriptor(URL.prototype, name),
                        set: unsupported("URL." + name + " assignment"),
                    });
                }
            }
            if (typeof globalThis.Buffer === "undefined") {
                const buffers = new WeakSet();
                function encodingName(value = "utf8") {
                    if (typeof value !== "string") throw new TypeError("Expected an encoding name");
                    const name = value.toLowerCase();
                    if (name === "utf8" || name === "utf-8") return "utf8";
                    if (name === "latin1" || name === "binary") return "latin1";
                    if (name === "ascii" || name === "hex") return name;
                    throw new Error("Buffer encoding '" + value + "' is not supported in the QuickJS runtime");
                }
                function encode(text, encoding) {
                    const name = encodingName(encoding);
                    if (name === "utf8") return JSON.parse(__encoding_utf8Encode(text));
                    const bytes = [];
                    if (name === "hex") {
                        for (let i = 0; i + 1 < text.length; i += 2) {
                            const pair = text.slice(i, i + 2);
                            if (!/^[0-9a-f]{2}$/i.test(pair)) break;
                            bytes.push(parseInt(pair, 16));
                        }
                    } else {
                        for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 255);
                    }
                    return bytes;
                }
                function size(value) {
                    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
                        throw new RangeError("Invalid Buffer size");
                    }
                    return value;
                }
                globalThis.Buffer = class Buffer extends Uint8Array {
                    constructor(...args) {
                        if (!(typeof args[0] === "number" || args[0] instanceof ArrayBuffer ||
                            Array.isArray(args[0]) || args[0] instanceof Uint8Array)) {
                            throw new TypeError("Unsupported Buffer constructor input");
                        }
                        super(...args);
                        buffers.add(this);
                    }
                    static from(value, encodingOrOffset, length) {
                        if (typeof value === "string") return new Buffer(encode(value, encodingOrOffset));
                        if (value instanceof ArrayBuffer) return new Buffer(value, encodingOrOffset ?? 0, length);
                        if (Array.isArray(value) || value instanceof Uint8Array) return new Buffer(value);
                        throw new TypeError("Buffer.from supports strings, arrays, Uint8Array and ArrayBuffer only");
                    }
                    static isBuffer(value) { return buffers.has(value); }
                    static isEncoding(value) {
                        try { encodingName(value); return typeof value === "string"; } catch (_) { return false; }
                    }
                    static byteLength(value, encoding) {
                        if (typeof value === "string") {
                            return encodingName(encoding) === "hex" ? Math.floor(value.length / 2) : encode(value, encoding).length;
                        }
                        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value.byteLength;
                        throw new TypeError("Expected a string, ArrayBuffer or typed array");
                    }
                    static alloc(length, fill = 0) {
                        if (typeof fill !== "number") throw new Error("Non-numeric Buffer.alloc fill is not supported in the QuickJS runtime");
                        return new Buffer(size(length)).fill(fill);
                    }
                    static concat(list, totalLength) {
                        if (!Array.isArray(list) || !Array.from(list).every(value => value instanceof Uint8Array)) {
                            throw new TypeError("Expected an array of Uint8Array values");
                        }
                        const result = Buffer.alloc(totalLength === undefined ? list.reduce((sum, value) => sum + value.length, 0) : totalLength);
                        let offset = 0;
                        for (const value of list) {
                            const length = Math.min(value.length, result.length - offset);
                            result.set(value.subarray(0, length), offset);
                            offset += length;
                            if (offset === result.length) break;
                        }
                        return result;
                    }
                    slice(start, end) { return this.subarray(start, end); }
                    toString(encoding = "utf8", start = 0, end = this.length) {
                        const name = encodingName(encoding);
                        const first = Math.min(this.length, Math.max(0, Math.trunc(Number(start) || 0)));
                        const last = Math.max(first, Math.min(this.length, Math.max(0, Math.trunc(Number(end) || 0))));
                        const bytes = Array.from(this.subarray(first, last));
                        if (name === "utf8") return __encoding_utf8Decode(JSON.stringify(bytes));
                        if (name === "hex") return bytes.map(value => value.toString(16).padStart(2, "0")).join("");
                        let result = "";
                        for (const value of bytes) result += String.fromCharCode(name === "ascii" ? value & 127 : value);
                        return result;
                    }
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
        let result_json = self.call_js_batch(
            "__repopo_runHandlerBatchSync",
            policy_id,
            files,
            root,
            Some(resolve),
        )?;
        let batch: CompactBatchResponse =
            serde_json::from_str(&result_json).with_context(|| {
                format!("Failed to parse QuickJS handler batch response: {result_json}")
            })?;
        Ok(expand_compact_response(batch))
    }

    /// Run a resolver batch for the given policy on the given files.
    pub fn run_resolver_batch(
        &self,
        policy_id: usize,
        files: &[String],
        root: &str,
    ) -> Result<Vec<(String, HandlerResult)>> {
        let result_json = self.call_js_batch(
            "__repopo_runResolverBatchSync",
            policy_id,
            files,
            root,
            None,
        )?;
        let batch: CompactBatchResponse =
            serde_json::from_str(&result_json).with_context(|| {
                format!("Failed to parse QuickJS resolver batch response: {result_json}")
            })?;
        Ok(expand_compact_response(batch))
    }

    /// Execute a repository handler in the same evaluated context as file handlers.
    pub fn run_repository_policy(
        &self,
        policy_id: usize,
        files: &[String],
        root: &str,
        resolve: bool,
    ) -> Result<Vec<RepositoryPolicyResult>> {
        let result_json = self.call_js_batch(
            "__repopo_runRepositoryPolicySync",
            policy_id,
            files,
            root,
            Some(resolve),
        )?;
        serde_json::from_str(&result_json).with_context(|| {
            format!("Failed to parse QuickJS repository policy response: {result_json}")
        })
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
        let files_literal = serde_json::to_string(&files_json)?;
        let root_literal = serde_json::to_string(root)?;

        let call_js = if let Some(resolve) = resolve {
            format!("{fn_name}({policy_id}, {files_literal}, {root_literal}, {resolve})")
        } else {
            format!("{fn_name}({policy_id}, {files_literal}, {root_literal})")
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
                Err(e) => return Err(anyhow::anyhow!("QuickJS pending job failed: {e:?}")),
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

#[cfg(test)]
mod tests {
    use super::QuickJsRuntime;

    #[test]
    fn invocation_environment_and_working_directory_are_not_fabricated() {
        let runtime = QuickJsRuntime::new(
            "/not-the-invocation-directory",
            r#"
            globalThis.__repopo_metadata = JSON.stringify({
                env: process.env, cwd: process.cwd(), platform: process.platform,
                arch: process.arch, pid: process.pid, argv: process.argv,
                execPath: process.execPath, versions: process.versions
            });
            "#,
        )
        .unwrap();
        let actual: serde_json::Value =
            serde_json::from_str(&runtime.read_metadata().unwrap()).unwrap();
        let env: std::collections::BTreeMap<String, String> = std::env::vars_os()
            .filter_map(|(key, value)| Some((key.into_string().ok()?, value.into_string().ok()?)))
            .collect();
        assert_eq!(actual["env"], serde_json::to_value(env).unwrap());
        assert_eq!(
            actual["cwd"],
            std::env::current_dir().unwrap().to_str().unwrap()
        );
        assert_eq!(actual["pid"], std::process::id());
        assert_eq!(
            actual["execPath"],
            std::env::current_exe().unwrap().to_str().unwrap()
        );
        assert_eq!(
            actual["argv"],
            serde_json::json!(std::env::args().collect::<Vec<_>>())
        );
        assert!(actual["versions"].as_object().unwrap().is_empty());
        assert_eq!(
            actual["platform"],
            match std::env::consts::OS {
                "windows" => "win32",
                "macos" => "darwin",
                other => other,
            }
        );
        assert_eq!(
            actual["arch"],
            match std::env::consts::ARCH {
                "x86_64" => "x64",
                "x86" => "ia32",
                "aarch64" => "arm64",
                other => other,
            }
        );
    }

    #[test]
    fn unsupported_node_globals_fail_instead_of_reporting_success() {
        QuickJsRuntime::new(
            ".",
            r#"
            const operations = [
                () => process.chdir("/"),
                () => process.exit(0),
                () => process.hrtime(),
                () => process.on("exit", () => {}),
                () => Buffer.from("text", "base64"),
                () => new URL("https://example.com").searchParams
            ];
            for (const operation of operations) {
                let failed = false;
                try { operation(); } catch (error) {
                    failed = error.message.includes("not supported");
                }
                if (!failed) throw new Error("Unsupported operation did not fail");
            }
            "#,
        )
        .unwrap();
    }

    #[test]
    fn web_base64_preserves_latin1_binary_and_whatwg_forgiving_padding() {
        QuickJsRuntime::new(".", r#"
            function check(value, message) { if (!value) throw new Error(message); }
            let binary = "";
            for (let byte = 0; byte < 256; byte++) binary += String.fromCharCode(byte);
            check(atob(btoa(binary)) === binary, "All Latin1 bytes must roundtrip");
            check(btoa("\0\xff\x80") === "AP+A", "Binary encoding is not UTF8");
            check(btoa("\xff") === "/w==" && atob("/w==").charCodeAt(0) === 255, "Latin1");
            check(btoa("") === "" && atob("") === "", "Empty strings");
            check(atob("\t Z\nm\r9\f v \t") === "foo", "ASCII whitespace");
            check(atob(" Zg==\n") === "f" && atob(" \t\r\n\f") === "", "Whitespace trimming");
            check(atob("Zg") === "f" && atob("Zm8") === "fo", "Omitted padding");
            check(atob("Zh==") === "f" && atob("Zm9=") === "fo", "Nonzero trailing bits");
            check(btoa(null) === "bnVsbA==" && btoa(undefined) === "dW5kZWZpbmVk", "DOMString coercion");
            check(atob({ toString: () => "YQ==" }) === "a", "Object DOMString coercion");
            "#).unwrap();
    }

    #[test]
    fn web_base64_rejects_malformed_input_with_invalid_character_exceptions() {
        QuickJsRuntime::new(".", r#"
            function check(value, message) { if (!value) throw new Error(message); }
            const invalid = (operation) => {
                let error;
                try { operation(); } catch (caught) { error = caught; }
                check(error instanceof DOMException && error instanceof Error, "DOMException required");
                check(error.name === "InvalidCharacterError" && error.code === 5, "InvalidCharacterError required");
                check(error.code === DOMException.INVALID_CHARACTER_ERR, "Legacy error code");
                check(Object.prototype.toString.call(error) === "[object DOMException]", "Error brand");
            };
            for (const value of ["A", "AA=", "AAA==", "A===", "====", "AA==AA",
                "Zg===", "Zg=\n", "_w==", "-w==", "Zg==\u00a0", "Zg==\v", "漢", "Zg\0"]) {
                invalid(() => atob(value));
            }
            for (const value of ["\u0100", "\uD800", "😀"]) invalid(() => btoa(value));
            for (const operation of [() => atob(), () => btoa(),
                () => atob(Symbol()), () => btoa(Symbol())]) {
                let error;
                try { operation(); } catch (caught) { error = caught; }
                check(error instanceof TypeError, "Missing arguments and Symbols require TypeError");
            }
            "#).unwrap();
    }

    #[test]
    fn buffer_uses_real_bytes_encodings_and_unforgeable_branding() {
        QuickJsRuntime::new(".", r#"
            function check(value, message) { if (!value) throw new Error(message); }
            const text = Buffer.from("é😀");
            check(text instanceof Uint8Array && text.length === 6, "UTF8 byte length");
            check(text.toString() === "é😀" && Buffer.byteLength("é😀") === 6, "UTF8 round trip");
            check(!Buffer.isBuffer("é😀") && !Buffer.isBuffer(new Uint8Array(2)), "False brands");
            check(!Buffer.isBuffer(Object.create(Buffer.prototype)), "Forged brand");
            check(Buffer.isBuffer(text) && Buffer.isBuffer(text.subarray(1)), "Typed array branding");
            check(Buffer.from([255, 0, 257]).toString("hex") === "ff0001", "Raw bytes");
            check(Buffer.from("c3a9ff", "hex").toString() === "é\uFFFD", "Invalid UTF8 replacement");
            check(Buffer.from("ab0x", "hex").toString("hex") === "ab", "Hex truncation");
            check(Buffer.from("é", "latin1").toString("hex") === "e9", "Latin1 bytes");
            check(Buffer.from([233]).toString("ascii") === "i", "ASCII mask");
            check(Buffer.from([233]).toString("latin1") === "é", "Latin1 decode");
            const raw = new ArrayBuffer(3);
            const shared = Buffer.from(raw, 1, 1);
            shared[0] = 65;
            check(new Uint8Array(raw)[1] === 65, "ArrayBuffer sharing");
            const slice = text.slice(0, 1);
            slice[0] = 65;
            check(text[0] === 65, "Buffer slice shares memory");
            check(Buffer.concat([Buffer.from("a"), Buffer.from("b")], 3).toString("hex") === "616200", "Concat");
            check(Buffer.alloc(2, 255).toString("hex") === "ffff", "Allocation");
            check(Buffer.isEncoding("UTF-8") && !Buffer.isEncoding("base64"), "Encoding limits");
            "#).unwrap();
    }

    #[test]
    fn url_resolution_and_file_paths_use_host_url_semantics() {
        QuickJsRuntime::new(".", r#"
            function check(value, message) { if (!value) throw new Error(message); }
            const resource = new URL("index.json", "file:///repo/a%20b/config.mjs");
            check(resource.href === "file:///repo/a%20b/index.json", "Relative resource URL");
            check(__url_fileToPath(resource.href).endsWith("/repo/a b/index.json"), "Decoded file path");
            const url = new URL("../c?query#hash", "https://EXAMPLE.com:443/a/b/");
            check(url.href === "https://example.com/a/c?query#hash", "Standard resolution");
            check(url.origin === "https://example.com" && url.port === "", "Standard origin");
            const encoded = __url_pathToFile("name #%.txt");
            check(encoded.endsWith("/name%20%23%25.txt"), "Path escaping");
            check(__url_fileToPath(encoded).endsWith("name #%.txt"), "Path roundtrip");
            check(!URL.canParse("not an absolute url"), "Invalid URL");
            for (const href of ["https://example.com", "file:///encoded%2fseparator"]) {
                let rejected = false;
                try { __url_fileToPath(href); } catch (_) { rejected = true; }
                check(rejected, "Invalid filesystem URL accepted");
            }
            "#).unwrap();
    }

    #[test]
    fn batch_arguments_preserve_newlines_quotes_and_backslashes() {
        let runtime = QuickJsRuntime::new(
            ".",
            r#"
            globalThis.__repopo_runRepositoryPolicySync = (id, files, root, resolve) => {
                globalThis.__repopo_lastResult = JSON.stringify([{
                    policyId: "Arguments",
                    outcome: { error: root, files: JSON.parse(files), fixed: resolve }
                }]);
            };
            "#,
        )
        .unwrap();
        let files = vec!["quote'\nback\\slash.txt".into()];
        let root = "root'\nback\\slash";
        let results = runtime
            .run_repository_policy(0, &files, root, true)
            .unwrap();
        assert_eq!(results[0].outcome.error, root);
        assert_eq!(results[0].outcome.files, files);
        assert_eq!(results[0].outcome.fixed, Some(true));
    }
}
