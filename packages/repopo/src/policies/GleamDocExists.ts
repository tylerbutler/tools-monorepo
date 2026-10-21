import { existsSync } from "node:fs";
import path from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamDocExists policy.
 *
 * @alpha
 */
export interface GleamDocExistsConfig {
	/**
	 * Files that must exist alongside the gleam.toml.
	 * @defaultValue ["README.md"]
	 */
	required?: string[];

	/**
	 * Files that are recommended but not required. Missing ones produce warnings.
	 */
	recommended?: string[];
}

const DEFAULT_REQUIRED = ["README.md"];

/**
 * A policy that validates documentation files exist for Gleam packages.
 *
 * @alpha
 */
export const GleamDocExists: PolicyShape<GleamDocExistsConfig> =
	defineGleamPolicy({
		name: "GleamDocExists",
		description:
			"Validates that documentation files (README.md, etc.) exist for Gleam packages.",
		handler: async (toml: GleamToml, { file, root, config }) => {
			// Skip if the package looks like it's not for publishing
			if (!(toml.description || toml.licences)) {
				return true;
			}

			const dir = path.dirname(path.resolve(root, file));
			const required = config?.required ?? DEFAULT_REQUIRED;
			const recommended = config?.recommended ?? [];
			const errors: string[] = [];

			const missingRequired = required.filter(
				(f) => !existsSync(path.join(dir, f)),
			);
			const missingRecommended = recommended.filter(
				(f) => !existsSync(path.join(dir, f)),
			);

			if (missingRequired.length > 0) {
				errors.push(
					`Missing required documentation: ${missingRequired.join(", ")}`,
				);
			}
			if (missingRecommended.length > 0) {
				errors.push(
					`Missing recommended documentation: ${missingRecommended.join(", ")}`,
				);
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Create the missing documentation files alongside gleam.toml.",
				};
			}

			return true;
		},
	});
