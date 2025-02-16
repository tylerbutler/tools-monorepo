import type {
	PackageJsonHandler,
	PackagePolicy,
	PolicyFailure,
	PolicyFixResult,
	PolicyFunctionArguments,
	PolicyHandler,
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

export function createPackagePolicy<J, C>(
	handler: PackageJsonHandler<J, C>,
	args: PolicyFunctionArguments<C>,
): PackagePolicy<J, C> {
	const json: J = readJson(args.file);
	const func = () => handler(json, args);
	return {
		match: /(^|\/)package\.json/i,
		handler,
	};
}
