import { access } from "node:fs/promises";

/**
 * Check if a file or directory exists.
 *
 * @remarks
 * This is an async replacement for the deprecated `fs.exists()` and synchronous `fs.existsSync()`.
 * It uses `fs.promises.access()` internally to check file accessibility.
 *
 * @param path - The path to check for existence
 * @returns A promise that resolves to `true` if the path exists, `false` otherwise
 *
 * @example
 * ```typescript
 * if (await exists('./myfile.txt')) {
 *   console.log('File exists');
 * }
 * ```
 *
 * @public
 */
export async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
