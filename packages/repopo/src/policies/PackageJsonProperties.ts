import { createDefu } from "defu";
import { call } from "effection";
import jsonfile from "jsonfile";
import diff from "microdiff";
import { resolve as resolvePath } from "pathe";
import type { PackageJson } from "type-fest";
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
	PackageJsonPropertiesSettings
>({
	name: "PackageJsonProperties",
	description:
		"Ensures package.json files contain required properties with correct values.",
	requiresConfig: true,
	handler: function* (json, { file, root, config, resolve }) {
		if (config === undefined) {
			throw new TypeError("PackageJsonProperties requires config.");
		}
		const { verbatim } = config;
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
				yield* call(() =>
					writeJson(resolvePath(root, file), merged, { spaces: "\t" }),
				);
				return messages.map((message) => ({ message, fixStatus: "fixed" }));
			}

			// There were errors, and we're not resolving them, so return a fail result
			return messages.map((message) => ({ message, fixStatus: "available" }));
		}
		return [];
	},
});
