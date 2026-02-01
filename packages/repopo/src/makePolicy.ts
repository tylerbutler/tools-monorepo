import type {
	PolicyDefinition,
	PolicyInstance,
	PolicyInstanceSettings,
} from "./policy.js";

/**
 * Input arguments for creating a policy definition.
 *
 * @remarks
 * This type is identical to {@link PolicyDefinition} but is used as the input type
 * for {@link makePolicyDefinition} to make the API more explicit.
 *
 * @alpha
 */
export type PolicyDefinitionInput<C = undefined> = PolicyDefinition<C>;

/**
 * Creates a {@link PolicyDefinition} from the provided arguments.
 *
 * @remarks
 * This function accepts an object with all policy properties, making it easier
 * to add new optional properties in the future without breaking changes.
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
 * Combine a {@link PolicyDefinition} with a policy-specific config and other settings to produce a {@link PolicyInstance}.
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
