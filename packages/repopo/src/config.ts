import type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
import { DefaultPolicies, type PolicyName, type RepoPolicy } from "./policy.js";

/**
 * @alpha
 */
export type PerPolicySettings =
	| ({
			PackageJsonProperties: PackageJsonPropertiesSettings;
	  } & Record<PolicyName, unknown>)
	| undefined;

/**
 * @alpha
 */
export interface PolicyConfig {
	/**
	 * An array of policies that are enabled. If this is `undefined`, then all {@link DefaultPolicies} will be enabled.
	 */
	policies?: RepoPolicy[];

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

	policySettings?: PerPolicySettings | undefined;
}

/**
 * The default config applied when no config is found.
 *
 * @alpha
 */
export const DefaultPolicyConfig: PolicyConfig = {
	policies: DefaultPolicies,
	excludeFiles: [],
	excludePoliciesForFiles: {},
};
