import { existsSync } from "node:fs";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";

/**
 * Configuration for the RustfmtConfigExists policy.
 *
 * @alpha
 */
export interface RustfmtConfigExistsConfig {
	/**
	 * Accepted file names for the rustfmt config.
	 * @defaultValue ["rustfmt.toml", ".rustfmt.toml"]
	 */
	acceptedNames?: string[];
}

const DEFAULT_NAMES = ["rustfmt.toml", ".rustfmt.toml"];

/**
 * A policy that requires a rustfmt.toml file for consistent Rust formatting.
 *
 * @alpha
 */
export const RustfmtConfigExists: PolicyDefinition<RustfmtConfigExistsConfig> =
	makePolicyDefinition({
		name: "RustfmtConfigExists",
		description:
			"Ensures a rustfmt.toml file exists for consistent Rust formatting.",
		// Trigger on Cargo.toml to check once per project
		match: /^Cargo\.toml$/,
		handler: async ({ root, config }) => {
			const names = config?.acceptedNames ?? DEFAULT_NAMES;
			const hasConfig = names.some((name) => existsSync(path.join(root, name)));

			if (hasConfig) {
				return true;
			}

			return {
				error: `No rustfmt config found. Expected one of: ${names.join(", ")}`,
				manualFix: "Create a rustfmt.toml file to configure Rust formatting.",
			};
		},
	});
