import { readFile, writeFile } from "node:fs/promises";
import { sortPackageJson } from "sort-package-json";
import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../policy.js";

/**
 * A repo policy that checks if package.json files in the repo are sorted using sort-package-json.
 */
export const PackageJsonSortedPolicy: RepoPolicy = {
	name: "PackageJsonSortedPolicy",
	match: /(^|\/)package\.json/i,
	handler: async ({ file, resolve }) => {
		const json = await readFile(file, { encoding: "utf8" });
		const sorted = sortPackageJson(json);
		if (json === sorted) {
			return true;
		}

		if (resolve) {
			try {
				await writeFile(file, sorted, { encoding: "utf8" });
				const result: PolicyFixResult = {
					name: PackageJsonSortedPolicy.name,
					file,
					resolved: true,
				};
				return result;
			} catch (error: unknown) {
				const result: PolicyFixResult = {
					name: PackageJsonSortedPolicy.name,
					file,
					resolved: false,
					errorMessage: (error as Error).message,
				};
				return result;
			}
		}

		const result: PolicyFailure = {
			name: PackageJsonSortedPolicy.name,
			file,
			autoFixable: true,
			errorMessage: "package.json not sorted.",
		};
		return result;
	},
};
