import type {
	PackageJsonHandler,
	PolicyFunctionArguments,
	PolicyHandler,
	RepoPolicy,
} from "./policy.js";

import jsonfile from "jsonfile";
const { readFileSync: readJson } = jsonfile;

export function createPolicyHandlerForPackage<J, C>(
	args: PolicyFunctionArguments<C>,
	handler: PackageJsonHandler<J, C>,
): PolicyHandler<C> {
	const json: J = readJson(args.file);
	const func = () => handler(json, args);
	return func;
}

export function definePackagePolicy<J, C>(
	name: string,
	packagePolicy: PackageJsonHandler<J, C>,
	// args: PolicyFunctionArguments<C>,
): RepoPolicy<C> {
	// const func = () => handler(json, args);
	return {
		name,
		match: /(^|\/)package\.json/i,
		// biome-ignore lint/suspicious/useAwait: <explanation>
		handler: async (innerArgs) => {
			const json: J = readJson(innerArgs.file);
			// const { config } = innerArgs;
			// if (config === undefined) {
			// 	return true;
			// }

			return packagePolicy(json, innerArgs);
		},
	};
}
