import { existsSync } from "node:fs";
import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type { PolicyDefinition } from "../policy.js";

/**
 * Configuration for the RustToolchainExists policy.
 *
 * @alpha
 */
export interface RustToolchainExistsConfig {
	/**
	 * Accepted file names for the toolchain file.
	 * @defaultValue ["rust-toolchain.toml", "rust-toolchain"]
	 */
	acceptedNames?: string[];
}

const DEFAULT_NAMES = ["rust-toolchain.toml", "rust-toolchain"];

/**
 * A policy that requires a rust-toolchain.toml file for reproducible Rust builds.
 *
 * @alpha
 */
export const RustToolchainExists: PolicyDefinition<RustToolchainExistsConfig> =
	makePolicyDefinition({
		name: "RustToolchainExists",
		description:
			"Ensures a rust-toolchain.toml file exists for reproducible Rust builds.",
		// Trigger on Cargo.toml to check once per project
		match: /^Cargo\.toml$/,
		handler: async ({ root, config }) => {
			const names = config?.acceptedNames ?? DEFAULT_NAMES;
			const hasToolchain = names.some((name) =>
				existsSync(path.join(root, name)),
			);

			if (hasToolchain) {
				return true;
			}

			return {
				error: `No rust-toolchain file found. Expected one of: ${names.join(", ")}`,
				manualFix:
					"Create a rust-toolchain.toml file specifying the Rust toolchain version.",
			};
		},
	});
