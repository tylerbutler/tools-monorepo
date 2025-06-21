import type { PolicyFailure } from "../policy.js";
import { definePackagePolicy } from "../policyDefiners/definePackagePolicy.js";

const expectedScripts = ["build", "clean"] as const;

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 *
 * @alpha
 */
export const PackageScripts = definePackagePolicy(
	"PackageScripts",
	async (json, { file }) => {
		const failResult: PolicyFailure = {
			name: PackageScripts.name,
			file,
			autoFixable: false,
		};

		const hasScriptsField = Object.hasOwn(json, "scripts");

		const missingScripts: string[] = [];
		if (hasScriptsField) {
			missingScripts.push(
				...expectedScripts.filter(
					(script) => !Object.hasOwn(json.scripts, script),
				),
			);
		}

		if (missingScripts.length > 0) {
			failResult.errorMessage = `missing the following scripts: \n\t${missingScripts.join("\n\t")}`;
			return failResult;
		}

		return true;
	},
);
