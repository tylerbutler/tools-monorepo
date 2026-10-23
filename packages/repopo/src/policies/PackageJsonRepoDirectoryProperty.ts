import assert from "node:assert/strict";
import { call } from "effection";
import jsonfile from "jsonfile";
import path from "pathe";
import type { PackageJson } from "type-fest";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";
import { detectIndentation } from "../utils/indentation.js";

const { writeFile: writeJson } = jsonfile;

/**
 * A RepoPolicy that checks that the repository.directory property in package.json is set correctly. If the repository
 * field is a string instead of an object the package will be ignored.
 *
 * @public
 */
export const PackageJsonRepoDirectoryProperty = definePackagePolicy<
	PackageJson,
	undefined
>({
	name: "PackageJsonRepoDirectoryProperty",
	description:
		"Ensures the repository.directory property in package.json is set correctly for monorepo packages.",
	handler: function* (json, { file, root, resolve }) {
		const failResult: PolicyFailure = {
			name: PackageJsonRepoDirectoryProperty.name,
			file,
			autoFixable: true,
			errorMessages: [],
		};

		const fixResult: PolicyFixResult = {
			...failResult,
			resolved: false,
		};

		const packageJsonPath = path.resolve(root, file);
		const pkgDir = path.dirname(packageJsonPath);
		const maybeDir = path.relative(root, pkgDir);
		const relativePkgDir = maybeDir === "" ? undefined : maybeDir;

		if (
			typeof json.repository === "object" &&
			json.repository.directory !== relativePkgDir
		) {
			if (resolve) {
				try {
					yield* call(async () => {
						const { default: sortPackageJson } = await import(
							"sort-package-json-legacy"
						);
						const spaces = await detectIndentation(packageJsonPath);
						assert(typeof json.repository === "object");
						if (relativePkgDir === undefined) {
							delete json.repository.directory;
						} else {
							json.repository.directory = relativePkgDir;
						}
						await writeJson(packageJsonPath, sortPackageJson(json), { spaces });
					});
					fixResult.resolved = true;
				} catch (error: unknown) {
					fixResult.resolved = false;
					fixResult.errorMessages.push(
						`${(error as Error).message}\n${(error as Error).stack}`,
					);
				}
				return fixResult;
			}
			failResult.errorMessages.push(
				`repository.directory value is wrong. Expected '${relativePkgDir}', got '${json.repository.directory}'`,
			);
			return failResult;
		}

		return true;
	},
});
