import { call, type Operation } from "effection";
import jsonfile from "jsonfile";
import { resolve } from "pathe";
import type { PackageJson } from "type-fest";
import { PackageJsonRegexMatch } from "../policies/constants.js";
import type {
	PolicyArgs,
	PolicyHandlerResult,
	PolicyShape,
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
	args: PolicyArgs<C>,
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
 * Input arguments for defining a package.json policy.
 *
 * @alpha
 */
export interface DefinePackagePolicyArgs<J, C> {
	/**
	 * The name of the policy.
	 */
	name: string;

	/**
	 * A description of the policy's purpose.
	 */
	description: string;

	/**
	 * The handler function that receives the parsed package.json and policy arguments.
	 */
	handler: PackageJsonHandler<J, C>;

	/**
	 * Optional default configuration for the policy.
	 */
	defaultConfig?: C;
}

/**
 * Define a repo policy for package.json files.
 *
 * @remarks
 * This is a helper function that creates a policy pre-configured to match
 * package.json files. The handler receives the parsed JSON content.
 *
 * @example
 * ```typescript
 * const MyPackagePolicy = definePackagePolicy({
 *   name: "MyPackagePolicy",
 *   description: "Ensures package.json has required fields",
 *   handler: async (json, { file }) => {
 *     if (!json.name) {
 *       return { error: "Missing name", fixable: false };
 *     }
 *     return true;
 *   },
 * });
 * ```
 *
 * @alpha
 */
export function definePackagePolicy<J = PackageJson, C = undefined>(
	args: DefinePackagePolicyArgs<J, C>,
): PolicyShape<C> {
	const { name, description, handler: packageHandler, defaultConfig } = args;
	return {
		name,
		description,
		match: PackageJsonRegexMatch,
		defaultConfig,
		handler: function* (innerArgs) {
			const json: J = yield* call(() =>
				readJson(resolve(innerArgs.root, innerArgs.file)),
			);
			const result = packageHandler(json, innerArgs);

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

/**
 * Alias for definePackagePolicy.
 * @alpha
 */
export const packagePolicy = definePackagePolicy;
