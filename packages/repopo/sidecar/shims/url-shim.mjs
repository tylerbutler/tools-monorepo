/** URL parsing, resolution and file-path conversion use the Rust host's url crate. */
export const URL = globalThis.URL;

export function fileURLToPath(value) {
	if (!(typeof value === "string" || value instanceof URL)) {
		throw new TypeError("Expected a file URL string or URL");
	}
	return globalThis.__url_fileToPath(String(value));
}

export function pathToFileURL(path) {
	if (typeof path !== "string")
		throw new TypeError("Expected a filesystem path");
	return new URL(globalThis.__url_pathToFile(path));
}

export default { URL, fileURLToPath, pathToFileURL };
