import type {
	PolicyDefinition,
	PolicyHandler,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyName,
	PolicyStandaloneResolver,
} from "../policy.js";

function generatePolicyFunction(name: PolicyName, description?: string) {
	return <C>(
		match: RegExp,
		handler: PolicyHandler<C>,
		defaultConfig?: C,
		resolver?: PolicyStandaloneResolver<C>,
	): PolicyDefinition<C> => {
		return {
			name,
			match,
			handler,
			description,
			defaultConfig,
			resolver,
		};
	};
}

export function makePolicyDefinition<C = undefined>(
	name: PolicyName,
	match: RegExp,
	handler: PolicyHandler<C>,
	defaultConfig?: C,
	description?: string,
	resolver?: PolicyStandaloneResolver<C>,
): PolicyDefinition<C> {
	return generatePolicyFunction(name, description)(
		match,
		handler,
		defaultConfig,
		resolver,
	);
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
