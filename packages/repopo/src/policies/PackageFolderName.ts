import path from "pathe";
import type { PackageJson } from "@fluid-tools/build-infrastructure";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { generatePackagePolicy } from "../policyGenerators/generatePackagePolicy.js";

/**
 * A RepoPolicy that checks that packages are in folders named consistently with the package name.
 *
 * @alpha
 */
export const PackageFolderName = generatePackagePolicy<PackageJson>(
	"PackageFolderName",
	// biome-ignore lint/suspicious/useAwait: <explanation>
	async (json, { file }): Promise<true | PolicyFailure | PolicyFixResult> => {
		const packageName = json.name;
		const packageDir = path.dirname(file);
		const [, scopedName] = packageName.split("/") as [string, string];
		const nameWithoutScope = scopedName ?? packageName;
		const folderName = path.basename(packageDir);

		// The folder name should match the tail of the package name
		// Full match isn't required for cases where the package name is prefixed with names from earlier in the path
		if (!nameWithoutScope.toLowerCase().endsWith(folderName.toLowerCase())) {
			return {
				name: PackageFolderName.name,
				file,
				autoFixable: false,
				errorMessage: `Containing folder ${folderName} for package ${packageName} should be named similarly to the package`,
			} satisfies PolicyFailure;
		}

		return true;
	},
);
