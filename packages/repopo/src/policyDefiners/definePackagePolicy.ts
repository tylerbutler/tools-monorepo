import { call, type Operation } from "effection";
import jsonfile from "jsonfile";
import type { PackageJson } from "type-fest";
import { PackageJsonRegexMatch } from "../policies/constants.js";
import type {
	PolicyDefinition,
	PolicyFunctionArguments,
	PolicyHandlerResult,
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
) => Operation<PolicyHandlerResult>;

/**
 * Define a repo policy for package.json files.
 *
 * @alpha
 */
export function definePackagePolicy<J = PackageJson, C = undefined>(
	name: string,
	packagePolicy: PackageJsonHandler<J, C>,
): PolicyDefinition<C> {
	return {
		name,
		match: PackageJsonRegexMatch,
		handler: function* (innerArgs) {
			const json: J = yield* call(() => readJson(innerArgs.file));
			return yield* packagePolicy(json, innerArgs);
		},
	};
}
