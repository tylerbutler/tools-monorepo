import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamInternalModulesConfigured policy.
 *
 * @alpha
 */
export interface GleamInternalModulesConfiguredConfig {
	/**
	 * If true, suggest common internal_modules patterns when the field is missing.
	 * @defaultValue true
	 */
	suggestPatterns?: boolean;
}

/**
 * A policy that ensures `internal_modules` is configured in gleam.toml
 * to hide implementation details from generated documentation.
 *
 * @alpha
 */
export const GleamInternalModulesConfigured: PolicyShape<GleamInternalModulesConfiguredConfig> =
	defineGleamPolicy({
		name: "GleamInternalModulesConfigured",
		description:
			"Ensures internal_modules is configured in gleam.toml to hide implementation details from docs.",
		handler: async (toml: GleamToml, { config }) => {
			const internalModules = toml.internal_modules as string[] | undefined;

			if (
				internalModules !== undefined &&
				Array.isArray(internalModules) &&
				internalModules.length > 0
			) {
				return true;
			}

			const name = toml.name as string | undefined;
			const suggestPatterns = config?.suggestPatterns ?? true;

			let manualFix =
				"Add an internal_modules field to gleam.toml to hide implementation details from docs.";
			if (suggestPatterns && name) {
				manualFix = `Add to gleam.toml:\ninternal_modules = ["${name}/internal", "${name}/internal/*"]`;
			}

			return {
				error:
					"Missing internal_modules configuration in gleam.toml. Published packages should hide internal modules from documentation.",
				manualFix,
			};
		},
	});
