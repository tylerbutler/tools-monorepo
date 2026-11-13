import { makePolicy } from "./makePolicy.js";
import { type ConfiguredPolicy, DefaultPolicies } from "./policy.js";

/** Repository-wide policy configuration. @public */
export interface RepopoConfig {
	policies?: ConfiguredPolicy[];
	/** Repo-relative regex exclusions. Strings are case-insensitive. */
	excludeFiles?: (string | RegExp)[];
	/** Git comparison defaults; CLI base overrides CI, which overrides this base. */
	changes?:
		| {
				mode?: "pr" | "local" | "staged" | undefined;
				base?: string | undefined;
		  }
		| undefined;
}

/** The default configuration when no config file is found. @alpha */
export const DefaultPolicyConfig: RepopoConfig = {
	policies: DefaultPolicies.map((definition) => makePolicy(definition)),
	excludeFiles: [],
};
