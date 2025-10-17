/**
 * Module for updating .gitignore for nx
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const NX_GITIGNORE_ENTRIES = [
	"",
	".nx/cache",
	".nx/workspace-data",
	".cursor/rules/nx-rules.mdc",
	".github/instructions/nx.instructions.md",
];

/**
 * Update .gitignore with nx-related entries
 */
export async function updateGitignore(repoRoot: string): Promise<void> {
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

	// Check if nx entries already exist
	if (lines.some((line) => line.trim() === ".nx/cache")) {
		console.log("  ℹ️  nx entries already in .gitignore");
		return;
	}

	// Add nx entries
	const updatedContent =
		content.trimEnd() + "\n" + NX_GITIGNORE_ENTRIES.join("\n") + "\n";

	await fs.writeFile(gitignorePath, updatedContent, "utf-8");

	console.log("  ✅ .gitignore updated with nx entries");
}

/**
 * Check if .gitignore needs nx updates
 */
export async function needsGitignoreUpdate(repoRoot: string): Promise<boolean> {
	const gitignorePath = path.join(repoRoot, ".gitignore");

	try {
		const content = await fs.readFile(gitignorePath, "utf-8");
		const lines = content.split("\n");

		// Check if any nx entry exists
		return !lines.some((line) => line.trim() === ".nx/cache");
	} catch {
		return false;
	}
}
