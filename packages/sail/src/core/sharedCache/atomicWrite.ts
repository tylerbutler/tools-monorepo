/*!
 * Atomic file write utilities for crash-safe cache operations.
 *
 * Ported from FluidFramework build-tools.
 */

import { randomBytes } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import * as path from "pathe";
import registerDebug from "debug";

const traceAtomicWrite = registerDebug("sail:cache:atomicwrite");

/**
 * Atomically write data to a file using temp-file-and-rename pattern.
 *
 * Steps:
 * 1. Write to a temporary file in the same directory
 * 2. Rename the temp file to the target path (atomic on POSIX)
 *
 * This prevents partial writes and ensures crash safety.
 *
 * @param targetPath - The final path where the file should be written
 * @param data - The data to write (string or Buffer)
 * @param encoding - Text encoding (only used if data is a string)
 */
export async function atomicWrite(
	targetPath: string,
	data: string | Buffer,
	encoding: BufferEncoding = "utf8",
): Promise<void> {
	// Ensure parent directory exists
	const parentDir = path.dirname(targetPath);
	await mkdir(parentDir, { recursive: true });

	// Generate unique temporary filename in same directory
	const tempPath = path.join(
		parentDir,
		`.tmp-${randomBytes(8).toString("hex")}`,
	);

	try {
		// Write to temporary file
		if (typeof data === "string") {
			await writeFile(tempPath, data, encoding);
		} else {
			await writeFile(tempPath, data);
		}

		// Atomically rename temp file to target
		// DEBUG: Log before rename
		const targetBasename = path.basename(targetPath);
		if (targetBasename === "manifest.json") {
			const { existsSync } = await import("node:fs");
			const beforeExists = existsSync(targetPath);
			traceAtomicWrite(`BEFORE rename: ${targetPath} exists=%s`, beforeExists);
		}

		await rename(tempPath, targetPath);

		// DEBUG: Log after rename
		if (targetBasename === "manifest.json") {
			const { existsSync } = await import("node:fs");
			const afterExists = existsSync(targetPath);
			traceAtomicWrite(`AFTER rename: ${targetPath} exists=%s`, afterExists);
		}
	} catch (error) {
		// Clean up temp file if write failed
		try {
			await unlink(tempPath);
		} catch {
			// Ignore cleanup errors
		}
		throw error;
	}
}

/**
 * Atomically write JSON data to a file with pretty formatting.
 *
 * @param targetPath - The final path where the JSON file should be written
 * @param data - The data to serialize to JSON
 * @param pretty - Whether to pretty-print the JSON
 */
export async function atomicWriteJson(
	targetPath: string,
	data: unknown,
	pretty = true,
): Promise<void> {
	const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
	await atomicWrite(targetPath, json, "utf8");
}
