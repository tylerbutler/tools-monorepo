/** Host facts only; unsupported operating-system queries fail explicitly. */
function unsupported(name) {
	throw new Error(`os.${name} is not supported in the QuickJS runtime`);
}

const host = JSON.parse(globalThis.__os_info);

export const EOL = host.eol;
export const platform = () => globalThis.process.platform;
export const arch = () => globalThis.process.arch;
export const tmpdir = () => {
	if (host.tmpdir === null) unsupported("tmpdir non-Unicode path");
	return host.tmpdir;
};
export const type = () => {
	if (host.type === null) unsupported("type");
	return host.type;
};
export const endianness = () => host.endianness;
export const availableParallelism = () => {
	if (host.availableParallelism === null) unsupported("availableParallelism");
	return host.availableParallelism;
};

export function homedir() {
	const env = globalThis.process.env;
	const home = platform() === "win32" ? env.USERPROFILE : env.HOME;
	if (!home) unsupported("homedir without a home environment variable");
	return home;
}

export const hostname = () => unsupported("hostname");
export const release = () => unsupported("release");
export const cpus = () => unsupported("cpus");
export const freemem = () => unsupported("freemem");
export const totalmem = () => unsupported("totalmem");
export const uptime = () => unsupported("uptime");
export const networkInterfaces = () => unsupported("networkInterfaces");
export const userInfo = () => unsupported("userInfo");

export default {
	EOL,
	platform,
	tmpdir,
	homedir,
	hostname,
	type,
	arch,
	release,
	cpus,
	endianness,
	freemem,
	totalmem,
	uptime,
	networkInterfaces,
	userInfo,
	availableParallelism,
};
