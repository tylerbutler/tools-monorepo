import { defu } from "defu";
import jsonfile from "jsonfile";
import diff from "microdiff";
import type { JsonValue, PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { generatePackagePolicy } from "../policyGenerators/generatePackagePolicy.js";

const { writeFile: writeJson } = jsonfile;

/**
 * @alpha
 */
export type PackageJsonProperty = string;

/**
 * @alpha
 */
export type PropertySetter = Record<
	string,
	| ((prop: string, json: PackageJson, file: string, root: string) => JsonValue)
	| PropertySetterObject
>;

/**
 * @alpha
 */
export interface PropertySetterObject
	extends Record<string, PropertySetter[keyof PropertySetter]> {}

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

// const templateStrings = {
// 	$directory$: (file: string) => {
// 		return dirname(file);
// 	},
// };

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 */
export const PackageJsonProperties = generatePackagePolicy<
	PackageJson,
	PackageJsonPropertiesSettings | undefined
>("PackageJsonProperties", async (json, { file, config, resolve }) => {
	if (config === undefined) {
		return true;
	}

	const failResult: PolicyFailure = {
		name: PackageJsonProperties.name,
		file,
		autoFixable: true,
	};

	const { verbatim } = config;

	// function substituteTemplateValues(obj: PackageJson): PackageJson {
	// 	const result: PackageJson = {};
	// 	for (const [key, value] of Object.entries(obj)) {
	// 		if (typeof value === "string") {
	// 			let replacement = "";
	// 			for (const [key, func] of Object.entries(templateStrings)) {
	// 				replacement = value.replaceAll(key, func(file));
	// 			}
	// 			result[key] = replacement;
	// 		} else if (typeof value === "object" && value !== null) {
	// 			result[key] = substituteTemplateValues(value as PackageJson);
	// 		} else {
	// 			result[key] = value;
	// 		}
	// 	}
	// 	return result;
	// }

	// const verbatimRealized = substituteTemplateValues(verbatim);
	const messages: string[] = [];

	const merged = defu(json, verbatim);
	const result = diff(merged, json);

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
