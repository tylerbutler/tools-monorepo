import { type Logger, findGitRoot } from "@tylerbu/cli-api";
import { type CosmiconfigResult, cosmiconfig } from "cosmiconfig";
import type { RequireAtLeastOne, SetOptional } from "type-fest";
import {
	DefaultPolicies,
	type PolicyHandler,
	type PolicyName,
	type RepoPolicy,
} from "./policy.js";

/**
 * @alpha
 */
export type PerPolicySettings = PolicyHandlerConfigUnion;

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
	excludePoliciesForFiles?: Record<PolicyName, (string | RegExp)[]>;
	includeDefaultPolicies?: boolean;

	policySettings: PolicyHandlerConfigUnion;
}

/**
 * A type representing policy configuration.
 *
 * @alpha
 */
export type PolicyConfig = RequireAtLeastOne<
	OptionalPolicyConfig,
	"policies" | "includeDefaultPolicies"
>;

export const DefaultPolicyConfig: SetOptional<
	Required<PolicyConfig>,
	"policies" | "policySettings"
> = {
	excludeFiles: [],
	excludePoliciesForFiles: {},
	includeDefaultPolicies: true,
};

/**
 * Utility type to stand in for PolicyHandler<C>.
 */
type PolicyType<C> = PolicyHandler<C>;

type ExtractPolicyTypes<T> = T extends { policies: Array<infer P> } ? P : never;

/**
 * A utility type to extract the union of all Record<PolicyName, C> types
 * from PolicyType<C>
 */
type ExtractPolicyConfig<T> = T extends PolicyType<infer C>
	? Record<PolicyName, C>
	: never;

/**
 * This is the type of elements in the policies array of PolicyConfig.
 * In generic terms, this is the union of all C generic types.
 */
type AllPolicyTypes = ExtractPolicyTypes<PolicyConfig>;

/**
 * This is the union of all Record<PolicyName, C> types from AllPolicyTypes.
 */
type PolicyHandlerConfigUnion = ExtractPolicyConfig<AllPolicyTypes>;

// type ExtractRecordUnion<T> = T extends Record<infer K, infer V> ? Record<K, V> : never;

// type AllPolicyRecordUnion = ExtractRecordUnion<AllPolicyConfigs>;

// const a: AllPolicyRecordUnion = {

// }

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
	if (finalConfig.includeDefaultPolicies === true) {
		finalConfig.policies ??= [];
		finalConfig.policies.push(...DefaultPolicies);
	}

	return finalConfig;
}

// export function getPolicyConfigFor<H extends PolicyHandler<C>>(
// 	policy: H,
// 	config: PolicyConfig,
// ): C {
// 	return config.policySettings?.
// }
