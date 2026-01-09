import path from "pathe";
import { makePolicyDefinition } from "../makePolicy.js";
import type {
	PolicyDefinition,
	PolicyFixResult,
	PolicyHandler,
	PolicyStandaloneResolver,
} from "../policy.js";

/**
 * A FluidFramework build-tools policy handler interface.
 *
 * This interface matches the `Handler` interface from `@fluidframework/build-tools`.
 *
 * @alpha
 */
export interface FluidHandler {
	/**
	 * The name of the handler, used for filtering and display.
	 */
	name: string;

	/**
	 * A regex pattern that determines which files this handler applies to.
	 */
	match: RegExp;

	/**
	 * The handler function that checks a file against the policy.
	 *
	 * @param file - Absolute path to the file.
	 * @param root - Path to the repo root.
	 * @returns `undefined` if the check passes, otherwise an error message string.
	 */
	handler: (file: string, root: string) => Promise<string | undefined>;

	/**
	 * Optional resolver function that attempts to fix policy violations.
	 *
	 * @param file - Absolute path to the file.
	 * @param root - Path to the repo root.
	 * @returns An object indicating whether the fix was successful.
	 */
	resolver?: (
		file: string,
		root: string,
	) =>
		| Promise<{ resolved: boolean; message?: string }>
		| { resolved: boolean; message?: string };
}

/**
 * Options for converting FluidFramework handlers to repopo policies.
 *
 * @alpha
 */
export interface FluidAdapterOptions {
	/**
	 * Optional prefix to add to policy names. Useful for namespacing Fluid policies.
	 *
	 * @example "Fluid:" would result in "Fluid:my-handler-name"
	 */
	namePrefix?: string;
}

/**
 * Converts a FluidFramework handler to a repopo PolicyDefinition.
 *
 * This is an internal function used by {@link fromFluidHandlers}.
 *
 * @param fluidHandler - A FluidFramework Handler object to convert.
 * @param options - Optional configuration for the conversion.
 * @returns A repopo PolicyDefinition that wraps the Fluid handler.
 *
 * @internal
 */
function fromFluidHandler(
	fluidHandler: FluidHandler,
	options?: FluidAdapterOptions,
): PolicyDefinition {
	const { namePrefix = "" } = options ?? {};
	const policyName = `${namePrefix}${fluidHandler.name}`;

	const handler: PolicyHandler = async ({ file, root, resolve }) => {
		// Fluid handlers expect absolute paths
		const absolutePath = path.join(root, file);

		const errorMessage = await fluidHandler.handler(absolutePath, root);

		if (errorMessage === undefined) {
			return true;
		}

		// Check if resolver exists to determine if auto-fixable
		const autoFixable = fluidHandler.resolver !== undefined;

		// If resolve is requested and we have a resolver, try to fix
		if (resolve && fluidHandler.resolver !== undefined) {
			const resolveResult = await fluidHandler.resolver(absolutePath, root);

			return {
				name: policyName,
				file,
				errorMessage: resolveResult.message ?? errorMessage,
				autoFixable: true,
				resolved: resolveResult.resolved,
			} satisfies PolicyFixResult;
		}

		return {
			name: policyName,
			file,
			errorMessage,
			autoFixable,
		};
	};

	// Create standalone resolver if Fluid handler has one
	let resolver: PolicyStandaloneResolver | undefined;
	if (fluidHandler.resolver !== undefined) {
		resolver = async ({ file, root }) => {
			const absolutePath = path.join(root, file);

			// First get the error message for context
			const errorMessage = await fluidHandler.handler(absolutePath, root);

			// biome-ignore lint/style/noNonNullAssertion: we checked this is defined above
			const resolveResult = await fluidHandler.resolver!(absolutePath, root);

			return {
				name: policyName,
				file,
				errorMessage: resolveResult.message ?? errorMessage ?? "Unknown error",
				autoFixable: true,
				resolved: resolveResult.resolved,
			};
		};
	}

	return makePolicyDefinition(
		policyName,
		fluidHandler.match,
		handler,
		undefined, // no config
		undefined, // no description
		resolver,
	);
}

/**
 * Converts FluidFramework handlers to repopo PolicyDefinitions.
 *
 * This adapter bridges the gap between FluidFramework's build-tools policy system
 * and repopo's policy system, allowing you to reuse existing Fluid policies in repopo.
 *
 * @remarks
 *
 * Key differences handled by this adapter:
 *
 * - **Handler signature**: Fluid uses `(file, root) => string | undefined`,
 *   repopo uses `(args) => PolicyHandlerResult`
 *
 * - **File paths**: Fluid passes absolute paths, repopo passes repo-relative paths.
 *   The adapter converts between the two.
 *
 * - **Return types**: Fluid returns `string | undefined` (error message or success),
 *   repopo returns `true | PolicyFailure | PolicyFixResult`
 *
 * For a single handler, wrap it in an array: `fromFluidHandlers([handler])`.
 *
 * @example
 * ```typescript
 * import { fromFluidHandlers, makePolicy } from "repopo";
 * import { copyrightFileHeaderHandlers, fluidCaseHandler } from "@fluidframework/build-tools";
 *
 * // Convert multiple handlers with a namespace prefix
 * const FluidCopyrightPolicies = fromFluidHandlers(copyrightFileHeaderHandlers, {
 *   namePrefix: "Fluid:",
 * });
 *
 * // For a single handler, wrap it in an array
 * const [FluidCasePolicy] = fromFluidHandlers([fluidCaseHandler]);
 *
 * const config: RepopoConfig = {
 *   policies: [
 *     ...FluidCopyrightPolicies.map(p => makePolicy(p)),
 *     makePolicy(FluidCasePolicy),
 *   ],
 * };
 * ```
 *
 * @param fluidHandlers - An array of FluidFramework Handler objects to convert.
 * @param options - Optional configuration applied to all conversions.
 * @returns An array of repopo PolicyDefinitions.
 *
 * @alpha
 */
export function fromFluidHandlers(
	fluidHandlers: FluidHandler[],
	options?: FluidAdapterOptions,
): PolicyDefinition[] {
	return fluidHandlers.map((h) => fromFluidHandler(h, options));
}
