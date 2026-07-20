import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the PublicApiDocumented policy.
 *
 * @alpha
 */
export interface PublicApiDocumentedConfig {
	/**
	 * If true, check for `#![deny(missing_docs)]` directive via [lints.rust] in Cargo.toml.
	 * @defaultValue true
	 */
	checkCargoLints?: boolean;
}

/**
 * A policy that ensures public API documentation is enforced in Rust crates
 * via the `missing_docs` lint configured in Cargo.toml.
 *
 * @alpha
 */
export const PublicApiDocumented: PolicyShape<PublicApiDocumentedConfig> =
	defineCargoPolicy({
		name: "PublicApiDocumented",
		description:
			"Ensures the missing_docs lint is configured in Cargo.toml to enforce public API documentation.",
		handler: async (toml: CargoToml, { config }) => {
			// Skip workspace root
			if (toml.workspace !== undefined && toml.package === undefined) {
				return true;
			}

			const checkCargoLints = config?.checkCargoLints ?? true;

			if (checkCargoLints) {
				const lints = toml.lints as Record<string, unknown> | undefined;
				const rustLints = lints?.rust as Record<string, unknown> | undefined;

				if (rustLints) {
					const missingDocs =
						rustLints.missing_docs ?? rustLints["missing-docs"];
					if (
						missingDocs === "deny" ||
						missingDocs === "warn" ||
						missingDocs === "forbid"
					) {
						return true;
					}
				}

				return {
					error:
						'missing_docs lint is not configured. Set [lints.rust] missing_docs = "warn" or "deny" in Cargo.toml.',
					manualFix: 'Add to Cargo.toml:\n[lints.rust]\nmissing_docs = "warn"',
				};
			}

			return true;
		},
	});
