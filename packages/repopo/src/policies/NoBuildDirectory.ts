import type { Operation } from "effection";
import type { FilePolicyDefinition, PolicyFinding } from "../policy.js";

/**
 * Build output extensions and directory patterns that should not be committed.
 */
const BUILD_DIR_REGEX = /(?:^|\/)(build)\//;

/**
 * A policy that prevents accidental commits of build directory contents.
 * Applies to Gleam's `build/` output directory.
 *
 * @public
 */
export const NoBuildDirectory = {
	name: "NoBuildDirectory",
	description:
		"Prevents accidental commits of build directory contents (Gleam build/ output).",
	match: BUILD_DIR_REGEX,
	handler: function* ({ file }): Operation<PolicyFinding[]> {
		return [
			`Build artifact detected in build/ directory: ${file}. The build/ directory should be in .gitignore.`,
		].map((message) => ({
			message,
			manualFix:
				"Remove the build/ directory from source control and add it to .gitignore.",
		}));
	},
} satisfies FilePolicyDefinition;
