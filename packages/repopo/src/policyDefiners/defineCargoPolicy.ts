import { readFile } from "node:fs/promises";
import { call, type Operation } from "effection";
import { resolve } from "pathe";
import { ExecutionContractError } from "../executionContractError.js";
import { readParsedFile } from "../fileCache.js";
import { CargoTomlRegexMatch } from "../policies/constants.js";
import type {
	DefinedConfig,
	FilePolicyDefinition,
	PolicyArgs,
	PolicyResult,
} from "../policy.js";
import { parseToml } from "./tomlParser.js";

/**
 * A parsed Cargo.toml represented as a record of sections and values.
 *
 * @public
 */
export type CargoToml = Record<string, unknown>;

/**
 * A policy handler for Cargo.toml policies.
 *
 * @remarks
 * Receives the parsed TOML content and the standard policy arguments.
 *
 * @public
 */
export type CargoTomlHandler<C> = (
	toml: CargoToml,
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
 * Input arguments for defining a Cargo.toml policy.
 *
 * @public
 */
export interface DefineCargoPolicyArgs<C> {
	/**
	 * The name of the policy.
	 */
	name: string;

	/**
	 * A description of the policy's purpose.
	 */
	description: string;

	/**
	 * The handler function that receives the parsed Cargo.toml and policy arguments.
	 */
	handler: CargoTomlHandler<C>;

	/**
	 * Optional default configuration for the policy.
	 */
	defaultConfig?: C;
	requiresConfig?: boolean;
}

/**
 * Define a repo policy for Cargo.toml files.
 *
 * @remarks
 * This is a helper function that creates a policy pre-configured to match
 * Cargo.toml files. The handler receives the parsed TOML content.
 *
 * @param args - Policy metadata, parsed-TOML handler, and optional defaults.
 * @returns A file policy that reads and parses matching Cargo.toml files.
 *
 * @example
 * ```typescript
 * const MyCargoPolicy = defineCargoPolicy({
 *   name: "MyCargoPolicy",
 *   description: "Ensures Cargo.toml has required fields",
 *   handler: async (toml, { file }) => {
 *     const pkg = toml.package as Record<string, unknown> | undefined;
 *     if (!pkg?.name) {
 *       return [{ message: "Missing package name" }];
 *     }
 *     return [];
 *   },
 * });
 * ```
 *
 * @public
 */
export function defineCargoPolicy<C = void>(
	args: DefineCargoPolicyArgs<C> & { defaultConfig: DefinedConfig<C> },
): FilePolicyDefinition<C> & { defaultConfig: DefinedConfig<C> };
/** Define a Cargo policy that requires explicit configuration. @public */
export function defineCargoPolicy<C = void>(
	args: DefineCargoPolicyArgs<C> & { requiresConfig: true },
): FilePolicyDefinition<C> & { requiresConfig: true };
/** Define a Cargo policy with optional configuration. @public */
export function defineCargoPolicy<C = void>(
	args: DefineCargoPolicyArgs<C>,
): FilePolicyDefinition<C>;
export function defineCargoPolicy<C = void>(
	args: DefineCargoPolicyArgs<C>,
): FilePolicyDefinition<C> {
	const { name, description, handler: cargoHandler, defaultConfig } = args;
	return {
		name,
		description,
		match: CargoTomlRegexMatch,
		defaultConfig,
		requiresConfig: args.requiresConfig,
		handler: function* (innerArgs) {
			const toml: CargoToml = yield* call(() =>
				readParsedFile(innerArgs, "toml", async () => {
					const content = await readFile(
						resolve(innerArgs.root, innerArgs.file),
						"utf-8",
					);
					return parseToml(content);
				}),
			);
			const result = cargoHandler(toml, innerArgs);

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
