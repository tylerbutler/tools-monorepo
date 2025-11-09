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
	 * List of mutually exclusive script groups. Each group is an array of script names
	 * where at most one script from the group can be present.
	 *
	 * Packages can have zero scripts from the group (all optional), but cannot have
	 * multiple scripts from the same group.
	 *
	 * @example
	 * // Allow "test:unit" OR "test:vitest" OR neither, but not both
	 * mutuallyExclusive: [["test:unit", "test:vitest"]]
	 */
	mutuallyExclusive?: string[][];
}

/**
 * Validates required scripts and returns error messages for missing scripts.
 */
function validateRequiredScripts(
	must: string[],
	scripts: PackageJson["scripts"],
): string[] {
	const missingScripts: string[] = [];
	for (const scriptName of must) {
		if (!(scripts && Object.hasOwn(scripts, scriptName))) {
			missingScripts.push(scriptName);
		}
	}

	if (missingScripts.length > 0) {
		return [`Missing required scripts:\n\t${missingScripts.join("\n\t")}`];
	}

	return [];
}

/**
 * Validates mutually exclusive script groups and returns error messages for violations.
 */
function validateMutuallyExclusiveScripts(
	groups: string[][],
	scripts: PackageJson["scripts"],
): string[] {
	const errors: string[] = [];

	for (const group of groups) {
		const presentScripts = group.filter(
			(scriptName) => scripts && Object.hasOwn(scripts, scriptName),
		);

		// Only fail if MORE than one script from the group is present
		if (presentScripts.length > 1) {
			errors.push(
				`Scripts are mutually exclusive, but found ${presentScripts.length}: ${presentScripts.join(", ")}`,
			);
		}
	}

	return errors;
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
		errorMessages.push(...validateRequiredScripts(config.must, scripts));
	}

	// Validate mutually exclusive script groups
	if (config.mutuallyExclusive && config.mutuallyExclusive.length > 0) {
		errorMessages.push(
			...validateMutuallyExclusiveScripts(config.mutuallyExclusive, scripts),
		);
	}

	if (errorMessages.length > 0) {
		failResult.errorMessage = errorMessages.join("\n\n");
		return failResult;
	}

	return true;
});
