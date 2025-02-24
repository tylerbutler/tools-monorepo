import type { PolicyFailure } from "../policy.js";
import { generatePackagePolicy } from "../policyGenerators/generatePackagePolicy.js";

const expectedScripts = ["build", "clean"] as const;

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 */
export const PackageScripts = generatePackagePolicy(
	"PackageScripts",
	async (json, { file }) => {
		const failResult: PolicyFailure = {
			name: PackageScripts.name,
			file,
			autoFixable: false,
			errorMessages: [],
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
			failResult.errorMessages.push(
				`missing the following scripts: \n\t${missingScripts.join("\n\t")}`,
			);
			return failResult;
		}

		return true;
	},
);
