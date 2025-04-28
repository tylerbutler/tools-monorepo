import type { PolicyCreator } from "./generators.js";
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
export type PolicyList = PolicyCreator[];

/**
 * @alpha
 */
export interface RepopoConfig {
	/**
	 * An array of policies that are enabled.
	 *
	 * See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.
	 */

	// biome-ignore lint/suspicious/noExplicitAny: FIXME
	policies?: RepoPolicy<any>[];

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

	// TODO: The type of this argument would ideally be a union of all types Record<Name of RepoPolicy, C of RepoPolicy>
	perPolicyConfig?: PerPolicySettings | undefined;
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
