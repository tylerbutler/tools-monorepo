import type { PolicyHandlerPerfStats } from "./perf.js";
import type { PolicyName, RepoPolicy } from "./policy.js";

export type ExcludedPolicyFileMap = Map<PolicyName, RegExp[]>;

/**
 * Contextual data available to all Repopo commands.
 */
export interface RepopoCommandContext {
	/**
	 * A list of regular expressions used to exclude files from all handlers.
	 */
	excludeFiles: RegExp[];

	/**
	 * A list of handlers to apply to selected files.
	 */
	policies: RepoPolicy[];

	/**
	 * A per-handler list of regular expressions used to exclude files from specific handlers.
	 */
	excludePoliciesForFiles: ExcludedPolicyFileMap;

	/**
	 * Path to the root of the git repo.
	 */
	gitRoot: string;

	/**
	 * Performance information for each handler.
	 */
	perfStats: PolicyHandlerPerfStats;
}
