/**
 * Node.js path module shim for QuickJS runtime.
 * Re-exports pathe (pure JS path implementation, bundled inline by esbuild).
 */

export {
	basename,
	delimiter,
	dirname,
	extname,
	format,
	isAbsolute,
	join,
	normalize,
	parse,
	relative,
	resolve,
	sep,
	toNamespacedPath,
} from "pathe";

import * as pathe from "pathe";

export default pathe;

// Compat: some code accesses path.posix or path.win32
export const posix = pathe;
export const win32 = pathe;
