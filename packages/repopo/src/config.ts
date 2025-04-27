import type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
import { DefaultPolicies, type DefaultPolicyConfigType, type PolicyName, type RepoPolicy } from "./policy.js";

/**
 * @alpha
 */
export type PerPolicySettings<T extends readonly RepoPolicy<DefaultPolicyConfigType>[]> =
	| {
			[K in T[number]["name"]]?: T[number] extends RepoPolicy<infer C> ? C : never;
	  }
	| undefined;

/**
 * @alpha
 */
export interface RepopoConfig<T extends readonly RepoPolicy<DefaultPolicyConfigType>[] = typeof DefaultPolicies> {
	/**
	 * An array of policies that are enabled.
	 *
	 * See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.
	 */
	policies?: T;

	/**
	 * An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
	 * from policy.
	 */
	excludeFiles?: (string | RegExp)[];

	/**
	 * An object with a policy name as keys that map to an array of strings/regular expressions to
	 * exclude that rule from being checked.
	 */
	excludePoliciesForFiles?: Record<PolicyName, (string | RegExp)[]>;

	/**
	 * Configuration specific to each policy. The keys are policy names and the values are the config type
	 * specified by that policy's generic parameter.
	 */
	perPolicyConfig?: PerPolicySettings<T>;
}

/**
 * The default config applied when no config is found.
 *
 * @alpha
 */
export const DefaultPolicyConfig: RepopoConfig = {
	policies: DefaultPolicies,
	excludeFiles: [],
	excludePoliciesForFiles: {},
};
