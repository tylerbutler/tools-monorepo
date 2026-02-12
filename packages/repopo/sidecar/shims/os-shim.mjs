/**
 * Node.js os module shim for QuickJS runtime.
 */

export const EOL = "\n";

export function platform() {
	return "linux";
}

export function tmpdir() {
	return "/tmp";
}

export function homedir() {
	return globalThis.__process_cwd?.() ?? "/";
}

export function hostname() {
	return "quickjs";
}

export function type() {
	return "Linux";
}

export function arch() {
	return "x64";
}

export function release() {
	return "0.0.0-quickjs";
}

export function cpus() {
	return [{ model: "QuickJS", speed: 0 }];
}

export function endianness() {
	return "LE";
}

export function freemem() {
	return 1024 * 1024 * 1024;
}

export function totalmem() {
	return 4 * 1024 * 1024 * 1024;
}

export function uptime() {
	return 0;
}

export function networkInterfaces() {
	return {};
}

export function userInfo() {
	return { username: "repopo", uid: 1000, gid: 1000, shell: "/bin/sh", homedir: homedir() };
}

export default {
	EOL, platform, tmpdir, homedir, hostname, type, arch, release, cpus,
	endianness, freemem, totalmem, uptime, networkInterfaces, userInfo,
};
