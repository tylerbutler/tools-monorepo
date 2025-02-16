import { definePackagePolicy } from "../definePackagePolicy.js";
import type { PolicyFailure } from "../policy.js";

const expectedScripts = ["build", "clean"] as const;

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 */
export const PackageScriptsPolicy = definePackagePolicy(
	"PackageScriptsPolicy",
	async (json, { file }) => {
		const failResult: PolicyFailure = {
			name: PackageScriptsPolicy.name,
			file,
			autoFixable: false,
		};

		const hasScriptsField = Object.prototype.hasOwnProperty.call(
			json,
			"scripts",
		);

		const missingScripts: string[] = [];
		if (hasScriptsField) {
			missingScripts.push(
				...expectedScripts.filter(
					(script) =>
						!Object.prototype.hasOwnProperty.call(json.scripts, script),
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
