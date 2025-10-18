/**
 * Module for managing nx configuration file operations
 */

import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Logger } from "@tylerbu/cli-api";

/**
 * Copy nx configuration files from templates to repo root
 */
export async function copyNxConfigFiles(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	// Templates are embedded in the compiled output
	const templatesDir = join(
		dirname(new URL(import.meta.url).pathname),
		"templates",
	);
	const nxJsonSource = join(templatesDir, "nx.json");
	const nxJsonDest = join(repoRoot, "nx.json");

	logger.verbose("📋 Copying nx.json configuration...");

	// Check if nx.json already exists
	try {
		await access(nxJsonDest);
		logger.verbose("  ⚠️  nx.json already exists, skipping");
		return;
	} catch {
		// File doesn't exist, continue with copy
	}

	// Copy nx.json
	let content: string;
	try {
		content = await readFile(nxJsonSource, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to read nx.json template at ${nxJsonSource}. ` +
				"This may indicate the package was not built correctly. " +
				`Original error: ${message}`,
		);
	}

	await writeFile(nxJsonDest, content, "utf-8");

	logger.verbose("  ✅ nx.json created");
}

/**
 * Check if nx configuration is already applied
 */
export async function isNxConfigured(repoRoot: string): Promise<boolean> {
	const nxJsonPath = join(repoRoot, "nx.json");

	try {
		await access(nxJsonPath);
		return true;
	} catch {
		return false;
	}
}
