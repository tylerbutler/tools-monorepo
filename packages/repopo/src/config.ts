import { makePolicy } from "./makePolicy.js";
import { type ConfiguredPolicy, DefaultPolicies } from "./policy.js";
import type { RepositoryChangeOptions } from "./repositoryChanges.js";

/** Repository-wide policy configuration. @public */
export interface RepopoConfig {
	policies?: ConfiguredPolicy[];
	/** Repo-relative regex exclusions. Strings are case-insensitive. */
	excludeFiles?: (string | RegExp)[];
	/** Options used when a CLI check requests a change snapshot. */
	changes?: RepositoryChangeOptions | undefined;
}

/** The default configuration when no config file is found. @alpha */
export const DefaultPolicyConfig: RepopoConfig = {
	policies: DefaultPolicies.map((definition) => makePolicy(definition)),
	excludeFiles: [],
};
