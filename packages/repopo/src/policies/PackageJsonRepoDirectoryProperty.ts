import assert from "node:assert/strict";
import { updatePackageJsonFile } from "@fluid-tools/build-infrastructure";
import path from "pathe";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

/** Ensures repository.directory matches each package's repository-relative directory. @public */
export const PackageJsonRepoDirectoryProperty = definePackagePolicy({
	name: "PackageJsonRepoDirectoryProperty",
	description:
		"Ensures the repository.directory property in package.json is set correctly for monorepo packages.",
	handler: async (json, { file, root, resolve }) => {
		const packageJsonPath = path.resolve(root, file);
		const directory =
			path.relative(root, path.dirname(packageJsonPath)) || undefined;
		if (
			typeof json.repository !== "object" ||
			json.repository.directory === directory
		) {
			return [];
		}
		const message = `repository.directory value is wrong. Expected '${directory}', got '${json.repository.directory}'`;
		if (!resolve) {
			return [{ message, fixStatus: "available" }];
		}
		try {
			updatePackageJsonFile(packageJsonPath, (pkg) => {
				assert(typeof pkg.repository === "object");
				if (directory === undefined) {
					delete pkg.repository.directory;
				} else {
					pkg.repository.directory = directory;
				}
			});
		} catch (error: unknown) {
			return [
				{
					message: `${message}: ${error instanceof Error ? error.message : String(error)}`,
					fixStatus: "failed",
				},
			];
		}
		return [{ message, fixStatus: "fixed" }];
	},
});
