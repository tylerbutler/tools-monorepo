import { call, type Operation } from "effection";
import jsonfile from "jsonfile";
import { resolve } from "pathe";
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
 * @remarks
 * Package JSON handlers can be implemented in two ways:
 * - As an async function returning a Promise
 * - As an Effection generator function returning an Operation
 *
 * Both styles are supported to allow gradual migration and flexibility.
 *
 * @alpha
 */
export type PackageJsonHandler<J, C> = (
	json: J,
	args: PolicyFunctionArguments<C>,
) => Operation<PolicyHandlerResult> | Promise<PolicyHandlerResult>;

/**
 * Type guard to check if a value is an Effection Operation (generator).
 */
function isOperation<T>(value: unknown): value is Operation<T> {
	return (
		typeof value === "object" &&
		value !== null &&
		"next" in value &&
		typeof (value as { next: unknown }).next === "function"
	);
}

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
			const json: J = yield* call(() =>
				readJson(resolve(innerArgs.root, innerArgs.file)),
			);
			const result = packagePolicy(json, innerArgs);

			// Handle both Operation (generator) and Promise return types
			if (result instanceof Promise) {
				return yield* call(() => result);
			}
			// Check if it's an Effection Operation (generator)
			if (isOperation<PolicyHandlerResult>(result)) {
				return yield* result;
			}
			// This should never happen with proper handler typing
			throw new Error(`Unexpected handler result type: ${typeof result}`);
		},
	};
}
