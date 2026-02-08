import type { PackageJson } from "type-fest";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Configuration for the MutuallyExclusiveScripts policy.
 *
 * @alpha
 */
export interface MutuallyExclusiveScriptsConfig {
	/**
	 * List of mutually exclusive script groups. Each group is an array of script names
	 * where at most one script from the group can be present.
	 *
	 * Packages can have zero scripts from the group (all optional), but cannot have
	 * multiple scripts from the same group.
	 *
	 * @example
	 * ```typescript
	 * // Allow "test:unit" OR "test:vitest" OR neither, but not both
	 * groups: [["test:unit", "test:vitest"]]
	 * ```
	 */
	groups: string[][];
}

const POLICY_NAME = "MutuallyExclusiveScripts";

/**
 * A policy that validates mutually exclusive script groups in package.json.
 *
 * @remarks
 * Use this policy when you want to enforce that only one script from a group
 * can exist in a package. This is useful for ensuring that packages don't have
 * conflicting scripts (e.g., both "lint:eslint" and "lint:biome").
 *
 * @example
 * ```typescript
 * import { policy } from "repopo";
 * import { MutuallyExclusiveScripts } from "repopo/policies";
 *
 * policy(MutuallyExclusiveScripts, {
 *   groups: [
 *     ["lint:eslint", "lint:biome"],
 *     ["test:jest", "test:vitest"],
 *   ],
 * })
 * ```
 *
 * @alpha
 */
export const MutuallyExclusiveScripts = definePackagePolicy<
	PackageJson,
	MutuallyExclusiveScriptsConfig | undefined
>({
	name: POLICY_NAME,
	description:
		"Validates that at most one script from each exclusive group exists in package.json.",
	handler: async (json, { file, config }) => {
		if (config === undefined || config.groups.length === 0) {
			return true;
		}

		const scripts = json.scripts ?? {};
		const errors: string[] = [];

		for (const group of config.groups) {
			const presentScripts = group.filter((scriptName) =>
				Object.hasOwn(scripts, scriptName),
			);

			if (presentScripts.length > 1) {
				errors.push(
					`Scripts are mutually exclusive, but found ${presentScripts.length}: ${presentScripts.join(", ")}`,
				);
			}
		}

		if (errors.length === 0) {
			return true;
		}

		return {
			name: POLICY_NAME,
			file,
			autoFixable: false,
			errorMessages: errors,
		};
	},
});
