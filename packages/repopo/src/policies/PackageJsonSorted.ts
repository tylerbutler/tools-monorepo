import { updatePackageJsonFile } from "@tylerbu/cli-api";
import { call } from "effection";
import { sortPackageJson } from "sort-package-json";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * A repo policy that checks if package.json files in the repo are sorted using sort-package-json.
 *
 * @alpha
 */
export const PackageJsonSorted = definePackagePolicy(
	"PackageJsonSorted",
	function* (json, { file, resolve }) {
		const sortedJson = sortPackageJson(json);
		const isSorted = JSON.stringify(sortedJson) === JSON.stringify(json);

		if (isSorted) {
			return true;
		}

		if (resolve) {
			try {
				yield* call(() =>
					updatePackageJsonFile(file, (pkgJson) => pkgJson, { sort: true }),
				);
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
