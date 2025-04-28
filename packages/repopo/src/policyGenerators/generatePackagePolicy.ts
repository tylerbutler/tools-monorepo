import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { PackageJsonRegexMatch } from "../policies/constants.js";
import type {
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	RepoPolicy,
} from "../policy.js";

const { readFile: readJson } = jsonfile;

/**
 * A policy handler especially for policies that target package.json.
 *
 * @alpha
 */
export type PackageJsonHandler<J, C> = (
	json: J,
	args: PolicyFunctionArguments<C>,
) => Promise<true | PolicyFailure | PolicyFixResult>;

/**
 * Define a repo policy for package.json files.
 *
 * @alpha
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
