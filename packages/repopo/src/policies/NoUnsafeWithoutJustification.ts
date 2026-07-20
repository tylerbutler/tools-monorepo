import { readFile } from "node:fs/promises";
import { resolve } from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";

/**
 * Configuration for the NoUnsafeWithoutJustification policy.
 *
 * @alpha
 */
export interface NoUnsafeWithoutJustificationConfig {
	/**
	 * The comment prefix to look for before unsafe blocks.
	 * @defaultValue "// SAFETY:"
	 */
	requireComment?: string;

	/**
	 * Paths to exclude from this check (e.g., FFI modules).
	 */
	excludePaths?: string[];
}

const UNSAFE_PATTERN = /\bunsafe\s*\{|\bunsafe\s+fn\b|\bunsafe\s+impl\b/;

/**
 * Check whether the lines preceding an unsafe block contain the required safety comment.
 */
function hasJustificationComment(
	lines: string[],
	lineIndex: number,
	requiredComment: string,
): boolean {
	for (let j = lineIndex - 1; j >= Math.max(0, lineIndex - 5); j--) {
		const prevLine = lines[j];
		if (prevLine === undefined) {
			continue;
		}
		const trimmedPrev = prevLine.trim();
		if (trimmedPrev === "") {
			continue;
		}
		if (trimmedPrev.toUpperCase().includes(requiredComment.toUpperCase())) {
			return true;
		}
		// Stop if we hit a non-comment, non-attribute line
		if (!(trimmedPrev.startsWith("//") || trimmedPrev.startsWith("#["))) {
			break;
		}
	}
	return false;
}

/**
 * Check if a file path should be excluded from the unsafe check.
 */
function isExcluded(file: string, excludePaths: string[] | undefined): boolean {
	if (!excludePaths) {
		return false;
	}
	for (const excludePath of excludePaths) {
		if (file.includes(excludePath)) {
			return true;
		}
	}
	return false;
}

/**
 * A policy that requires SAFETY comments on unsafe blocks in Rust source files.
 *
 * @alpha
 */
export const NoUnsafeWithoutJustification: PolicyDefinition<NoUnsafeWithoutJustificationConfig> =
	makePolicyDefinition({
		name: "NoUnsafeWithoutJustification",
		description:
			"Requires safety justification comments on unsafe blocks in Rust source files.",
		match: /\.rs$/,
		handler: async ({ file, root, config }) => {
			const requiredComment = config?.requireComment ?? "// SAFETY:";

			if (isExcluded(file, config?.excludePaths)) {
				return true;
			}

			const content = await readFile(resolve(root, file), "utf-8");
			const lines = content.split("\n");
			const violations: string[] = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line === undefined) {
					continue;
				}
				const trimmed = line.trim();

				// Look for `unsafe` keyword usage (blocks, functions, impls)
				if (
					UNSAFE_PATTERN.test(trimmed) &&
					!hasJustificationComment(lines, i, requiredComment)
				) {
					violations.push(
						`Line ${i + 1}: unsafe block without ${requiredComment} comment`,
					);
				}
			}

			if (violations.length > 0) {
				return {
					error: violations.join("; "),
					manualFix: `Add a "${requiredComment}" comment above each unsafe block explaining why it is safe.`,
				};
			}

			return true;
		},
	});
