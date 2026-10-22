/**
 * JSON-boundary filesystem adapter backed by the invocation's Rust host.
 * Promise/callback APIs schedule JS jobs; native filesystem operations are synchronous.
 */

function unsupported(name) {
	throw new Error(`${name} is not supported in the QuickJS runtime`);
}

function normalizePath(path) {
	if (path instanceof globalThis.URL) {
		return globalThis.__url_fileToPath(path.href);
	}
	if (globalThis.Buffer.isBuffer(path)) return path.toString();
	if (typeof path !== "string")
		throw new TypeError("Expected a filesystem path");
	if (path.includes("\0"))
		throw new TypeError("Path must not contain null bytes");
	return path;
}

function options(value, allowed, unsupportedOptions = []) {
	if (value === undefined || value === null) return {};
	if (typeof value === "string") {
		if (!allowed.includes("encoding"))
			throw new TypeError("Invalid filesystem options");
		return { encoding: value };
	}
	if (typeof value !== "object")
		throw new TypeError("Invalid filesystem options");
	for (const key of unsupportedOptions) {
		if (value[key] !== undefined) unsupported(`Filesystem option '${key}'`);
	}
	const normalized = {};
	for (const key of allowed) {
		if (value[key] === undefined) continue;
		if (
			["recursive", "withFileTypes", "bigint", "throwIfNoEntry"].includes(
				key,
			) &&
			typeof value[key] !== "boolean"
		) {
			throw new TypeError(`Expected boolean filesystem option '${key}'`);
		}
		normalized[key] = value[key];
	}
	return normalized;
}

function invoke(operation, args) {
	const response = JSON.parse(
		globalThis.__fs_call(operation, JSON.stringify(args)),
	);
	if (!response.ok) {
		const error = new Error(response.error.message);
		Object.assign(error, response.error);
		throw error;
	}
	return response.value;
}

function pathCall(operation, path, extra = {}) {
	return invoke(operation, { path: normalizePath(path), ...extra });
}

export function readFileSync(path, encodingOrOptions) {
	const opts = options(encodingOrOptions, ["encoding", "flag"], ["signal"]);
	if (opts.flag !== undefined && opts.flag !== "r")
		unsupported("readFile flag");
	const bytes = pathCall("readFile", path);
	const buffer = globalThis.Buffer.from(bytes);
	return opts.encoding ? buffer.toString(opts.encoding) : buffer;
}

export function writeFileSync(path, data, encodingOrOptions) {
	const opts = options(
		encodingOrOptions,
		["encoding", "flag", "mode"],
		["signal", "flush"],
	);
	const bytes =
		typeof data === "string"
			? globalThis.Buffer.from(data, opts.encoding ?? "utf8")
			: data;
	if (!(bytes instanceof Uint8Array)) {
		throw new TypeError("writeFile data must be a string or Uint8Array");
	}
	pathCall("writeFile", path, {
		data: Array.from(bytes),
		flag: opts.flag ?? "w",
		...(opts.mode === undefined ? {} : { mode: opts.mode }),
	});
}

export function existsSync(path) {
	try {
		pathCall("access", path, { mode: 0 });
		return true;
	} catch (error) {
		if (error.code) return false;
		throw error;
	}
}

function fileTypeMethods(value) {
	return Object.fromEntries(
		[
			"isDirectory",
			"isFile",
			"isSymbolicLink",
			"isBlockDevice",
			"isCharacterDevice",
			"isFIFO",
			"isSocket",
		].map((name) => [
			name,
			() => {
				if (typeof value[name] !== "boolean") unsupported(name);
				return value[name];
			},
		]),
	);
}

function stats(operation, path, opts) {
	const settings = options(opts, ["bigint", "throwIfNoEntry"]);
	if (settings.bigint) unsupported("bigint filesystem stats");
	let value;
	try {
		value = pathCall(operation, path);
	} catch (error) {
		if (error.code === "ENOENT" && settings.throwIfNoEntry === false) {
			return undefined;
		}
		throw error;
	}
	const result = { ...value, ...fileTypeMethods(value) };
	for (const [name, field] of Object.entries(value)) {
		if (field === null) {
			Object.defineProperty(result, name, {
				get: () => unsupported(`stat.${name}`),
			});
		}
	}
	for (const name of ["atime", "mtime", "ctime", "birthtime"]) {
		Object.defineProperty(result, name, {
			get: () => {
				if (value[`${name}Ms`] === null) unsupported(`stat.${name}`);
				return new Date(value[`${name}Ms`]);
			},
		});
	}
	return result;
}

export function statSync(path, opts) {
	return stats("stat", path, opts);
}

export function lstatSync(path, opts) {
	return stats("lstat", path, opts);
}

export function copyFileSync(src, dest, flags = 0) {
	if (!Number.isInteger(flags) || flags < 0)
		throw new TypeError("Invalid copyFile flags");
	invoke("copyFile", {
		path: normalizePath(src),
		dest: normalizePath(dest),
		flags,
	});
}

export function mkdirSync(path, value) {
	const opts =
		typeof value === "number"
			? { mode: value }
			: options(value, ["recursive", "mode"]);
	return (
		pathCall("mkdir", path, {
			recursive: opts.recursive ?? false,
			...(opts.mode === undefined ? {} : { mode: opts.mode }),
		}) ?? undefined
	);
}

export function readdirSync(path, value) {
	const opts = options(value, ["encoding", "withFileTypes", "recursive"]);
	if (opts.recursive) unsupported("recursive readdir");
	const entries = pathCall("readdir", path);
	if (opts.encoding && !["utf8", "utf-8", "buffer"].includes(opts.encoding)) {
		unsupported(`readdir encoding '${opts.encoding}'`);
	}
	return entries.map((entry) => {
		if (opts.encoding === "buffer" && entry.nameBytes === null) {
			unsupported("readdir raw filename bytes");
		}
		const name =
			opts.encoding === "buffer"
				? globalThis.Buffer.from(entry.nameBytes)
				: entry.name;
		return opts.withFileTypes
			? {
					name,
					parentPath: entry.parentPath,
					path: entry.parentPath,
					...fileTypeMethods(entry),
				}
			: name;
	});
}

export function unlinkSync(path) {
	pathCall("unlink", path);
}

export function rmdirSync(path, value) {
	const opts = options(value, ["recursive"]);
	if (opts.recursive) unsupported("recursive rmdir");
	pathCall("rmdir", path);
}

export function renameSync(oldPath, newPath) {
	invoke("rename", {
		path: normalizePath(oldPath),
		dest: normalizePath(newPath),
	});
}

export function chmodSync(path, mode) {
	if (!Number.isInteger(mode) || mode < 0 || mode > 0o7777) {
		throw new TypeError("Invalid chmod mode");
	}
	pathCall("chmod", path, { mode });
}

export function accessSync(path, mode = 0) {
	if (!Number.isInteger(mode) || mode < 0 || mode > 7)
		throw new TypeError("Invalid access mode");
	pathCall("access", path, { mode });
}

export function realpathSync(path, value) {
	const opts = options(value, ["encoding"]);
	const resolved = pathCall("realpath", path);
	if (!opts.encoding || ["utf8", "utf-8"].includes(opts.encoding)) {
		if (resolved.path === null) unsupported("realpath non-Unicode paths");
		return resolved.path;
	}
	if (opts.encoding === "buffer") {
		if (resolved.bytes === null) unsupported("realpath raw path bytes");
		return globalThis.Buffer.from(resolved.bytes);
	}
	unsupported(`realpath encoding '${opts.encoding}'`);
}

function callbackCall(operation, args) {
	const callback = args.pop();
	if (typeof callback !== "function")
		throw new TypeError("Callback is required");
	Promise.resolve()
		.then(() => operation(...args))
		.then(
			(value) => callback(null, value),
			(error) => callback(error),
		);
}

export function readFile(...args) {
	callbackCall(readFileSync, args);
}
export function writeFile(...args) {
	callbackCall(writeFileSync, args);
}
export function stat(...args) {
	callbackCall(statSync, args);
}
export function lstat(...args) {
	callbackCall(lstatSync, args);
}
export function access(...args) {
	callbackCall(accessSync, args);
}
export function mkdir(...args) {
	callbackCall(mkdirSync, args);
}
export function readdir(...args) {
	callbackCall(readdirSync, args);
}
export function unlink(...args) {
	callbackCall(unlinkSync, args);
}
export function copyFile(...args) {
	callbackCall(copyFileSync, args);
}
export function realpath(...args) {
	callbackCall(realpathSync, args);
}
export function rename(...args) {
	callbackCall(renameSync, args);
}
export function chmod(...args) {
	callbackCall(chmodSync, args);
}

export const constants = {
	F_OK: 0,
	R_OK: 4,
	W_OK: 2,
	X_OK: 1,
	COPYFILE_EXCL: 1,
	COPYFILE_FICLONE: 2,
	COPYFILE_FICLONE_FORCE: 4,
};

export const promises = {
	readFile: async (...args) => readFileSync(...args),
	writeFile: async (...args) => writeFileSync(...args),
	stat: async (...args) => statSync(...args),
	lstat: async (...args) => lstatSync(...args),
	access: async (...args) => accessSync(...args),
	mkdir: async (...args) => mkdirSync(...args),
	readdir: async (...args) => readdirSync(...args),
	copyFile: async (...args) => copyFileSync(...args),
	unlink: async (...args) => unlinkSync(...args),
	rename: async (...args) => renameSync(...args),
	chmod: async (...args) => chmodSync(...args),
	realpath: async (...args) => realpathSync(...args),
	rmdir: async (...args) => rmdirSync(...args),
};

export function createReadStream() {
	unsupported("createReadStream");
}
export function createWriteStream() {
	unsupported("createWriteStream");
}
export function gracefulify() {
	unsupported("gracefulify");
}

export default {
	readFileSync,
	writeFileSync,
	existsSync,
	statSync,
	lstatSync,
	copyFileSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
	rmdirSync,
	renameSync,
	chmodSync,
	accessSync,
	realpathSync,
	readFile,
	writeFile,
	stat,
	lstat,
	access,
	mkdir,
	readdir,
	unlink,
	copyFile,
	realpath,
	rename,
	chmod,
	constants,
	promises,
	createReadStream,
	createWriteStream,
	gracefulify,
};
