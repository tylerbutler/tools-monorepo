import type { PackageJson } from "type-fest";
import type {
	PackageJsonHandler,
	PolicyFunctionArguments,
	PolicyHandler,
	RepoPolicy,
} from "./policy.js";

import jsonfile from "jsonfile";
import { PackageJsonRegexMatch } from "./policies/constants.js";
const { readFileSync: readJson } = jsonfile;

export function createPolicyHandlerForPackage<J, C>(
	args: PolicyFunctionArguments<C>,
	handler: PackageJsonHandler<J, C>,
): PolicyHandler<C> {
	const json: J = readJson(args.file);
	const func = () => handler(json, args);
	return func;
}

/**
 * Define a repo policy for package.json files.
 */
export function definePackagePolicy<J = PackageJson, C = undefined>(
	name: string,
	packagePolicy: PackageJsonHandler<J, C>,
	// args: PolicyFunctionArguments<C>,
): RepoPolicy<C> {
	// const func = () => handler(json, args);
	return {
		name,
		match: PackageJsonRegexMatch,
		// biome-ignore lint/suspicious/useAwait: <explanation>
		handler: async (innerArgs) => {
			const json: J = readJson(innerArgs.file);
			return packagePolicy(json, innerArgs);
		},
	};
}
