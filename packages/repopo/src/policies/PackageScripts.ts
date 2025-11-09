import type { PackageJson } from "type-fest";
import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * Policy settings for the PackageScripts repo policy.
 *
 * @alpha
 */
export interface PackageScriptsSettings {
	/**
	 * List of script names that must be present in package.json scripts.
	 */
	must?: string[];

	/**
	 * List of mutually exclusive script groups. Each group is an array of script names,
	 * and exactly one script from each group must be present.
	 *
	 * @example
	 * // Require either "test" or "test:unit", but not both
	 * mutuallyExclusive: [["test", "test:unit"]]
	 */
	mutuallyExclusive?: string[][];
}

/**
 * A RepoPolicy that validates package.json scripts based on configurable rules.
 *
 * @alpha
 */
export const PackageScripts = definePackagePolicy<
	PackageJson,
	PackageScriptsSettings | undefined
>("PackageScripts", async (json, { file, config }) => {
	const failResult: PolicyFailure = {
		name: PackageScripts.name,
		file,
		autoFixable: false,
	};

	if (config === undefined) {
		return true;
	}

	const hasScriptsField = Object.hasOwn(json, "scripts");
	const scripts = hasScriptsField ? json.scripts : {};
	const errorMessages: string[] = [];

	// Validate required scripts
	if (config.must && config.must.length > 0) {
		const missingScripts: string[] = [];
		for (const scriptName of config.must) {
			if (!scripts || !Object.hasOwn(scripts, scriptName)) {
				missingScripts.push(scriptName);
			}
		}

		if (missingScripts.length > 0) {
			errorMessages.push(
				`Missing required scripts:\n\t${missingScripts.join("\n\t")}`,
			);
		}
	}

	// Validate mutually exclusive script groups
	if (config.mutuallyExclusive && config.mutuallyExclusive.length > 0) {
		for (const group of config.mutuallyExclusive) {
			const presentScripts = group.filter(
				(scriptName) => scripts && Object.hasOwn(scripts, scriptName),
			);

			if (presentScripts.length === 0) {
				errorMessages.push(
					`Exactly one of the following scripts must be present: ${group.join(", ")}`,
				);
			} else if (presentScripts.length > 1) {
				errorMessages.push(
					`Only one of the following scripts can be present, but found ${presentScripts.length}: ${presentScripts.join(", ")}`,
				);
			}
		}
	}

	if (errorMessages.length > 0) {
		failResult.errorMessage = errorMessages.join("\n\n");
		return failResult;
	}

	return true;
});
