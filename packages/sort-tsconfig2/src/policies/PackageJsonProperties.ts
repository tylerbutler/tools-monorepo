import { readJson, writeJson } from "fs-extra/esm";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../policy.js";

/**
 * @alpha
 */
export type PackageJsonProperty = string;

/**
 * Policy settings for the PackageJsonProperties repo policy.
 *
 * @alpha
 */
export interface PackageJsonPropertiesSettings {
	/**
	 * Sets a package.json property to the string value provided. The string value will be used verbatim.
	 */
	verbatim: Record<PackageJsonProperty, string>;
}

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 */
export const PackageJsonProperties: RepoPolicy<PackageJsonPropertiesSettings> =
	{
		name: "PackageJsonProperties",
		match: /(^|\/)package\.json/i,
		handler: async ({ file, config, resolve }) => {
			if (config === undefined) {
				return true;
			}

			const failResult: PolicyFailure = {
				name: PackageJsonProperties.name,
				file,
				autoFixable: true,
			};

			const { verbatim } = config;
			const json = (await readJson(file)) as PackageJson;
			const messages: string[] = [];

			for (const [propName, value] of Object.entries(verbatim)) {
				if (json[propName] !== value) {
					messages.push(
						`Incorrect package.json field value for '${propName}'. Expected '${value}', got '${json[propName]}'.`,
					);
				}
			}

			if (messages.length > 0) {
				if (resolve) {
					const fixResult: PolicyFixResult = {
						...failResult,
						resolved: false,
					};

					for (const [propName, value] of Object.entries(verbatim)) {
						json[propName] = value;
					}
					await writeJson(file, json, { spaces: "\t" });

					fixResult.resolved = true;
					return fixResult;
				}

				// There were errors, and we're not resolving them, so return a fail result
				failResult.errorMessage = messages.join("\n");
				return failResult;
			}

			return true;
		},
	};
