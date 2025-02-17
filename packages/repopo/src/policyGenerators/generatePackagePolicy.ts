import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { PackageJsonRegexMatch } from "../policies/constants.js";
import type { PackageJsonHandler, RepoPolicy } from "../policy.js";

const { readFile: readJson } = jsonfile;

/**
 * Define a repo policy for package.json files.
 */
export function generatePackagePolicy<J = PackageJson, C = undefined>(
	name: string,
	packagePolicy: PackageJsonHandler<J, C>,
	// args: PolicyFunctionArguments<C>,
): RepoPolicy<C> {
	// const func = () => handler(json, args);
	return {
		name,
		match: PackageJsonRegexMatch,
		handler: async (innerArgs) => {
			const json: J = await readJson(innerArgs.file);
			return packagePolicy(json, innerArgs);
		},
	};
}
