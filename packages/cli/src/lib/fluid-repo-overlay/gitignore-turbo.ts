/**
 * Module for updating .gitignore for turbo
 */

import { readFile, writeFile } from "node:fs/promises";
import type { Logger } from "@tylerbu/cli-api";
import { join } from "pathe";

const TURBO_GITIGNORE_ENTRIES = ["", ".turbo"];

/**
 * Update .gitignore with turbo-related entries
 */
export async function updateGitignoreForTurbo(
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

	// Check if turbo entries already exist
	if (lines.some((line) => line.trim() === ".turbo")) {
		logger.verbose("  ℹ️  turbo entries already in .gitignore");
		return;
	}

	// Add turbo entries
	const updatedContent = `${content.trimEnd()}\n${TURBO_GITIGNORE_ENTRIES.join("\n")}\n`;

	await writeFile(gitignorePath, updatedContent, "utf-8");

	logger.verbose("  ✅ .gitignore updated with turbo entries");
}

/**
 * Check if .gitignore needs turbo updates
 */
export async function needsGitignoreUpdateForTurbo(
	repoRoot: string,
): Promise<boolean> {
	const gitignorePath = join(repoRoot, ".gitignore");

	try {
		const content = await readFile(gitignorePath, "utf-8");
		const lines = content.split("\n");

		// Check if any turbo entry exists
		return !lines.some((line) => line.trim() === ".turbo");
	} catch {
		return false;
	}
}
