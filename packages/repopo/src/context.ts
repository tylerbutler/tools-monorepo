import type { PolicyHandlerPerfStats } from "./perf.js";
import type { IdentifiedPolicy, PolicyInstanceId } from "./policy.js";

/**
 * A map of policy instance IDs to file-path regexes that should be excluded from those policies.
 * @alpha
 */
export type ExcludedPolicyFileMap = Map<PolicyInstanceId, RegExp[]>;

/**
 * Creates the per-instance exclusion map used by policy runners.
 *
 * @internal
 */
export function createExcludedPolicyFileMap(
	policies: IdentifiedPolicy[],
): ExcludedPolicyFileMap {
	return new Map(
		policies.map((configuredPolicy) => [
			configuredPolicy.instanceId,
			configuredPolicy.excludeFiles?.map(
				(pattern) => new RegExp(pattern, "i"),
			) ?? [],
		]),
	);
}

/**
 * Contextual data available to all Repopo commands.
 */
export interface RepopoCommandContext {
	/**
	 * A list of regular expressions used to exclude files from all handlers.
	 */
	excludeFromAll: RegExp[];

	/**
	 * A list of handlers to apply to selected files.
	 */
	policies: IdentifiedPolicy[];

	/**
	 * A per-handler list of regular expressions used to exclude files from specific handlers.
	 */
	excludePoliciesForFiles: ExcludedPolicyFileMap;

	/**
	 * Path to the root of the git repo.
	 */
	gitRoot: string;

	/**
	 * Stores performance data for each handler. Used to collect and display performance stats.
	 */
	perfStats: PolicyHandlerPerfStats;
}
