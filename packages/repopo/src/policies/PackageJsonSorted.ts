import jsonfile from "jsonfile";
import { resolve as resolvePath } from "pathe";
import type { PolicyFailure, PolicyFixResult } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";
import { detectIndentation } from "../utils/indentation.js";

const { writeFile: writeJson } = jsonfile;
const missingDependencyMessage =
	"PackageJsonSorted requires the optional peer dependency sort-package-json. Install it to enable this policy.";

function isMissingSortPackageJsonError(error: unknown): boolean {
	if (
		error instanceof Error &&
		"code" in error &&
		error.code === "ERR_MODULE_NOT_FOUND" &&
		error.message.includes("sort-package-json")
	) {
		return true;
	}

	return (
		typeof error === "object" &&
		error !== null &&
		"cause" in error &&
		isMissingSortPackageJsonError(error.cause)
	);
}

async function loadSortPackageJson() {
	try {
		const { sortPackageJson } = await import("sort-package-json");
		return sortPackageJson;
	} catch (error: unknown) {
		if (isMissingSortPackageJsonError(error)) {
			return undefined;
		}
		throw error;
	}
}

/**
 * A repo policy that checks if package.json files in the repo are sorted using sort-package-json.
 *
 * @alpha
 */
export const PackageJsonSorted = definePackagePolicy({
	name: "PackageJsonSorted",
	description:
		"Ensures package.json files are sorted consistently using sort-package-json.",
	handler: async (json, { file, root, resolve }) => {
		const sortPackageJson = await loadSortPackageJson();
		if (sortPackageJson === undefined) {
			const result: PolicyFailure = {
				name: PackageJsonSorted.name,
				file,
				autoFixable: false,
				errorMessages: [missingDependencyMessage],
			};
			return result;
		}

		const sortedJson = sortPackageJson(json);
		const isSorted = JSON.stringify(sortedJson) === JSON.stringify(json);

		if (isSorted) {
			return true;
		}

		if (resolve) {
			try {
				const packageJsonPath = resolvePath(root, file);
				const indent = await detectIndentation(packageJsonPath);
				await writeJson(packageJsonPath, sortedJson, { spaces: indent });
				const result: PolicyFixResult = {
					name: PackageJsonSorted.name,
					file,
					resolved: true,
					errorMessages: [],
				};
				return result;
			} catch (error: unknown) {
				const result: PolicyFixResult = {
					name: PackageJsonSorted.name,
					file,
					resolved: false,
					autoFixable: true,
					errorMessages: [
						(error as Error).message,
						(error as Error).stack ?? "",
					],
				};
				return result;
			}
		} else {
			const result: PolicyFailure = {
				name: PackageJsonSorted.name,
				file,
				autoFixable: true,
				errorMessages: [],
			};
			return result;
		}
	},
});
