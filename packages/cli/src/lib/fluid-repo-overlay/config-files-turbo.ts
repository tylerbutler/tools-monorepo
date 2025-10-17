/**
 * Module for managing turbo configuration file operations
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Copy turbo configuration files from templates to repo root
 */
export async function copyTurboConfigFiles(repoRoot: string): Promise<void> {
	// Templates are embedded in the compiled output
	const templatesDir = path.join(
		path.dirname(new URL(import.meta.url).pathname),
		"templates",
	);
	const turboJsonSource = path.join(templatesDir, "turbo.jsonc");
	const turboJsonDest = path.join(repoRoot, "turbo.jsonc");

	console.log("📋 Copying turbo.jsonc configuration...");

	// Check if turbo.jsonc already exists
	try {
		await fs.access(turboJsonDest);
		console.log("  ⚠️  turbo.jsonc already exists, skipping");
		return;
	} catch {
		// File doesn't exist, continue with copy
	}

	// Copy turbo.jsonc
	const content = await fs.readFile(turboJsonSource, "utf-8");
	await fs.writeFile(turboJsonDest, content, "utf-8");

	console.log("  ✅ turbo.jsonc created");
}

/**
 * Check if turbo configuration is already applied
 */
export async function isTurboConfigured(repoRoot: string): Promise<boolean> {
	const turboJsonPath = path.join(repoRoot, "turbo.jsonc");

	try {
		await fs.access(turboJsonPath);
		return true;
	} catch {
		return false;
	}
}
