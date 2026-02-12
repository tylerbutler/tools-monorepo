/**
 * Node.js fs/promises module shim for QuickJS runtime.
 * Async wrappers around synchronous Rust-backed fs operations.
 */

import {
	accessSync,
	copyFileSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "./fs-shim.mjs";

export async function readFile(path, options) {
	return readFileSync(path, options);
}

export async function writeFile(path, data, _options) {
	writeFileSync(path, data);
}

export async function stat(path) {
	return statSync(path);
}

export async function lstat(path) {
	return statSync(path);
}

export async function access(path, _mode) {
	accessSync(path);
}

export async function mkdir(path, options) {
	mkdirSync(path, options);
}

export async function readdir(path, _options) {
	return readdirSync(path);
}

export async function copyFile(src, dest) {
	copyFileSync(src, dest);
}

export async function unlink(path) {
	unlinkSync(path);
}

export async function rename(oldPath, newPath) {
	renameSync(oldPath, newPath);
}

export default {
	readFile,
	writeFile,
	stat,
	lstat,
	access,
	mkdir,
	readdir,
	copyFile,
	unlink,
	rename,
};
