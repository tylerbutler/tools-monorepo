/**
 * Module for updating .gitignore for nx
 */

import { readFile, writeFile } from "node:fs/promises";
import type { Logger } from "@tylerbu/cli-api";
import { join } from "pathe";

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
export async function updateGitignore(
	repoRoot: string,
	logger: Logger,
): Promise<void> {
	const gitignorePath = join(repoRoot, ".gitignore");

	logger.verbose("📝 Updating .gitignore...");

	let content: string;
	try {
		content = await readFile(gitignorePath, "utf-8");
	} catch {
		logger.verbose("  ⚠️  .gitignore not found");
		return;
	}

	const lines = content.split("\n");

	// Check if nx entries already exist
	if (lines.some((line) => line.trim() === ".nx/cache")) {
		logger.verbose("  ℹ️  nx entries already in .gitignore");
		return;
	}

	// Add nx entries
	const updatedContent = `${content.trimEnd()}\n${NX_GITIGNORE_ENTRIES.join("\n")}\n`;

	await writeFile(gitignorePath, updatedContent, "utf-8");

	logger.verbose("  ✅ .gitignore updated with nx entries");
}

/**
 * Check if .gitignore needs nx updates
 */
export async function needsGitignoreUpdate(repoRoot: string): Promise<boolean> {
	const gitignorePath = join(repoRoot, ".gitignore");

	try {
		const content = await readFile(gitignorePath, "utf-8");
		const lines = content.split("\n");

		// Check if any nx entry exists
		return !lines.some((line) => line.trim() === ".nx/cache");
	} catch {
		return false;
	}
}
