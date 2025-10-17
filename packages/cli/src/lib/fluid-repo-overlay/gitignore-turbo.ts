/**
 * Module for updating .gitignore for turbo
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const TURBO_GITIGNORE_ENTRIES = [
	"",
	".turbo",
];

/**
 * Update .gitignore with turbo-related entries
 */
export async function updateGitignoreForTurbo(repoRoot: string): Promise<void> {
	const gitignorePath = path.join(repoRoot, ".gitignore");

	console.log("📝 Updating .gitignore...");

	let content: string;
	try {
		content = await fs.readFile(gitignorePath, "utf-8");
	} catch {
		console.log("  ⚠️  .gitignore not found");
		return;
	}

	const lines = content.split("\n");

	// Check if turbo entries already exist
	if (lines.some((line) => line.trim() === ".turbo")) {
		console.log("  ℹ️  turbo entries already in .gitignore");
		return;
	}

	// Add turbo entries
	const updatedContent =
		content.trimEnd() + "\n" + TURBO_GITIGNORE_ENTRIES.join("\n") + "\n";

	await fs.writeFile(gitignorePath, updatedContent, "utf-8");

	console.log("  ✅ .gitignore updated with turbo entries");
}

/**
 * Check if .gitignore needs turbo updates
 */
export async function needsGitignoreUpdateForTurbo(repoRoot: string): Promise<boolean> {
	const gitignorePath = path.join(repoRoot, ".gitignore");

	try {
		const content = await fs.readFile(gitignorePath, "utf-8");
		const lines = content.split("\n");

		// Check if any turbo entry exists
		return !lines.some((line) => line.trim() === ".turbo");
	} catch {
		return false;
	}
}
