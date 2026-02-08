import { call, type Operation } from "effection";
import { isGeneratorFunction } from "./generators.js";
import type {
	ConfiguredPolicy,
	PolicyArgs,
	PolicyDefinition,
	PolicyHandler,
	PolicyHandlerResult,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyShape,
} from "./policy.js";

// ============================================================================
// New API: policy() function
// ============================================================================

/**
 * Options for configuring a policy instance.
 *
 * @alpha
 */
export interface PolicyOptions {
	/**
	 * File paths matching these patterns will be excluded from this policy.
	 * Patterns are matched against repo-relative paths.
	 */
	exclude?: (string | RegExp)[];
}

/**
 * Normalizes a handler to always return an Effection Operation.
 * Detection happens once at registration time, not per-invocation.
 */
function normalizeHandler<C>(
	handler: PolicyHandler<C>,
): (args: PolicyArgs<C>) => Operation<PolicyHandlerResult> {
	if (isGeneratorFunction(handler)) {
		// Already a generator, return as-is
		return handler as (args: PolicyArgs<C>) => Operation<PolicyHandlerResult>;
	}

	// Async function - wrap with call()
	return function* (args: PolicyArgs<C>): Operation<PolicyHandlerResult> {
		const asyncHandler = handler as (
			policyArgs: PolicyArgs<C>,
		) => Promise<PolicyHandlerResult>;
		return yield* call(() => asyncHandler(args));
	};
}

/**
 * Configure a policy for use in repopo.
 *
 * @remarks
 * This function takes a policy definition and returns a configured policy instance
 * that can be added to the `policies` array in `repopo.config.ts`.
 *
 * Handlers are automatically normalized: async functions are wrapped for Effection
 * compatibility, while generator functions are used directly.
 *
 * @example
 * ```typescript
 * // Policy with no config, just options
 * policy(NoJsFileExtensions, { exclude: ["bin/*"] })
 *
 * // Policy with config
 * policy(PackageJsonProperties, { verbatim: { license: "MIT" } })
 *
 * // Policy with config and options
 * policy(PackageJsonProperties, { verbatim: { license: "MIT" } }, { exclude: ["vendor/*"] })
 * ```
 *
 * @alpha
 */
export function policy<C = void>(
	policyDef: PolicyShape<C>,
	options?: PolicyOptions,
): ConfiguredPolicy<C>;
/** @alpha */
export function policy<C>(
	policyDef: PolicyShape<C>,
	config: C,
	options?: PolicyOptions,
): ConfiguredPolicy<C>;
/** @alpha */
export function policy<C>(
	policyDef: PolicyShape<C>,
	configOrOptions?: C | PolicyOptions,
	maybeOptions?: PolicyOptions,
): ConfiguredPolicy<C> {
	// Determine if the second argument is config or options
	let config: C | undefined;
	let options: PolicyOptions | undefined;

	if (maybeOptions !== undefined) {
		// Three-argument form: policy(def, config, options)
		config = configOrOptions as C;
		options = maybeOptions;
	} else if (configOrOptions !== undefined) {
		// Two-argument form: need to determine if it's config or options
		// PolicyOptions has a specific shape with 'exclude' property
		if (
			typeof configOrOptions === "object" &&
			configOrOptions !== null &&
			"exclude" in configOrOptions &&
			!("name" in configOrOptions) &&
			Object.keys(configOrOptions).every((k) => k === "exclude")
		) {
			// It's options (has only 'exclude')
			options = configOrOptions as PolicyOptions;
		} else {
			// It's config
			config = configOrOptions as C;
		}
	}

	// Merge with default config if available
	const effectiveConfig = config ?? (policyDef.defaultConfig as C | undefined);

	// Support both 'exclude' and 'excludeFiles' for backward compatibility
	const excludePatterns = options?.exclude;

	return {
		...policyDef,
		config: effectiveConfig,
		exclude: excludePatterns,
		excludeFiles: excludePatterns,
		_internalHandler: normalizeHandler(policyDef.handler),
	};
}

// ============================================================================
// Legacy API (Still supported for backward compatibility)
// ============================================================================

/**
 * Input arguments for creating a policy definition.
 *
 * @deprecated Use {@link PolicyShape} directly instead.
 *
 * @alpha
 */
export type PolicyDefinitionInput<C = undefined> = PolicyDefinition<C>;

/**
 * Creates a {@link PolicyDefinition} from the provided arguments.
 *
 * @deprecated Define policies as object literals satisfying {@link PolicyShape} instead.
 *
 * @example
 * ```typescript
 * const MyPolicy = makePolicyDefinition({
 *   name: "MyPolicy",
 *   description: "Ensures files follow conventions",
 *   match: /\.ts$/,
 *   handler: async ({ file }) => true,
 * });
 * ```
 *
 * @alpha
 */
export function makePolicyDefinition<C = undefined>(
	args: PolicyDefinitionInput<C>,
): PolicyDefinition<C> {
	return {
		name: args.name,
		description: args.description,
		match: args.match,
		handler: args.handler,
		defaultConfig: args.defaultConfig,
		resolver: args.resolver,
	};
}

/**
 * Combine a {@link PolicyDefinition} with a policy-specific config and other settings.
 *
 * @deprecated Use the `policy` function instead, which has a simpler API.
 *
 * @example
 * ```typescript
 * makePolicy(NoJsFileExtensions, undefined, { excludeFiles: ["bin/*"] })
 * ```
 *
 * @alpha
 */
export function makePolicy<C>(
	definition: PolicyDefinition<C>,
	config?: C,
	settings?: PolicyInstanceSettings<C>,
): PolicyInstance<C> {
	return {
		...definition,
		...settings,
		config,
	} satisfies PolicyInstance<C>;
}
