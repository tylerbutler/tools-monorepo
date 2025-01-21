import type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
import type { PolicyName, RepoPolicy } from "./policy.js";

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
/**
 * @alpha
 */
export interface RepopoConfig {
	// This interface contains an array of RepoPolicies, and each instance may have a different config type C
	policies: RepoPolicy[];

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

	// This type of this argument to be a union of all types Record<Name of RepoPolicy, C of RepoPolicy>
	perPolicyConfig?: PerPolicySettings | undefined;
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
