import assert from "node:assert/strict";
import { updatePackageJsonFile } from "@fluid-tools/build-infrastructure";
import path from "pathe";
import type { PackageJson } from "type-fest";

import { definePackagePolicy } from "../packageJsonHandlerAdapter.js";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";

/**
 * A RepoPolicy that checks that the repository.directory property in package.json is set correctly. If the repository
 * field is a string instead of an object the package will be ignored.
 */
export const PackageJsonRepoDirectoryProperty = definePackagePolicy<
	PackageJson,
	undefined
>("PackageJsonProperties", async (json, { file, root, resolve }) => {
	const failResult: PolicyFailure = {
		name: PackageJsonRepoDirectoryProperty.name,
		file,
		autoFixable: true,
	};

	const fixResult: PolicyFixResult = {
		...failResult,
		resolved: false,
	};

	const pkgDir = path.dirname(file);
	const relativePkgDir = path.relative(root, pkgDir);

	if (typeof json.repository === "object") {
		if (json.repository.directory !== relativePkgDir) {
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
			failResult.errorMessage = `repository.directory value is wrong. Expected '${relativePkgDir}', got '${json.repository.directory}'`;
			return failResult;
		}
	}

	return true;
});
