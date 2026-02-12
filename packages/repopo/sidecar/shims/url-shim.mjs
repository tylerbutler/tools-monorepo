/**
 * Minimal node:url shim for QuickJS.
 * Only provides fileURLToPath and pathToFileURL which are commonly used
 * by bundled dependencies (e.g., tinyglobby).
 */

export function fileURLToPath(url) {
	if (typeof url === "string") {
		if (url.startsWith("file://")) {
			return decodeURIComponent(url.slice(7));
		}
		return url;
	}
	if (url && typeof url.pathname === "string") {
		return decodeURIComponent(url.pathname);
	}
	return String(url);
}

export function pathToFileURL(path) {
	return { href: `file://${path}`, pathname: path };
}

export default { fileURLToPath, pathToFileURL };
