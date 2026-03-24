import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamTomlRequired policy.
 *
 * @alpha
 */
export interface GleamTomlRequiredConfig {
	/**
	 * Top-level fields that must exist in gleam.toml.
	 * @defaultValue ["name", "version"]
	 */
	required?: string[];

	/**
	 * If true, require the `gleam` compiler version constraint.
	 * @defaultValue false
	 */
	requireGleamVersion?: boolean;

	/**
	 * If true, require the `[repository]` section.
	 * @defaultValue false
	 */
	requireRepository?: boolean;
}

const DEFAULT_REQUIRED_FIELDS = ["name", "version"];

function checkRequiredFields(toml: GleamToml, fields: string[]): string[] {
	const errors: string[] = [];
	for (const field of fields) {
		if (toml[field] === undefined || toml[field] === "") {
			errors.push(`Missing required field: ${field}`);
		}
	}
	return errors;
}

/**
 * A policy that enforces required fields exist in gleam.toml.
 *
 * @alpha
 */
export const GleamTomlRequired: PolicyShape<GleamTomlRequiredConfig> =
	defineGleamPolicy({
		name: "GleamTomlRequired",
		description:
			"Ensures gleam.toml files contain required fields for proper project configuration.",
		handler: async (toml: GleamToml, { config }) => {
			const errors = checkRequiredFields(
				toml,
				config?.required ?? DEFAULT_REQUIRED_FIELDS,
			);

			if (config?.requireGleamVersion && toml.gleam === undefined) {
				errors.push(
					'Missing gleam version constraint. Add gleam = ">= x.y.z" to gleam.toml.',
				);
			}

			if (config?.requireRepository && toml.repository === undefined) {
				errors.push("Missing [repository] section in gleam.toml.");
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix: "Add the missing fields to your gleam.toml file.",
				};
			}

			return true;
		},
	});
