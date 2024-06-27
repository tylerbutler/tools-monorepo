import assert from "node:assert/strict";
import path from "node:path";
import { updatePackageJsonFile } from "@fluidframework/build-tools";
import { readJson } from "fs-extra/esm";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../policy.js";

/**
 * A RepoPolicy that checks that the repository.directory property in package.json is set correctly. If the repository
 * field is a string instead of an object the package will be ignored.
 */
export const PackageJsonRepoDirectoryProperty: RepoPolicy = {
	name: "PackageJsonRepoDirectoryProperty",
	match: /(^|\/)package\.json/i,
	handler: async ({ file, resolve }) => {
		const failResult: PolicyFailure = {
			name: PackageJsonRepoDirectoryProperty.name,
			file,
			autoFixable: true,
		};

		const fixResult: PolicyFixResult = {
			...failResult,
			resolved: false,
		};

		const pkg = (await readJson(file)) as PackageJson;
		// file is already relative to the repo root, so we can use it as-is.
		const relativePkgDir = path.dirname(file).replace(/\\/g, "/");

		if (typeof pkg.repository === "object") {
			if (pkg.repository.directory !== relativePkgDir) {
				if (resolve) {
					try {
						updatePackageJsonFile(file, (json) => {
							assert(typeof json.repository === "object");
							json.repository.directory = relativePkgDir;
						});
						fixResult.resolved = true;
					} catch (error: unknown) {
						fixResult.resolved = false;
						fixResult.errorMessage = `${(error as Error).message}\n${
							(error as Error).stack
						}`;
					}
					return fixResult;
				}
				failResult.errorMessage = `repository.directory value is wrong. Expected '${relativePkgDir}', got '${pkg.repository.directory}'`;
				return failResult;
			}
		}

		return true;
	},
};
