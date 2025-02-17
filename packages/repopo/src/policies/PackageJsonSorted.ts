import { updatePackageJsonFile } from "@tylerbu/cli-api";
import { sortPackageJson } from "sort-package-json";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { generatePackagePolicy } from "../policyGenerators/generatePackagePolicy.js";

/**
 * A repo policy that checks if package.json files in the repo are sorted using sort-package-json.
 */
export const PackageJsonSorted = generatePackagePolicy(
	"PackageJsonSorted",
	async (json, { file, resolve }) => {
		const sortedJson = sortPackageJson(json);
		const isSorted = JSON.stringify(sortedJson) === JSON.stringify(json);

		if (isSorted) {
			return true;
		}

		if (resolve) {
			try {
				await updatePackageJsonFile(file, (json) => json, { sort: true });
				const result: PolicyFixResult = {
					name: PackageJsonSorted.name,
					file,
					resolved: true,
				};
				return result;
			} catch (error: unknown) {
				const result: PolicyFixResult = {
					name: PackageJsonSorted.name,
					file,
					resolved: false,
					autoFixable: true,
					errorMessage: (error as Error).message,
				};
				return result;
			}
		} else {
			const result: PolicyFailure = {
				name: PackageJsonSorted.name,
				file,
				autoFixable: true,
			};
			return result;
		}
	},
);
