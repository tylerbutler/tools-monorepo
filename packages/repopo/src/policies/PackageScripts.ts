import type { PackageJson } from "type-fest";

import jsonfile from "jsonfile";
const { readFile: readJson } = jsonfile;

import type { PolicyFailure, RepoPolicy } from "../policy.js";
import { PackageJsonRegexMatch as match } from "./constants.js";

const expectedScripts = ["build", "clean"] as const;

/**
 * A RepoPolicy that checks that package.json properties in packages match expected values.
 */
export const PackageScriptsPolicy: RepoPolicy = {
	name: "PackageScriptsPolicy",
	match,
	handler: async ({ file }) => {
		const failResult: PolicyFailure = {
			name: PackageScriptsPolicy.name,
			file,
			autoFixable: false,
		};

		const json: PackageJson = await readJson(file);
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
};
