import { type Logger, findGitRoot } from "@tylerbu/cli-api";
import { type CosmiconfigResult, cosmiconfig } from "cosmiconfig";
import type { RequireAtLeastOne, SetOptional, SetRequired } from "type-fest";
import {
	DefaultPolicies,
	type PolicyHandler,
	type PolicyName,
	type RepoPolicy,
} from "./policy.js";

/**
 * @alpha
 */
export interface OptionalPolicyConfig {
	// policies?: RepoPolicy[];
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
	excludePoliciesForFiles?: Record<PolicyNames, (string | RegExp)[]>;
	// includeDefaultPolicies?: boolean;

	policySettings?: PerPolicySettings;
}

/**
 * A type representing policy configuration.
 *
 * @alpha
 */
export type PolicyConfig = SetRequired<OptionalPolicyConfig, "policies">;

export const DefaultPolicyConfig: SetOptional<
	Required<PolicyConfig>,
	"policySettings"
> = {
	policies: DefaultPolicies,
	excludeFiles: [],
	excludePoliciesForFiles: {},
	// includeDefaultPolicies: true,
};

// Extract the name property from each RepoPolicy in the policies array
type PolicyNames = PolicyConfig["policies"] extends (infer U)[]
	? U extends { name: infer N }
		? N
		: never
	: never;

/**
 * Utility type that maps each RepoPolicy in the PolicyConfig.policies to its C type
 *
 * Should be a `Record<RepoPolicyName, C>`
 *
 * @alpha
 */
export type HandlerConfigMap = PolicyConfig["policies"] extends (infer U)[]
	? U extends RepoPolicy<infer C>
		? Record<U["name"], C>
		: never
	: never;

/**
 * @alpha
 */
export type HandlerConfigMap2<P extends PolicyConfig["policies"]> =
	P extends (infer U)[]
		? U extends RepoPolicy<infer C>
			? Record<U["name"], C>
			: never
		: never;

/**
 * Merges all individual records into a single record type
 *
 * @public
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type MergeRecords<T> = T extends Record<string, any>
	? { [K in keyof T]: T[K] }
	: never;

/**
 * @alpha
 */
export type PerPolicySettings = MergeRecords<HandlerConfigMap>;

export async function loadConfig(
	configName: string,
	log: Logger,
): Promise<PolicyConfig> {
	const gitRoot = await findGitRoot();
	// this.configPath ??= this.config.configDir; // path.join(this.config.configDir, "config.ts");
	const explorer = cosmiconfig(configName, {
		searchStrategy: "global",
		stopDir: gitRoot,
	});
	log.verbose(`Looking for '${configName}' config at '${gitRoot}'`);
	const config: CosmiconfigResult = await explorer.search(gitRoot);
	if (config?.config !== undefined) {
		log.verbose(`Found config at ${config.filepath}`);
	}
	if (config?.config === undefined) {
		log.warning("No config found; using defaults.");
	}
	const finalConfig: PolicyConfig = config?.config ?? DefaultPolicies;
	// if (finalConfig.includeDefaultPolicies === true) {
	// 	finalConfig.policies ??= [];
	// 	finalConfig.policies.push(...DefaultPolicies);
	// }

	return finalConfig;
}

// export function getPolicyConfigFor<H extends PolicyHandler<C>>(
// 	policy: H,
// 	config: PolicyConfig,
// ): C {
// 	return config.policySettings?.
// }
