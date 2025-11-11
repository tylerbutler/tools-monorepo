import * as path from "node:path";

/**
 * Traverses up the directory tree from the given starting directory, applying the callback function to each directory.
 * If the callback returns `true` for any directory, that directory path is returned. If the root directory is reached
 * without the callback returning true, the function returns `undefined`.
 *
 * @param dir - The starting directory.
 * @param callback - A function that will be called for each path. If this function returns true, then the current path
 * will be returned.
 * @returns The first path for which the callback function returns true, or `undefined` if the root path is reached
 * without the callback returning `true`.
 */
export function lookUpDirSync(
	dir: string,
	callback: (currentDir: string) => boolean,
): string | undefined {
	let curr = path.resolve(dir);
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (callback(curr)) {
			return curr;
		}

		const up = path.resolve(curr, "..");
		if (up === curr) {
			break;
		}
		curr = up;
	}

	return undefined;
}

/**
 * Determines if a path is under a parent path.
 * @param parent - The parent path.
 * @param maybeChild - The child path.
 * @returns `true` if the child is under the parent path, `false` otherwise.
 */
export function isPathUnder(parent: string, maybeChild: string): boolean {
	const resolvedPathA = path.resolve(parent);
	const resolvedPathB = path.resolve(maybeChild);

	// Handle root directory specially - root with separator is still root on Unix
	const separator = resolvedPathA === path.sep ? "" : path.sep;
	return resolvedPathB.startsWith(resolvedPathA + separator);
}
