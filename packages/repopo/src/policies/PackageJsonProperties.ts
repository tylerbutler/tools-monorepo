import { defu } from "defu";
import jsonfile from "jsonfile";
import diff from "microdiff";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.ts";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.ts";

const { writeFile: writeJson } = jsonfile;

/**
 * Policy settings for the PackageJsonProperties repo policy.
 *
 * @alpha
 */
export interface PackageJsonPropertiesSettings {
	/**
	 * Sets a package.json property to the value provided. The value will be used verbatim.
	 */
	verbatim: PackageJson;
}

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 *
 * @alpha
 */
export const PackageJsonProperties = definePackagePolicy<
	PackageJson,
	PackageJsonPropertiesSettings | undefined
>("PackageJsonProperties", async (json, { file, config, resolve }) => {
	if (config === undefined) {
		return true;
	}
	const { verbatim } = config;

	const failResult: PolicyFailure = {
		name: PackageJsonProperties.name,
		file,
		autoFixable: true,
	};

	const merged = defu(verbatim, json);
	const result = diff(merged, json);

	const messages: string[] = [];
	for (const diffResult of result) {
		messages.push(
			`Incorrect package.json field value for '${diffResult.path}'.`,
		);
	}

	if (messages.length > 0) {
		if (resolve) {
			const fixResult: PolicyFixResult = {
				...failResult,
				resolved: false,
			};

			await writeJson(file, merged, { spaces: "\t" });

			fixResult.resolved = true;
			return fixResult;
		}

		// There were errors, and we're not resolving them, so return a fail result
		failResult.errorMessage = messages.join("\n");
		return failResult;
	}

	return true;
});
