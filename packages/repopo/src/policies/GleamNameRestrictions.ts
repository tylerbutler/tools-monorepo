import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamNameRestrictions policy.
 *
 * @alpha
 */
export interface GleamNameRestrictionsConfig {
	/**
	 * Prefixes that are denied for package names.
	 * @defaultValue ["gleam_"]
	 */
	denyPrefixes?: string[];

	/**
	 * If true, require snake_case naming.
	 * @defaultValue true
	 */
	requireSnakeCase?: boolean;
}

const DEFAULT_DENY_PREFIXES = ["gleam_"];
const SNAKE_CASE_REGEX = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

function checkDeniedPrefixes(
	name: string,
	prefixes: string[],
): string | undefined {
	for (const prefix of prefixes) {
		if (name.startsWith(prefix)) {
			return `Package name "${name}" uses reserved prefix "${prefix}". The "gleam_" prefix is reserved for official Gleam packages.`;
		}
	}
	return undefined;
}

/**
 * A policy that enforces naming conventions for Gleam packages.
 *
 * @alpha
 */
export const GleamNameRestrictions: PolicyShape<GleamNameRestrictionsConfig> =
	defineGleamPolicy({
		name: "GleamNameRestrictions",
		description:
			'Enforces Gleam package naming conventions: no "gleam_" prefix, snake_case required.',
		handler: async (toml: GleamToml, { config }) => {
			const name = toml.name as string | undefined;
			if (!name) {
				return true;
			}

			const errors: string[] = [];
			const denyPrefixes = config?.denyPrefixes ?? DEFAULT_DENY_PREFIXES;
			const requireSnakeCase = config?.requireSnakeCase ?? true;

			const prefixError = checkDeniedPrefixes(name, denyPrefixes);
			if (prefixError) {
				errors.push(prefixError);
			}

			if (requireSnakeCase && !SNAKE_CASE_REGEX.test(name)) {
				errors.push(
					`Package name "${name}" is not snake_case. Gleam package names should use lowercase letters, digits, and underscores.`,
				);
			}

			if (errors.length > 0) {
				return {
					error: errors.join("; "),
					manualFix:
						"Rename the package to follow Gleam naming conventions (snake_case, no gleam_ prefix).",
				};
			}

			return true;
		},
	});
