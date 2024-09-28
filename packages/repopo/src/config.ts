import type { RepoPolicy } from "./policy.js";

// /**
//  * A type representing policy configuration.
//  *
//  * @alpha
//  */
// export type PolicyConfig = SetRequired<OptionalPolicyConfig, "policies">;

// export const DefaultPolicyConfig: SetOptional<
// 	Required<PolicyConfig>,
// 	"policySettings"
// > = {
// 	policies: DefaultPolicies,
// 	excludeFiles: [],
// 	excludePoliciesForFiles: {},
// 	// includeDefaultPolicies: true,
// };

// Extract the 'name' property from each item in the policies array
type PolicyName<P> = P extends { name: infer N } ? N : never;

// Define a type that is an array of all the 'name' properties of the items in policies
type PolicyNames<P extends RepoPolicy[]> = PolicyName<P[number]>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface PolicyConfig<
	P extends RepoPolicy<unknown | undefined>[] = [],
> {
	// This interface contains an array of RepoPolicies, and each instance may have a different config type C
	policies: RepoPolicy<unknown | undefined>[];

	/**
	 * An array of strings/regular expressions. Paths that match any of these expressions will be completely excluded from
	 * policy.
	 */
	excludeFiles?: (string | RegExp)[];

	/**
	 * An object with a policy name as keys that map to an array of strings/regular expressions to
	 * exclude that rule from being checked.
	 */
	excludePoliciesForFiles?: Record<PolicyNames<P>, (string | RegExp)[]>;
	// includeDefaultPolicies?: boolean;

	// This type of this argument to be a union of all types Record<Name of RepoPolicy, C of RepoPolicy>
	perPolicyConfig?: InferPerPolicyConfig<P>;
}

// Define a type to extract the name and config type from a Policy
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type PolicyConfigMap<P extends RepoPolicy<any>> = P extends RepoPolicy<infer C>
	? Record<P["name"], C>
	: never;

// Define a type to infer the perPolicyConfig type from an array of policies
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type InferPerPolicyConfig<P extends RepoPolicy<any>[]> = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof P]: P[K] extends RepoPolicy<any> ? PolicyConfigMap<P[K]> : never;
}[number];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function defineConfig<P extends RepoPolicy<any>[]>({
	policies,
	perPolicyConfig,
}: PolicyConfig<P>) {
	return { policies, perPolicyConfig };
}
