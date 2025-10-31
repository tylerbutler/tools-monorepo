import type { Stopwatch } from "@tylerbu/sail-infrastructure";
import type { AsyncPriorityQueue } from "async";
import type { BuildPackage } from "../../common/npmPackage.js";
import type { BuildProfiler } from "../performance/BuildProfiler.js";
import type { TaskExec } from "../tasks/task.js";

/**
 * Build result type (using the same values as the concrete BuildResult enum)
 */
export type IBuildResult = "Success" | "UpToDate" | "Failed";

/**
 * Buildable package interface
 */
export interface IBuildablePackage {
	build(q: AsyncPriorityQueue<TaskExec>): Promise<IBuildResult>;
	isUpToDate(): Promise<boolean>;
}

/**
 * Build statistics interface
 */
export interface IBuildStats {
	leafTotalCount: number;
	leafUpToDateCount: number;
	leafBuiltCount: number;
	leafExecTimeTotal: number;
	leafQueueWaitTimeTotal: number;
}

/**
 * Build execution context interface
 */
export interface IBuildExecutionContext {
	readonly taskStats: IBuildStats;
	readonly failedTaskLines: string[];
	readonly fileHashCache: {
		clear(): void;
	};
	readonly workerPool?: {
		reset(): void;
	};
	readonly buildProfiler?: BuildProfiler;
}

/**
 * Build executor interface for orchestrating build execution
 */
export interface IBuildExecutor {
	/**
	 * Executes a build across multiple packages
	 */
	executeBuild(
		buildablePackages: ReadonlyMap<BuildPackage, IBuildablePackage>,
		buildTaskNames: string[],
		matchedPackages: number,
		timer?: Stopwatch,
	): Promise<IBuildResult>;

	/**
	 * Checks installation status of packages
	 */
	checkInstall(
		buildablePackages: ReadonlyMap<BuildPackage, IBuildablePackage>,
	): Promise<boolean>;

	/**
	 * Gets the number of skipped tasks
	 */
	get numSkippedTasks(): number;

	/**
	 * Gets the total elapsed time
	 */
	get totalElapsedTime(): number;

	/**
	 * Gets the total queue wait time
	 */
	get totalQueueWaitTime(): number;

	/**
	 * Gets the task failure summary
	 */
	get taskFailureSummary(): string;
}
