import { defu } from "defu";

import type {
	PolicyHandler,
	PolicyName,
	PolicyStandaloneResolver,
	RepoPolicy,
} from "../policy.js";

export function generatePolicyFunction(name: PolicyName, description?: string) {
	return <C>(
		match: RegExp,
		handler: PolicyHandler<C>,
		defaultConfig?: C,
		resolver?: PolicyStandaloneResolver<C>,
	): RepoPolicy<C> => {
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

export function policyWithConfig<C>(
	policy: RepoPolicy<C>,
	config: C,
): RepoPolicy<C> {
	const { name, description, match, handler, defaultConfig, resolver } = policy;
	const pol: RepoPolicy<C> & { excludeFiles: (string | RegExp)[] } = defu(
		generatePolicy(name, match, handler, defaultConfig, description, resolver),
		settings,
	);
	return pol;
}

export function policyWithExclusions<C>(
	policy: RepoPolicy<C>,
	config: C,
	settings: { excludeFiles: (string | RegExp)[] },
): RepoPolicy<C> & { excludeFiles: (string | RegExp)[] } {
	const { name, description, match, handler, defaultConfig, resolver } = policy;
	const pol: RepoPolicy<C> & { excludeFiles: (string | RegExp)[] } = defu(
		generatePolicy(name, match, handler, defaultConfig, description, resolver),
		settings,
	);
	return pol;
}
