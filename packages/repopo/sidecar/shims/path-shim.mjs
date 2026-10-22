import path from "path-browserify";

export const {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	normalize,
	parse,
	relative,
	resolve,
} = path;
export const delimiter = ":";
export const sep = "/";
export const toNamespacedPath = (value) => value;
export function format(value) {
	const ext =
		value.ext && !value.ext.startsWith(".") ? `.${value.ext}` : value.ext;
	return path.format({ ...value, ext });
}

export const win32 = new Proxy(
	{},
	{
		get() {
			throw new Error("Windows path operations require IPC");
		},
	},
);
export const posix = {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	normalize,
	parse,
	relative,
	resolve,
	delimiter,
	sep,
	toNamespacedPath,
	format,
	win32,
};
posix.posix = posix;
export default posix;
