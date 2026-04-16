/**
 * Result status of a build task execution
 *
 * @beta
 */
export const BuildResult = {
	Success: "Success",
	UpToDate: "UpToDate",
	Failed: "Failed",
	/** Remote cache hit - task output restored from shared cache */
	CachedSuccess: "CachedSuccess",
	/** Local cache hit - task skipped via donefile */
	LocalCacheHit: "LocalCacheHit",
	/** Task succeeded and output was written to cache */
	SuccessWithCacheWrite: "SuccessWithCacheWrite",
} as const;

/**
 * Build result type
 *
 * @beta
 */
export type BuildResult = (typeof BuildResult)[keyof typeof BuildResult];

/**
 * Summarizes an array of build results into a single result
 * Returns Failed if any result failed, otherwise Success if any succeeded, otherwise UpToDate
 */
export function summarizeBuildResult(results: BuildResult[]): BuildResult {
	let retResult: BuildResult = BuildResult.UpToDate;
	for (const result of results) {
		if (result === BuildResult.Failed) {
			return BuildResult.Failed;
		}

		if (result === BuildResult.Success) {
			retResult = BuildResult.Success;
		}
	}
	return retResult;
}
