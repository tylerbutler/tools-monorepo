import type { Logger } from "@tylerbu/cli-api";
import type { Stopwatch } from "@tylerbu/sail-infrastructure";
import chalk from "picocolors";
import { Spinner } from "picospinner";
import { hasTTY, isTest } from "std-env";
import type { BuildPackage } from "../../common/npmPackage.js";
import { ErrorHandler } from "../errors/ErrorHandler.js";
import type {
	IBuildablePackage,
	IBuildExecutionContext,
	IBuildExecutor,
	IBuildResult,
} from "../interfaces/index.js";
import { ParallelProcessor } from "../optimization/ParallelProcessor.js";
import { Task } from "../tasks/task.js";
import { BuildResult, summarizeBuildResult } from "./BuildResult.js";
import { ProgressBarManager } from "./ProgressBarManager.js";

export class BuildExecutor implements IBuildExecutor {
	private readonly errorHandler: ErrorHandler;

	public constructor(
		private readonly log: Logger,
		private readonly context: IBuildExecutionContext,
	) {
		this.errorHandler = new ErrorHandler(log);
	}

	public async executeBuild(
		buildablePackages: ReadonlyMap<BuildPackage, IBuildablePackage>,
		buildTaskNames: string[],
		matchedPackages: number,
		timer?: Stopwatch,
	): Promise<IBuildResult> {
		// Reset all packages to clear cached state (necessary when reusing package instances)
		for (const [, buildablePackage] of buildablePackages) {
			if (
				"reset" in buildablePackage &&
				typeof buildablePackage.reset === "function"
			) {
				buildablePackage.reset();
			}
		}

		// Start performance monitoring
		if (this.context.buildProfiler) {
			this.context.buildProfiler.startBuild();
		}

		// Check up-to-date state at the beginning of the build
		// Only show spinner when running in TTY and not in test mode
		const shouldShowSpinner = hasTTY && !isTest;
		const spinner = shouldShowSpinner
			? new Spinner("Checking incremental build task status...")
			: undefined;
		spinner?.start();

		const isUpToDate = await this.profileOperation(
			"up-to-date-check",
			() => this.checkUpToDateStatus(buildablePackages),
			{ packageCount: buildablePackages.size },
		);

		timer?.log("Check up to date completed");
		if (spinner) {
			spinner.succeed("Tasks loaded.");
		}

		this.logBuildStart(buildTaskNames, matchedPackages, buildablePackages.size);

		if (isUpToDate) {
			return BuildResult.UpToDate;
		}

		if (this.numSkippedTasks) {
			this.log.log(`Skipping ${this.numSkippedTasks} up to date tasks.`);
		}

		// Snapshot the up-to-date count before execution starts
		// This provides a stable denominator for task counters (won't change as tasks complete)
		this.context.taskStats.leafInitialUpToDateCount =
			this.context.taskStats.leafUpToDateCount;

		const result = await this.profileOperation(
			"build-execution",
			() => this.runBuildExecution(buildablePackages),
			{ packageCount: buildablePackages.size, taskNames: buildTaskNames },
		);

		// Generate and log performance report
		if (this.context.buildProfiler) {
			const report = this.context.buildProfiler.endBuild();
			this.context.buildProfiler.logReport(report);

			// Save persistent cache after build completion
			if (
				this.context.fileHashCache instanceof Object &&
				"saveCache" in this.context.fileHashCache &&
				typeof this.context.fileHashCache.saveCache === "function"
			) {
				await this.context.fileHashCache.saveCache();
			}
		}

		return result;
	}

	public async checkInstall(
		buildablePackages: ReadonlyMap<BuildPackage, IBuildablePackage>,
	): Promise<boolean> {
		let succeeded = true;
		for (const [buildPackage] of buildablePackages) {
			if (!(await buildPackage.checkInstall())) {
				succeeded = false;
			}
		}
		return succeeded;
	}

	public get numSkippedTasks(): number {
		return this.context.taskStats.leafUpToDateCount;
	}

	public get totalElapsedTime(): number {
		return this.context.taskStats.leafExecTimeTotal;
	}

	public get totalQueueWaitTime(): number {
		return this.context.taskStats.leafQueueWaitTimeTotal;
	}

	public get taskFailureSummary(): string {
		if (this.context.failedTaskLines.length === 0) {
			return "";
		}
		const summaryLines = this.context.failedTaskLines;
		// Calculate tasks that were not run due to failures
		// Use leafInitialUpToDateCount (stable) instead of leafUpToDateCount (dynamic)
		const notRunCount =
			this.context.taskStats.leafTotalCount -
			this.context.taskStats.leafInitialUpToDateCount -
			this.context.taskStats.leafBuiltCount -
			(this.context.taskStats.leafUpToDateCount -
				this.context.taskStats.leafInitialUpToDateCount);
		summaryLines.unshift(chalk.redBright("Failed Tasks:"));
		summaryLines.push(
			chalk.yellow(`Did not run ${notRunCount} tasks due to prior failures.`),
		);
		return summaryLines.join("\n");
	}

	private async checkUpToDateStatus(
		buildablePackages: ReadonlyMap<BuildPackage, IBuildablePackage>,
	): Promise<boolean> {
		const result = await this.errorHandler.handleAsync(
			async () => {
				const packages = Array.from(buildablePackages.values());

				// Use memory-aware batched processing to reduce peak memory usage
				// Process packages in batches with controlled concurrency
				// This allows GC between batches and prevents memory exhaustion in large monorepos
				return ParallelProcessor.processWithEarlyTerminationBatched(
					packages,
					async (buildablePackage) => buildablePackage.isUpToDate(),
					8, // Concurrency within each batch for file I/O operations
					20, // Batch size to allow periodic GC
				);
			},
			{ command: "up-to-date-check" },
		);
		return result ?? false; // If checking the up-to-date state fails, we assume that the build is not up to date.
	}

	private logBuildStart(
		buildTaskNames: string[],
		matchedPackages: number,
		totalPackages: number,
	): void {
		this.log.log(
			`Start tasks '${chalk.cyanBright(buildTaskNames.join("', '"))}' in ${
				matchedPackages
			} matched packages (${this.context.taskStats.leafTotalCount} total tasks in ${
				totalPackages
			} packages)`,
		);
	}

	private async runBuildExecution(
		buildablePackages: ReadonlyMap<BuildPackage, IBuildablePackage>,
	): Promise<IBuildResult> {
		this.context.fileHashCache.clear();
		const q = Task.createTaskQueue();
		const p: Promise<IBuildResult>[] = [];
		let hasError = false;

		// Calculate total tasks that need to run (excluding up-to-date tasks)
		// Use leafInitialUpToDateCount (stable snapshot) instead of leafUpToDateCount (dynamic)
		// to ensure consistent progress bar denominator throughout execution
		const totalTasks =
			this.context.taskStats.leafTotalCount -
			this.context.taskStats.leafInitialUpToDateCount;

		// Create progress display only in TTY mode, not in quiet mode, and when not testing
		const shouldShowProgress =
			hasTTY && !isTest && !this.context.quiet && totalTasks > 0;

		// Create progress bar manager if we're showing progress
		const progressBar = shouldShowProgress
			? new ProgressBarManager()
			: undefined;

		q.error((err, task) => {
			this.log.errorLog(
				`${task.task.nameColored}: Internal uncaught exception: ${err}\n${err.stack}`,
			);
			hasError = true;
		});

		try {
			// Start building all packages (this queues tasks asynchronously)
			for (const [, buildablePackage] of buildablePackages) {
				p.push(buildablePackage.build(q));
			}

			// Set up progress tracking by monitoring task completion
			if (shouldShowProgress && progressBar) {
				// Start the progress bar and patch console methods
				progressBar.start();

				// Store start time for ETA calculation
				const startTime = Date.now();

				const updateProgress = () => {
					// Calculate execution time skips (tasks skipped during execution via cache/recheck)
					// This matches the calculation in leafTask.ts execDone() for consistent task numbering
					const executionTimeSkips =
						this.context.taskStats.leafUpToDateCount -
						this.context.taskStats.leafInitialUpToDateCount;
					const completedTasks =
						this.context.taskStats.leafBuiltCount + executionTimeSkips;
					const percent = Math.floor((completedTasks / totalTasks) * 100);
					const barWidth = 40;
					const filled = Math.floor((completedTasks / totalTasks) * barWidth);
					const bar = "=".repeat(filled).padEnd(barWidth, " ");

					// Calculate ETA in seconds
					const etaSeconds =
						completedTasks > 0
							? Math.ceil(
									(((Date.now() - startTime) / completedTasks) *
										(totalTasks - completedTasks)) /
										1000,
								)
							: 0;

					// Format ETA as minutes and seconds
					let etaDisplay: string;
					if (etaSeconds >= 60) {
						const minutes = Math.floor(etaSeconds / 60);
						const seconds = etaSeconds % 60;
						etaDisplay = `${minutes}m ${seconds}s`;
					} else {
						etaDisplay = `${etaSeconds}s`;
					}

					progressBar.update(
						`  Building [${bar}] ${percent}% ${completedTasks}/${totalTasks} tasks | ETA: ${etaDisplay}`,
					);
				};

				// Poll for progress updates
				const progressInterval = setInterval(updateProgress, 100);

				try {
					// Wait for all build promises to complete
					const results = await Promise.all(p);

					// Clear the interval and ensure final update
					clearInterval(progressInterval);
					updateProgress();

					// The queue should be empty now, but ensure it's drained just in case
					await q.drain();

					// Finalize the progress bar and persist it
					progressBar.done();

					if (hasError) {
						return BuildResult.Failed;
					}
					return summarizeBuildResult(results as BuildResult[]);
				} catch (error) {
					// Ensure progress bar is cleared on error
					clearInterval(progressInterval);
					progressBar.clear();
					throw error;
				}
			}

			// Wait for all build promises to complete - this ensures tasks have finished executing
			// The build promises resolve when their tasks complete, not just when they're queued
			const results = await Promise.all(p);

			// The queue should be empty now, but ensure it's drained just in case
			await q.drain();

			if (hasError) {
				return BuildResult.Failed;
			}
			return summarizeBuildResult(results as BuildResult[]);
		} finally {
			// Clear the progress display if it was shown
			if (progressBar) {
				progressBar.clear();
			}
			this.context.workerPool?.reset();
		}
	}

	/**
	 * Profile an operation with the build profiler if available
	 */
	private async profileOperation<T>(
		name: string,
		operation: () => Promise<T>,
		metadata?: Record<string, unknown>,
	): Promise<T> {
		if (this.context.buildProfiler) {
			const performanceMonitor = this.context.buildProfiler.performanceMonitor;
			if (performanceMonitor) {
				const { result } = await performanceMonitor.timeAsync(
					name,
					operation,
					metadata,
				);
				return result;
			}
		}
		return operation();
	}
}
