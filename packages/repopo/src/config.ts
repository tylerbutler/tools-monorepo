import type { RequireAtLeastOne, SetOptional } from "type-fest";
import type { PolicyName, RepoPolicy } from "./api.js";
import type { PackageJsonPropertiesSettings } from "./policies/PackageJsonProperties.js";
export type PerPolicySettings =
	| ({
			PackageJsonProperties: PackageJsonPropertiesSettings;
	  } & Record<PolicyName, unknown>)
	| undefined;

export interface OptionalPolicyConfig {
	policies?: RepoPolicy[];

	/**
	 * An array of strings/regular expressions. Paths that match any of these expressions will be completely excluded from
	 * policy.
	 */
	excludeFiles?: (string | RegExp)[];

	/**
	 * An object with a policy name as keys that map to an array of strings/regular expressions to
	 * exclude that rule from being checked.
	 */
	excludePoliciesForFiles?: Record<PolicyName, (string | RegExp)[]>;
	includeDefaultPolicies?: boolean;
	// policySettings?: Record<
	// 	PolicyName,
	// 	{
	// 		PackageJsonProperties: PackageJsonPropertiesSettings;
	// 	} & Record<string, unknown>
	// >;

	policySettings?: PerPolicySettings | undefined;
}

export type PolicyConfig = RequireAtLeastOne<
	OptionalPolicyConfig,
	"policies" | "includeDefaultPolicies"
>;

export const DefaultPolicyConfig: // PolicyConfig
SetOptional<Required<PolicyConfig>, "policies" | "policySettings"> = {
	excludeFiles: [],
	excludePoliciesForFiles: {},
	includeDefaultPolicies: true,
};
