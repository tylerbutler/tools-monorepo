/**
 * Module for managing nx configuration file operations
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Copy nx configuration files from templates to repo root
 */
export async function copyNxConfigFiles(repoRoot: string): Promise<void> {
	// Templates are embedded in the compiled output
	const templatesDir = path.join(
		path.dirname(new URL(import.meta.url).pathname),
		"templates",
	);
	const nxJsonSource = path.join(templatesDir, "nx.json");
	const nxJsonDest = path.join(repoRoot, "nx.json");

	console.log("📋 Copying nx.json configuration...");

	// Check if nx.json already exists
	try {
		await fs.access(nxJsonDest);
		console.log("  ⚠️  nx.json already exists, skipping");
		return;
	} catch {
		// File doesn't exist, continue with copy
	}

	// Copy nx.json
	const content = await fs.readFile(nxJsonSource, "utf-8");
	await fs.writeFile(nxJsonDest, content, "utf-8");

	console.log("  ✅ nx.json created");
}

/**
 * Check if nx configuration is already applied
 */
export async function isNxConfigured(repoRoot: string): Promise<boolean> {
	const nxJsonPath = path.join(repoRoot, "nx.json");

	try {
		await fs.access(nxJsonPath);
		return true;
	} catch {
		return false;
	}
}
