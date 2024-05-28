import assert from "node:assert/strict";
import path from "node:path";
import { updatePackageJsonFile } from "@fluidframework/build-tools";
import { readJson } from "fs-extra/esm";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult, RepoPolicy } from "../api.js";

export const PackageJsonRepoDirectoryProperty: RepoPolicy = {
	name: "PackageJsonRepoDirectoryProperty",
	match: /(^|\/)package\.json/i,
	handler: async ({ file, root, resolve }) => {
		const failResult: PolicyFailure = {
			name: PackageJsonRepoDirectoryProperty.name,
			file,
			autoFixable: true,
		};

		const fixResult: PolicyFixResult = {
			...failResult,
			resolved: false,
		};

		// TODO
		const pkg = (await readJson(file)) as PackageJson;
		const pkgDir = path.dirname(file);
		const relativePkgDir = path.relative(root, pkgDir);

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
