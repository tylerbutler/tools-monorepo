/**
 * Module for managing turbo configuration file operations
 */

import { access, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Logger } from "@tylerbu/cli-api";
import { dirname, join } from "pathe";

/**
 * Copy turbo configuration files from templates to repo root
 */
export async function copyTurboConfigFiles(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	// Templates are embedded in the compiled output
	const templatesDir = join(
		dirname(fileURLToPath(import.meta.url)),
		"templates",
	);
	const turboJsonSource = join(templatesDir, "turbo.jsonc");
	const turboJsonDest = join(repoRoot, "turbo.jsonc");

	logger.verbose("📋 Copying turbo.jsonc configuration...");

	// Check if turbo.jsonc already exists
	try {
		await access(turboJsonDest);
		logger.verbose("  ⚠️  turbo.jsonc already exists, skipping");
		return;
	} catch {
		// File doesn't exist, continue with copy
	}

	// Copy turbo.jsonc
	let content: string;
	try {
		content = await readFile(turboJsonSource, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to read turbo.jsonc template at ${turboJsonSource}. ` +
				"This may indicate the package was not built correctly. " +
				`Original error: ${message}`,
		);
	}

	await writeFile(turboJsonDest, content, "utf-8");

	logger.verbose("  ✅ turbo.jsonc created");
}

/**
 * Check if turbo configuration is already applied
 */
export async function isTurboConfigured(repoRoot: string): Promise<boolean> {
	const turboJsonPath = join(repoRoot, "turbo.jsonc");

	try {
		await access(turboJsonPath);
		return true;
	} catch {
		return false;
	}
}
