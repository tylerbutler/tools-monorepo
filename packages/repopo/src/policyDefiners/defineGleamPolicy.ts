import { readFile } from "node:fs/promises";
import { call, type Operation } from "effection";
import { resolve } from "pathe";
import { ExecutionContractError } from "../executionContractError.js";
import { readParsedFile } from "../fileCache.js";
import { GleamTomlRegexMatch } from "../policies/constants.js";
import type {
	DefinedConfig,
	FilePolicyDefinition,
	PolicyArgs,
	PolicyResult,
} from "../policy.js";
import { parseToml } from "./tomlParser.js";

/**
 * A parsed gleam.toml represented as a record of sections and values.
 *
 * @public
 */
export type GleamToml = Record<string, unknown>;

/**
 * A policy handler for gleam.toml policies.
 *
 * @remarks
 * Receives the parsed TOML content and the standard policy arguments.
 *
 * @public
 */
export type GleamTomlHandler<C> = (
	toml: GleamToml,
	args: PolicyArgs<C>,
) => Operation<PolicyResult> | Promise<PolicyResult>;

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
 * @public
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
	requiresConfig?: boolean;
}

/**
 * Define a repo policy for gleam.toml files.
 *
 * @remarks
 * This is a helper function that creates a policy pre-configured to match
 * gleam.toml files. The handler receives the parsed TOML content.
 *
 * @param args - Policy metadata, parsed-TOML handler, and optional defaults.
 * @returns A file policy that reads and parses matching gleam.toml files.
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
 * @public
 */
export function defineGleamPolicy<C = void>(
	args: DefineGleamPolicyArgs<C> & { defaultConfig: DefinedConfig<C> },
): FilePolicyDefinition<C> & { defaultConfig: DefinedConfig<C> };
export function defineGleamPolicy<C = void>(
	args: DefineGleamPolicyArgs<C> & { requiresConfig: true },
): FilePolicyDefinition<C> & { requiresConfig: true };
export function defineGleamPolicy<C = void>(
	args: DefineGleamPolicyArgs<C>,
): FilePolicyDefinition<C>;
export function defineGleamPolicy<C = void>(
	args: DefineGleamPolicyArgs<C>,
): FilePolicyDefinition<C> {
	const { name, description, handler: gleamHandler, defaultConfig } = args;
	return {
		name,
		description,
		match: GleamTomlRegexMatch,
		defaultConfig,
		requiresConfig: args.requiresConfig,
		handler: function* (innerArgs) {
			const toml: GleamToml = yield* call(() =>
				readParsedFile(innerArgs, "toml", async () => {
					const content = await readFile(
						resolve(innerArgs.root, innerArgs.file),
						"utf-8",
					);
					return parseToml(content);
				}),
			);
			const result = gleamHandler(toml, innerArgs);

			if (result instanceof Promise) {
				return yield* call(() => result);
			}
			if (isOperation<PolicyResult>(result)) {
				return yield* result;
			}
			throw new ExecutionContractError(
				`Unexpected handler result type: ${typeof result}`,
			);
		},
	};
}
