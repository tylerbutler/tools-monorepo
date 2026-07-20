import type { Operation } from "effection";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition, PolicyFailure } from "../policy.js";

/**
 * Build output extensions and directory patterns that should not be committed.
 */
const BUILD_DIR_REGEX = /(?:^|\/)(build)\//;

/**
 * A policy that prevents accidental commits of build directory contents.
 * Applies to Gleam's `build/` output directory.
 *
 * @alpha
 */
export const NoBuildDirectory: PolicyDefinition = makePolicyDefinition({
	name: "NoBuildDirectory",
	description:
		"Prevents accidental commits of build directory contents (Gleam build/ output).",
	match: BUILD_DIR_REGEX,
	// biome-ignore lint/correctness/useYield: no yield needed
	handler: function* ({ file }): Operation<PolicyFailure> {
		return {
			name: NoBuildDirectory.name,
			file,
			autoFixable: false,
			errorMessages: [
				`Build artifact detected in build/ directory: ${file}. The build/ directory should be in .gitignore.`,
			],
			manualFix:
				"Remove the build/ directory from source control and add it to .gitignore.",
		};
	},
});
