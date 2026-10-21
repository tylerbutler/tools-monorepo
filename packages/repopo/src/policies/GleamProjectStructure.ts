import { existsSync } from "node:fs";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";

/**
 * Configuration for the GleamProjectStructure policy.
 *
 * @alpha
 */
export interface GleamProjectStructureConfig {
	/**
	 * If true, require the src/ directory to exist.
	 * @defaultValue true
	 */
	requireSrcDir?: boolean;

	/**
	 * If true, require the test/ directory to exist.
	 * @defaultValue false
	 */
	requireTestDir?: boolean;
}

/**
 * A policy that validates standard Gleam project structure.
 *
 * @alpha
 */
export const GleamProjectStructure: PolicyDefinition<GleamProjectStructureConfig> =
	makePolicyDefinition({
		name: "GleamProjectStructure",
		description:
			"Validates that Gleam projects have the standard directory structure (src/, test/).",
		match: /gleam\.toml$/,
		handler: async ({ file, root, config }) => {
			const dir = path.dirname(path.resolve(root, file));
			const requireSrc = config?.requireSrcDir ?? true;
			const requireTest = config?.requireTestDir ?? false;
			const errors: string[] = [];

			if (requireSrc && !existsSync(path.join(dir, "src"))) {
				errors.push(
					"Missing src/ directory. Gleam projects require a src/ directory for source modules.",
				);
			}

			if (requireTest && !existsSync(path.join(dir, "test"))) {
				errors.push("Missing test/ directory.");
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix: "Create the missing directories in your Gleam project.",
				};
			}

			return true;
		},
	});
