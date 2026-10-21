import { createDefu } from "defu";
import { call } from "effection";
import jsonfile from "jsonfile";
import diff from "microdiff";
import { resolve as resolvePath } from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

const { writeFile: writeJson } = jsonfile;

const mergeProperties = createDefu((object, key, value) => {
	if (Array.isArray(value)) {
		object[key] = value;
		return true;
	}
	return false;
});

/**
 * Policy settings for the PackageJsonProperties repo policy.
 *
 * @public
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
 * @public
 */
export const PackageJsonProperties = definePackagePolicy<
	PackageJson,
	PackageJsonPropertiesSettings | undefined
>({
	name: "PackageJsonProperties",
	description:
		"Ensures package.json files contain required properties with correct values.",
	handler: function* (json, { file, root, config, resolve }) {
		if (config === undefined) {
			return true;
		}
		const { verbatim } = config;

		const failResult: PolicyFailure = {
			name: PackageJsonProperties.name,
			file,
			autoFixable: true,
			errorMessages: [],
		};

		const merged = mergeProperties(verbatim, json);
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

				yield* call(() =>
					writeJson(resolvePath(root, file), merged, { spaces: "\t" }),
				);

				fixResult.resolved = true;
				return fixResult;
			}

			// There were errors, and we're not resolving them, so return a fail result
			failResult.errorMessages = messages;
			return failResult;
		}

		return true;
	},
});
