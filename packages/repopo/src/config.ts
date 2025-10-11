import type { PolicyCreator } from "./generators.ts";
import { makePolicy } from "./makePolicy.ts";
import { DefaultPolicies, type PolicyInstance } from "./policy.ts";

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
	policies?: PolicyInstance<any>[];

	/**
	 * An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
	 * from policy.
	 */
	excludeFiles?: (string | RegExp)[];
}

/**
 * The default config applied when no config is found.
 *
 * @alpha
 */
export const DefaultPolicyConfig: RepopoConfig = {
	policies: DefaultPolicies.map((p) => makePolicy(p)),
	excludeFiles: [],
	// excludePoliciesForFiles: {},
};
