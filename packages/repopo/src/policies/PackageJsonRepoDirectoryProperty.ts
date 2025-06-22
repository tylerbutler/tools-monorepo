import assert from "node:assert/strict";
import { updatePackageJsonFile } from "@fluid-tools/build-infrastructure";
import path from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/**
 * A RepoPolicy that checks that the repository.directory property in package.json is set correctly. If the repository
 * field is a string instead of an object the package will be ignored.
 *
 * @alpha
 */
export const PackageJsonRepoDirectoryProperty = definePackagePolicy<
	PackageJson,
	undefined
>("PackageJsonRepoDirectoryProperty", async (json, { file, root, resolve }) => {
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
	const maybeDir = path.relative(root, pkgDir);
	const relativePkgDir = maybeDir === "" ? undefined : maybeDir;

	if (typeof json.repository === "object") {
		if (json.repository.directory !== relativePkgDir) {
			if (resolve) {
				try {
					updatePackageJsonFile(file, (json) => {
						assert(typeof json.repository === "object");
						if (relativePkgDir === undefined) {
							delete json.repository.directory;
						} else {
							json.repository.directory = relativePkgDir;
						}
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
