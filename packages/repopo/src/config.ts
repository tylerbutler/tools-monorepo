import type { PolicyCreator } from "./generators.js";
import { policy } from "./makePolicy.js";
import type { ConfiguredPolicy, PolicyInstance } from "./policy.js";
import { DefaultPolicies } from "./policy.js";

/**
 * @alpha
 */
export type PolicyList = PolicyCreator[];

/**
 * @alpha
 */
export interface RepopoConfig {
	/**
	 * An array of configured policies that are enabled.
	 *
	 * Use the `policy()` function to configure policies before adding them to this array.
	 *
	 * @example
	 * ```typescript
	 * import { policy, type RepopoConfig } from "repopo";
	 * import { NoJsFileExtensions, PackageJsonProperties } from "repopo/policies";
	 *
	 * const config: RepopoConfig = {
	 *   policies: [
	 *     policy(NoJsFileExtensions, { exclude: ["bin/*"] }),
	 *     policy(PackageJsonProperties, { verbatim: { license: "MIT" } }),
	 *   ],
	 * };
	 * ```
	 *
	 * See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: FIXME
	policies?: (ConfiguredPolicy<any> | PolicyInstance<any>)[];

	/**
	 * An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
	 * from all policies.
	 */
	excludeFiles?: (string | RegExp)[];
}

/**
 * The default config applied when no config is found.
 *
 * @alpha
 */
export const DefaultPolicyConfig: RepopoConfig = {
	policies: DefaultPolicies.map((p) => policy(p)),
	excludeFiles: [],
};
