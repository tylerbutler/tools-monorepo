import { readFile } from "node:fs/promises";
import { call, type Operation } from "effection";
import { resolve } from "pathe";
import { GleamTomlRegexMatch } from "../policies/constants.js";
import type {
	PolicyArgs,
	PolicyHandlerResult,
	PolicyShape,
} from "../policy.js";
import { parseToml } from "./tomlParser.js";

/**
 * A parsed gleam.toml represented as a record of sections and values.
 *
 * @alpha
 */
export type GleamToml = Record<string, unknown>;

/**
 * A policy handler for gleam.toml policies.
 *
 * @remarks
 * Receives the parsed TOML content and the standard policy arguments.
 *
 * @alpha
 */
export type GleamTomlHandler<C> = (
	toml: GleamToml,
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
 * Input arguments for defining a gleam.toml policy.
 *
 * @alpha
 */
export interface DefineGleamPolicyArgs<C> {
	/**
	 * The name of the policy.
	 */
	name: string;

	/**
	 * A description of the policy's purpose.
	 */
	description: string;

	/**
	 * The handler function that receives the parsed gleam.toml and policy arguments.
	 */
	handler: GleamTomlHandler<C>;

	/**
	 * Optional default configuration for the policy.
	 */
	defaultConfig?: C;
}

/**
 * Define a repo policy for gleam.toml files.
 *
 * @remarks
 * This is a helper function that creates a policy pre-configured to match
 * gleam.toml files. The handler receives the parsed TOML content.
 *
 * @example
 * ```typescript
 * const MyGleamPolicy = defineGleamPolicy({
 *   name: "MyGleamPolicy",
 *   description: "Ensures gleam.toml has required fields",
 *   handler: async (toml, { file }) => {
 *     if (!toml.name) {
 *       return { error: "Missing name field", fixable: false };
 *     }
 *     return true;
 *   },
 * });
 * ```
 *
 * @alpha
 */
export function defineGleamPolicy<C = undefined>(
	args: DefineGleamPolicyArgs<C>,
): PolicyShape<C> {
	const { name, description, handler: gleamHandler, defaultConfig } = args;
	return {
		name,
		description,
		match: GleamTomlRegexMatch,
		defaultConfig,
		handler: function* (innerArgs) {
			const content: string = yield* call(() =>
				readFile(resolve(innerArgs.root, innerArgs.file), "utf-8"),
			);
			const toml: GleamToml = yield* call(() => parseToml(content));
			const result = gleamHandler(toml, innerArgs);

			if (result instanceof Promise) {
				return yield* call(() => result);
			}
			if (isOperation<PolicyHandlerResult>(result)) {
				return yield* result;
			}
			throw new Error(`Unexpected handler result type: ${typeof result}`);
		},
	};
}
