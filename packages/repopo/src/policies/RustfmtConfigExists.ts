import { existsSync } from "node:fs";
import path from "pathe";
import type { FilePolicyDefinition } from "../policy.js";
/**
 * Configuration for the RustfmtConfigExists policy.
 *
 * @public
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
 * @public
 */
export const RustfmtConfigExists = {
	name: "RustfmtConfigExists",
	description:
		"Ensures a rustfmt.toml file exists for consistent Rust formatting.",
	// Trigger on Cargo.toml to check once per project
	match: /^Cargo\.toml$/,
	handler: async ({ root, config }) => {
		const names = config?.acceptedNames ?? DEFAULT_NAMES;
		const hasConfig = names.some((name) => existsSync(path.join(root, name)));

		if (hasConfig) {
			return [];
		}
		return [
			{
				message: `No rustfmt config found. Expected one of: ${names.join(", ")}`,
				manualFix: "Create a rustfmt.toml file to configure Rust formatting.",
			},
		];
	},
} satisfies FilePolicyDefinition<RustfmtConfigExistsConfig>;
