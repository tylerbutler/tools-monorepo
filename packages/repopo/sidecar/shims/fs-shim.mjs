/**
 * Node.js fs module shim for QuickJS runtime.
 * All operations are backed by Rust std::fs via globalThis.__fs_* functions.
 *
 * Also serves as the graceful-fs shim (aliased by esbuild).
 */

function normalizePath(p) {
	return String(p);
}

function normalizeEncoding(encodingOrOptions) {
	if (typeof encodingOrOptions === "string") return encodingOrOptions;
	if (encodingOrOptions && typeof encodingOrOptions === "object") {
		return encodingOrOptions.encoding ?? "utf-8";
	}
	return "utf-8";
}

// --- Synchronous operations (core, backed by Rust) ---

export function readFileSync(path, encodingOrOptions) {
	const encoding = normalizeEncoding(encodingOrOptions);
	return globalThis.__fs_readFileSync(normalizePath(path), encoding);
}

export function writeFileSync(path, data, _options) {
	globalThis.__fs_writeFileSync(normalizePath(path), String(data));
}

export function existsSync(path) {
	return globalThis.__fs_existsSync(normalizePath(path));
}

export function statSync(path) {
	const raw = globalThis.__fs_statSync(normalizePath(path));
	const s = JSON.parse(raw);
	return {
		size: s.size,
		mode: s.mode ?? 0,
		mtime: new Date(s.mtimeMs ?? 0),
		atime: new Date(s.atimeMs ?? 0),
		ctime: new Date(s.ctimeMs ?? 0),
		birthtime: new Date(s.ctimeMs ?? 0),
		isDirectory: () => s.isDirectory,
		isFile: () => s.isFile,
		isSymbolicLink: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isFIFO: () => false,
		isSocket: () => false,
	};
}

export function lstatSync(path) {
	return statSync(path);
}

export function copyFileSync(src, dest) {
	globalThis.__fs_copyFileSync(normalizePath(src), normalizePath(dest));
}

export function mkdirSync(path, options) {
	const recursive =
		typeof options === "object" ? (options?.recursive ?? false) : false;
	globalThis.__fs_mkdirSync(normalizePath(path), recursive);
}

export function readdirSync(path, options) {
	const raw = globalThis.__fs_readdirSync(normalizePath(path));
	const names = JSON.parse(raw);
	if (options && options.withFileTypes) {
		// Return Dirent-like objects. Use statSync on each entry to determine type.
		const dirPath = normalizePath(path);
		return names.map((name) => {
			let isDir = false;
			let isFile = false;
			try {
				const s = statSync(dirPath + "/" + name);
				isDir = s.isDirectory();
				isFile = s.isFile();
			} catch (_) {
				// stat failed (broken symlink, etc.) — treat as file
				isFile = true;
			}
			return {
				name,
				isDirectory: () => isDir,
				isFile: () => isFile,
				isSymbolicLink: () => false,
				isBlockDevice: () => false,
				isCharacterDevice: () => false,
				isFIFO: () => false,
				isSocket: () => false,
			};
		});
	}
	return names;
}

export function unlinkSync(path) {
	globalThis.__fs_unlinkSync(normalizePath(path));
}

export function rmdirSync(path, _options) {
	globalThis.__fs_rmdirSync(normalizePath(path));
}

export function renameSync(oldPath, newPath) {
	globalThis.__fs_renameSync(normalizePath(oldPath), normalizePath(newPath));
}

export function chmodSync(_path, _mode) {
	// No-op in QuickJS context
}

export function accessSync(path, _mode) {
	if (!existsSync(path)) {
		const err = new Error(
			`ENOENT: no such file or directory, access '${path}'`,
		);
		err.code = "ENOENT";
		throw err;
	}
}

// --- Callback-style operations (for graceful-fs / jsonfile compatibility) ---

export function readFile(path, optionsOrCallback, callback) {
	let encoding = "utf-8";
	let cb = callback;
	if (typeof optionsOrCallback === "function") {
		cb = optionsOrCallback;
	} else {
		encoding = normalizeEncoding(optionsOrCallback);
	}
	try {
		const data = readFileSync(path, encoding);
		if (cb) cb(null, data);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function writeFile(path, data, optionsOrCallback, callback) {
	let cb = callback;
	if (typeof optionsOrCallback === "function") {
		cb = optionsOrCallback;
	}
	try {
		writeFileSync(path, data);
		if (cb) cb(null);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function stat(path, optionsOrCallback, callback) {
	let cb = callback;
	if (typeof optionsOrCallback === "function") {
		cb = optionsOrCallback;
	}
	try {
		const s = statSync(path);
		if (cb) cb(null, s);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function lstat(path, optionsOrCallback, callback) {
	return stat(path, optionsOrCallback, callback);
}

export function access(path, modeOrCallback, callback) {
	let cb = callback;
	if (typeof modeOrCallback === "function") {
		cb = modeOrCallback;
	}
	try {
		accessSync(path);
		if (cb) cb(null);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function mkdir(path, optionsOrCallback, callback) {
	let options = {};
	let cb = callback;
	if (typeof optionsOrCallback === "function") {
		cb = optionsOrCallback;
	} else {
		options = optionsOrCallback || {};
	}
	try {
		mkdirSync(path, options);
		if (cb) cb(null);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function readdir(path, optionsOrCallback, callback) {
	let options;
	let cb = callback;
	if (typeof optionsOrCallback === "function") {
		cb = optionsOrCallback;
	} else {
		options = optionsOrCallback;
	}
	try {
		const entries = readdirSync(path, options);
		if (cb) cb(null, entries);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function unlink(path, callback) {
	try {
		unlinkSync(path);
		if (callback) callback(null);
	} catch (err) {
		if (callback) callback(err);
	}
}

export function copyFile(src, dest, flagsOrCallback, callback) {
	let cb = callback;
	if (typeof flagsOrCallback === "function") {
		cb = flagsOrCallback;
	}
	try {
		copyFileSync(src, dest);
		if (cb) cb(null);
	} catch (err) {
		if (cb) cb(err);
	}
}

export function realpath(path, optionsOrCallback, callback) {
	let cb = callback;
	if (typeof optionsOrCallback === "function") {
		cb = optionsOrCallback;
	}
	// In our context, paths are already resolved by Rust
	try {
		if (cb) cb(null, normalizePath(path));
	} catch (err) {
		if (cb) cb(err);
	}
}

export function realpathSync(path) {
	return normalizePath(path);
}

// --- Constants ---

export const constants = {
	F_OK: 0,
	R_OK: 4,
	W_OK: 2,
	X_OK: 1,
	COPYFILE_EXCL: 1,
	COPYFILE_FICLONE: 2,
	COPYFILE_FICLONE_FORCE: 4,
};

// --- Promises API (accessible via fs.promises) ---

export const promises = {
	readFile: async (path, options) => readFileSync(path, options),
	writeFile: async (path, data) => writeFileSync(path, data),
	stat: async (path) => statSync(path),
	lstat: async (path) => statSync(path),
	access: async (path) => accessSync(path),
	mkdir: async (path, options) => mkdirSync(path, options),
	readdir: async (path, options) => readdirSync(path, options),
	copyFile: async (src, dest) => copyFileSync(src, dest),
	unlink: async (path) => unlinkSync(path),
};

// --- Stream stubs ---

export function createReadStream() {
	throw new Error("createReadStream is not supported in QuickJS runtime");
}

export function createWriteStream() {
	throw new Error("createWriteStream is not supported in QuickJS runtime");
}

// --- Default export (graceful-fs compatibility) ---

const fsModule = {
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
	constants,
	promises,
	createReadStream,
	createWriteStream,
};

// graceful-fs calls this to patch the fs module
export function gracefulify(_fs) {
	return _fs;
}

export default fsModule;
