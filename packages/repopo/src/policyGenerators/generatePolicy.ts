import type {
	PolicyDefinition,
	PolicyHandler,
	PolicyInstance,
	PolicyInstanceSettings,
	PolicyName,
	PolicyStandaloneResolver,
} from "../policy.js";

export function generatePolicyFunction(name: PolicyName, description?: string) {
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

export function generatePolicy<C = undefined>(
	name: PolicyName,
	match: RegExp,
	handler: PolicyHandler<C>,
	defaultConfig?: C,
	description?: string,
	resolver?: PolicyStandaloneResolver<C>,
) {
	return generatePolicyFunction(name, description)(
		match,
		handler,
		defaultConfig,
		resolver,
	);
}

/**
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

// export function policyWithExclusions<C>(
// 	policy: RepoPolicyDefinition<C>,
// 	config: C,
// 	settings: { excludeFiles: (string | RegExp)[] },
// ): RepoPolicyDefinition<C> & { excludeFiles: (string | RegExp)[] } {
// 	const { name, description, match, handler, defaultConfig, resolver } = policy;
// 	const pol: RepoPolicyDefinition<C> & { excludeFiles: (string | RegExp)[] } =
// 		defu(
// 			generatePolicy(
// 				name,
// 				match,
// 				handler,
// 				defaultConfig,
// 				description,
// 				resolver,
// 			),
// 			settings,
// 		);
// 	return pol;
// }
