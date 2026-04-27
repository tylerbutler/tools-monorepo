import { existsSync } from "node:fs";
import path from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the RustDocExists policy.
 *
 * @alpha
 */
export interface RustDocExistsConfig {
	/**
	 * Files that must exist alongside the Cargo.toml.
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
 * A policy that validates documentation files exist for Rust crates.
 *
 * @alpha
 */
export const RustDocExists: PolicyShape<RustDocExistsConfig> =
	defineCargoPolicy({
		name: "RustDocExists",
		description:
			"Validates that documentation files (README.md, etc.) exist for Rust crates.",
		handler: async (toml: CargoToml, { file, root, config }) => {
			// Skip workspace root
			if (toml.workspace !== undefined && toml.package === undefined) {
				return true;
			}

			const dir = path.dirname(path.resolve(root, file));
			const required = config?.required ?? DEFAULT_REQUIRED;
			const recommended = config?.recommended ?? [];

			const missingRequired: string[] = [];
			const missingRecommended: string[] = [];

			for (const fileName of required) {
				if (!existsSync(path.join(dir, fileName))) {
					missingRequired.push(fileName);
				}
			}

			for (const fileName of recommended) {
				if (!existsSync(path.join(dir, fileName))) {
					missingRecommended.push(fileName);
				}
			}

			const errors: string[] = [];
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
						"Create the missing documentation files alongside Cargo.toml.",
				};
			}

			return true;
		},
	});
