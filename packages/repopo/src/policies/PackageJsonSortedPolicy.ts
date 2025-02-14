import { updatePackageJsonFile } from "@tylerbu/cli-api";
import { sortPackageJson } from "sort-package-json";
import type { PackageJson } from "type-fest";

import jsonfile from "jsonfile";
const { readFile: readJson } = jsonfile;

import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../policy.js";
import { PackageJsonRegexMatch as match } from "./constants.js";

/**
 * A repo policy that checks if package.json files in the repo are sorted using sort-package-json.
 */
export const PackageJsonSortedPolicy: RepoPolicy = {
	name: "PackageJsonSortedPolicy",
	match,
	handler: async ({ file, resolve }) => {
		const json: PackageJson = await readJson(file);
		const sortedJson = sortPackageJson(json);
		const isSorted = JSON.stringify(sortedJson) === JSON.stringify(json);

		if (isSorted) {
			return true;
		}

		if (resolve) {
			try {
				await updatePackageJsonFile(file, (json) => json, { sort: true });
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
					autoFixable: true,
					errorMessage: (error as Error).message,
				};
				return result;
			}
		} else {
			const result: PolicyFailure = {
				name: PackageJsonSortedPolicy.name,
				file,
				autoFixable: true,
			};
			return result;
		}
	},
};
