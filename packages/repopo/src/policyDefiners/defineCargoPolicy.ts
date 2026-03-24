import { readFile } from "node:fs/promises";
import { call, type Operation } from "effection";
import { resolve } from "pathe";
import { CargoTomlRegexMatch } from "../policies/constants.js";
import type {
	PolicyArgs,
	PolicyHandlerResult,
	PolicyShape,
} from "../policy.js";
import { parseToml } from "./tomlParser.js";

/**
 * A parsed Cargo.toml represented as a record of sections and values.
 *
 * @alpha
 */
export type CargoToml = Record<string, unknown>;

/**
 * A policy handler for Cargo.toml policies.
 *
 * @remarks
 * Receives the parsed TOML content and the standard policy arguments.
 *
 * @alpha
 */
export type CargoTomlHandler<C> = (
	toml: CargoToml,
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
 * Input arguments for defining a Cargo.toml policy.
 *
 * @alpha
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
}

/**
 * Define a repo policy for Cargo.toml files.
 *
 * @remarks
 * This is a helper function that creates a policy pre-configured to match
 * Cargo.toml files. The handler receives the parsed TOML content.
 *
 * @example
 * ```typescript
 * const MyCargoPolicy = defineCargoPolicy({
 *   name: "MyCargoPolicy",
 *   description: "Ensures Cargo.toml has required fields",
 *   handler: async (toml, { file }) => {
 *     const pkg = toml.package as Record<string, unknown> | undefined;
 *     if (!pkg?.name) {
 *       return { error: "Missing package name", fixable: false };
 *     }
 *     return true;
 *   },
 * });
 * ```
 *
 * @alpha
 */
export function defineCargoPolicy<C = undefined>(
	args: DefineCargoPolicyArgs<C>,
): PolicyShape<C> {
	const { name, description, handler: cargoHandler, defaultConfig } = args;
	return {
		name,
		description,
		match: CargoTomlRegexMatch,
		defaultConfig,
		handler: function* (innerArgs) {
			const content: string = yield* call(() =>
				readFile(resolve(innerArgs.root, innerArgs.file), "utf-8"),
			);
			const toml: CargoToml = yield* call(() => parseToml(content));
			const result = cargoHandler(toml, innerArgs);

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
