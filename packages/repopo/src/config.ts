import {
	DefaultPolicies,
	type DefaultPolicyConfigType,
	type PolicyName,
	type RepoPolicy,
} from "./policy.js";

/**
 * @alpha
 */
export type PolicyNames<
	T extends readonly RepoPolicy<DefaultPolicyConfigType>[],
> = {
	[K in keyof T]: T[K] extends RepoPolicy<DefaultPolicyConfigType>
		? T[K]["name"]
		: never;
}[number];

/**
 * @alpha
 */
export type PerPolicySettings<T extends readonly RepoPolicy<any>[]> =
	| {
			[K in PolicyNames<T>]?: Extract<
				T[number],
				{ name: K }
			> extends RepoPolicy<infer C>
				? C
				: never;
	  }
	| undefined;

/**
 * @alpha
 */
export interface RepopoConfig<
	T extends
		readonly RepoPolicy<DefaultPolicyConfigType>[] = typeof DefaultPolicies,
> {
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
 * Creates a type-safe repopo config with the given policies.
 *
 * @example
 * ```ts
 * const policies = [PackageJsonSorted, SortTsconfigsPolicy] as const;
 * const config = defineConfig(policies, {
 *   perPolicyConfig: {
 *     SortTsconfigsPolicy: { order: ["1", "2"] }
 *   }
 * });
 * ```
 *
 * @alpha
 */
export function defineConfig<
	// biome-ignore lint/suspicious/noExplicitAny: FIXME
	T extends readonly RepoPolicy<any>[],
>(policies: T, config: Omit<RepopoConfig<T>, "policies">): RepopoConfig<T> {
	return {
		policies,
		...config,
	};
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
