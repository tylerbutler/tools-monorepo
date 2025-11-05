import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AsyncPriorityQueue } from "async";
import registerDebug from "debug";
import chalk from "picocolors";
import {
	type ExecAsyncResult,
	execAsync,
	getExecutableFromCommand,
} from "../../../common/utils.js";
import type { BuildContext } from "../../buildContext.js";
import type { BuildGraphPackage } from "../../buildGraph.js";
import { DependencyError } from "../../errors/DependencyError.js";
import { BuildResult } from "../../execution/BuildResult.js";
import type { ICacheableTask } from "../../interfaces/ICacheableTask.js";
import { defaultOptions } from "../../options.js";
import type {
	CacheKeyInputs,
	StoreResult,
	TaskOutputs,
} from "../../sharedCache/index.js";
import { Task, type TaskExec } from "../task.js";

const traceTaskCheck = registerDebug("sail:task:check");
const traceTaskInitDep = registerDebug("sail:task:init:dep");
const traceTaskInitWeight = registerDebug("sail:task:init:weight");
const _traceTaskExec = registerDebug("sail:task:exec");
const _traceTaskCache = registerDebug("sail:task:cache");
const traceTaskQueue = registerDebug("sail:task:exec:queue");
const traceCacheKey = registerDebug("sail:cache:key");
const traceUpToDate = registerDebug("sail:task:uptodate");

// Global counter for task instance tracking
let taskInstanceCounter = 0;

interface TaskExecResult extends ExecAsyncResult {
	worker?: boolean;
}

/**
 * @beta
 */
export abstract class LeafTask extends Task implements ICacheableTask {
	// Unique instance ID for debugging
	private readonly instanceId: number = ++taskInstanceCounter;

	// initialize during initializeDependentLeafTasks
	private dependentLeafTasks?: Set<LeafTask>;

	// set of direct parent that this task will unblock
	private directParentLeafTasks: LeafTask[] = [];
	private _parentLeafTasks: Set<LeafTask> | undefined | null;
	private parentWeight = -1;

	// Store promises of dependent tasks to wait for them in exec()
	protected dependentTaskPromises?: Promise<BuildResult>[];

	// For task that needs to override the actual command to execute
	protected get executionCommand() {
		return this.command;
	}

	public constructor(
		node: BuildGraphPackage,
		command: string,
		context: BuildContext,
		taskName: string | undefined,
		private readonly isTemp: boolean = false, // indicate if the task is for temporary and not for execution.
	) {
		super(node, command, context, taskName);
		traceUpToDate(
			`Created task #${this.instanceId}: ${this.nameColored} (pkg: ${node.pkg.nameColored})`,
		);
		if (!this.isDisabled) {
			this.node.taskStats.leafTotalCount++;
		}
	}

	public initializeDependentLeafTasks() {
		this.ensureDependentLeafTasks();
	}

	private ensureDependentLeafTasks() {
		if (this.dependentLeafTasks === undefined) {
			this.dependentLeafTasks = new Set();
			this.addDependentLeafTasks(this.transitiveDependentLeafTask);
		}
		return this.dependentLeafTasks;
	}

	public addDependentLeafTasks(dependentLeafTasks: Iterable<LeafTask>): void {
		const dependentLeafTaskSet = this.ensureDependentLeafTasks();
		for (const task of dependentLeafTasks) {
			if (!dependentLeafTaskSet.has(task)) {
				dependentLeafTaskSet.add(task);
				task.directParentLeafTasks.push(this);
				traceTaskInitDep(`${this.nameColored} -> ${task.nameColored}`);
			}
		}
	}

	public collectLeafTasks(leafTasks: Set<LeafTask>) {
		leafTasks.add(this);
	}

	public initializeWeight() {
		if (this.parentWeight === -1) {
			this.parentWeight = this.computeParentWeight() + this.taskWeight;
			traceTaskInitWeight(`${this.nameColored}: ${this.parentWeight}`);
		}
		return this.parentWeight;
	}

	private computeParentWeight() {
		let sum = 0;
		for (const t of this.parentLeafTasks.values()) {
			sum += t.taskWeight;
		}
		return sum;
	}

	// Gather all tasks that depending on this task, so we can use it compute the weight.
	// Collecting  to make sure we don't double count the weight of the same task
	private get parentLeafTasks(): Set<LeafTask> {
		if (this._parentLeafTasks === null) {
			// Circular dependency, start unrolling
			throw [this];
		}
		try {
			if (this._parentLeafTasks === undefined) {
				const parentLeafTasks = new Set<LeafTask>(this.directParentLeafTasks);
				this._parentLeafTasks = null;
				// biome-ignore lint/complexity/noForEach: forEach is more concise for nested iterations
				this.directParentLeafTasks
					.map((task) => task.parentLeafTasks)
					// biome-ignore lint/complexity/noForEach: forEach is more concise for Set operations
					// biome-ignore lint/suspicious/useIterableCallbackReturn: Set.add returns the set but we don't need it
					.forEach((p) => p.forEach((t) => parentLeafTasks.add(t)));
				this._parentLeafTasks = parentLeafTasks;
			}
			return this._parentLeafTasks;
		} catch (e) {
			if (Array.isArray(e)) {
				// Add to the dependency chain
				e.push(this);
				if (e[0] === this) {
					// detected a cycle, convert into a message
					const taskChain = e.map((v) => v.nameColored);
					throw DependencyError.circularTaskDependency(
						taskChain,
						this.node.pkg.nameColored,
					);
				}
			}
			throw e;
		}
	}

	protected get taskWeight() {
		return 1;
	}

	public get weight() {
		// biome-ignore lint/suspicious/noMisplacedAssertion: Runtime invariant check, not a test assertion
		assert.notStrictEqual(this.parentWeight, -1);
		return this.parentWeight;
	}

	public get isDisabled() {
		if (this.isTemp) {
			return true;
		}
		return false;
	}

	public get executable() {
		return getExecutableFromCommand(
			this.command,
			this.context.sailConfig?.multiCommandExecutables ?? [],
		);
	}

	protected get useWorker() {
		return false;
	}
	public async exec(): Promise<BuildResult> {
		if (this.isDisabled) {
			return BuildResult.UpToDate;
		}

		// Wait for dependent tasks to complete before executing
		if (this.dependentTaskPromises && this.dependentTaskPromises.length > 0) {
			const results = await Promise.all(this.dependentTaskPromises);
			// Check if any dependency failed
			for (const result of results) {
				if (result === BuildResult.Failed) {
					return BuildResult.Failed;
				}
			}
		}

		const startTime = Date.now();

		// Try to restore from shared cache AFTER dependencies complete
		// This ensures dependency outputs exist for getDoneFileContent() to work,
		// enabling proper cascading cache invalidation based on dependency hashes.
		if (this.node.sharedCache && this.canUseCache) {
			traceUpToDate(
				`${this.nameColored}: trying cache restore after deps complete`,
			);
			const cacheHit = await this.tryRestoreFromCache();
			if (cacheHit) {
				this.traceExec("Skipping Leaf Task (cache hit)");
				traceUpToDate(`${this.nameColored}: cache HIT (restored)`);
				// Don't increment leafUpToDateCount here - execDone will increment leafBuiltCount
				// Cache-restored tasks are counted as "built" (just very quickly)
				return this.execDone(startTime, BuildResult.CachedSuccess);
			}
			traceUpToDate(`${this.nameColored}: cache MISS (will execute)`);
		}

		if (defaultOptions.showExec) {
			this.node.taskStats.leafBuiltCount++;
			const totalTask =
				this.node.taskStats.leafTotalCount -
				this.node.taskStats.leafUpToDateCount;
			const taskNum = this.node.taskStats.leafBuiltCount
				.toString()
				.padStart(totalTask.toString().length, " ");
			this.log.log(
				`[${taskNum}/${totalTask}] ${this.node.pkg.nameColored}: ${this.command}`,
			);
		}
		if (
			this.recheckLeafIsUpToDate &&
			!this.forced &&
			(await this.checkLeafIsUpToDate())
		) {
			return this.execDone(startTime, BuildResult.UpToDate);
		}
		const ret = await this.execCore();

		if (ret.error) {
			const codeStr =
				ret.error.code !== undefined ? ` (exit code ${ret.error.code})` : "";
			this.log.errorLog(
				`${this.node.pkg.nameColored}: error during command '${this.command}'${codeStr}`,
			);
			this.log.errorLog(this.getExecErrors(ret));
			return this.execDone(startTime, BuildResult.Failed);
		}
		if (ret.stderr) {
			// no error code but still error messages, treat them is non fatal warnings
			this.log.warning(
				`${this.node.pkg.nameColored}: warning during command '${this.command}'`,
			);
			this.log.warning(this.getExecErrors(ret));
		}

		await this.markExecDone();

		// Store in shared cache after successful execution
		const executionTimeMs = Date.now() - startTime;
		let cacheWriteResult: StoreResult | undefined;
		if (this.node.sharedCache && this.canUseCache) {
			cacheWriteResult = await this.storeInCache(
				executionTimeMs,
				ret.stdout ?? "",
				ret.stderr ?? "",
			);
		}

		// Determine final build result based on cache write status
		const buildResult =
			cacheWriteResult?.success === true
				? BuildResult.SuccessWithCacheWrite
				: BuildResult.Success;
		const cacheSkipReason = cacheWriteResult?.reason;

		return this.execDone(
			startTime,
			buildResult,
			ret.worker,
			undefined,
			cacheSkipReason,
		);
	}

	private async execCore(): Promise<TaskExecResult> {
		const workerPool = this.node.workerPool;
		if (workerPool && this.useWorker) {
			const workerResult = await workerPool.runOnWorker(
				this.executable,
				this.executionCommand,
				this.node.pkg.directory,
			);
			if (workerResult.code === 0 || !workerResult.error) {
				return {
					error:
						workerResult.code === 0
							? null
							: {
									name: "Worker error",
									message: "Worker error",
									cmd: this.executionCommand,
									code: workerResult.code,
								},
					stdout: workerResult.stdout ?? "",
					stderr: workerResult.stderr ?? "",
					worker: true,
				};
			}
			// rerun on the main thread in case the work has an unknown exception
			const result = await this.execCommand();
			if (!result.error) {
				this.log.warning(
					`${this.node.pkg.nameColored}: warning: worker failed with code ${workerResult.code} but succeeded directly '${this.command}'`,
				);
				if (workerResult.error) {
					if (workerResult.error.stack) {
						this.log.warning(workerResult.error.stack);
					} else {
						this.log.warning(
							`${workerResult.error.name}: ${workerResult.error.message}`,
						);
					}
				}
			}
			return result;
		}
		return this.execCommand();
	}

	private async execCommand(): Promise<ExecAsyncResult> {
		if (this.executionCommand === "") {
			return { error: null, stdout: "", stderr: "" };
		}
		return execAsync(this.executionCommand, {
			cwd: this.node.pkg.directory,
			env: {
				// biome-ignore lint/style/noProcessEnv: Need to pass parent environment to child process
				...process.env,
				PATH: `${path.join(this.node.pkg.directory, "node_modules", ".bin")}${path.delimiter}${
					// biome-ignore lint/complexity/useLiteralKeys: PATH may not be defined as a property
					// biome-ignore lint/style/noProcessEnv: Need to preserve PATH for child process
					process.env["PATH"]
				}`,
			},
		});
	}

	private getExecErrors(ret: ExecAsyncResult) {
		let errorMessages = ret.stdout;
		if (ret.stderr) {
			errorMessages = `${errorMessages}\n${ret.stderr}`;
		}
		errorMessages = errorMessages.trim();
		if (defaultOptions.vscode) {
			errorMessages = this.getVsCodeErrorMessages(errorMessages);
		} else {
			errorMessages = errorMessages.replace(
				/\n/g,
				`\n${this.node.pkg.nameColored}: `,
			);
			errorMessages = `${this.node.pkg.nameColored}: ${errorMessages}`;
		}
		return errorMessages;
	}

	private execDone(
		startTime: number,
		status: BuildResult,
		worker?: boolean,
		_originalExecutionTimeMs?: number,
		cacheSkipReason?: string,
	) {
		if (!defaultOptions.showExec) {
			let statusCharacter = " ";
			// biome-ignore lint/style/useDefaultSwitchClause: all BuildResult values are explicitly handled
			switch (status) {
				case BuildResult.Success:
					statusCharacter = chalk.yellowBright("\u2713");
					break;
				case BuildResult.UpToDate:
					statusCharacter = chalk.cyanBright("\u25CB"); // ○ (empty circle)
					break;
				case BuildResult.Failed:
					statusCharacter = chalk.redBright("x");
					break;
				case BuildResult.CachedSuccess:
					statusCharacter = chalk.blueBright("\u21E9"); // ⇩ (downward white arrow)
					break;
				case BuildResult.SuccessWithCacheWrite:
					statusCharacter = chalk.greenBright("\u21E7"); // ⇧ (upward white arrow)
					break;
				case BuildResult.LocalCacheHit:
					statusCharacter = chalk.greenBright("\u25A0"); // ■ (filled square)
					break;
			}

			this.node.taskStats.leafBuiltCount++;
			const totalTask =
				this.node.taskStats.leafTotalCount -
				this.node.taskStats.leafUpToDateCount;
			const taskNum = this.node.taskStats.leafBuiltCount
				.toString()
				.padStart(totalTask.toString().length, " ");
			const elapsedTime = (Date.now() - startTime) / 1000;
			const workerMsg = worker ? "[worker] " : "";
			const suffix = this.isIncremental ? "" : " (non-incremental)";

			// Add cache skip reason if present
			const cacheMsg = cacheSkipReason
				? ` (cache not uploaded: ${cacheSkipReason})`
				: "";

			const statusString = `[${taskNum}/${totalTask}] ${statusCharacter} ${
				this.node.pkg.nameColored
			}: ${workerMsg}${this.command} - ${elapsedTime.toFixed(3)}s${suffix}${cacheMsg}`;
			this.log.log(statusString);
			if (status === BuildResult.Failed) {
				this.node.failedTaskLines.push(statusString);
			}
			this.node.taskStats.leafExecTimeTotal += elapsedTime;
		}
		return status;
	}

	protected async runTask(
		q: AsyncPriorityQueue<TaskExec>,
	): Promise<BuildResult> {
		this.traceExec("Begin Leaf Task");

		// Start all dependent tasks (but don't wait for them to complete)
		// They will be queued and run in parallel
		const dependentPromises: Promise<BuildResult>[] = [];
		const deps = Array.from(this.getDependentLeafTasks());
		for (const dependentLeafTask of deps) {
			dependentPromises.push(dependentLeafTask.run(q));
		}

		// Store the dependent task promises so we can wait for them in exec()
		this.dependentTaskPromises = dependentPromises;

		// Queue this task immediately - it will wait for dependencies when executed
		return new Promise((resolve) => {
			traceTaskQueue(`${this.nameColored}: queued with weight ${this.weight}`);
			// biome-ignore lint/nursery/noFloatingPromises: push is synchronous despite returning a promise-like interface
			q.push({ task: this, resolve, queueTime: Date.now() }, -this.weight);
		});
	}

	protected async checkIsUpToDate(): Promise<boolean> {
		traceUpToDate(`${this.nameColored}: checkIsUpToDate called`);

		if (this.isDisabled) {
			// disabled task are not included in the leafTotalCount
			// so we don't need to update the leafUpToDateCount as well. Just return.
			return true;
		}

		if (!(await this.checkDependentLeafTasksIsUpToDate())) {
			traceUpToDate(`${this.nameColored}: dependent tasks not up to date`);
			return false;
		}

		// NOTE: Cache check moved to exec() to ensure dependencies have completed
		// and their output files exist for getDoneFileContent() to work correctly.
		// This enables proper cascading cache invalidation based on dependency hashes.

		const start = Date.now();
		const leafIsUpToDate = await this.checkLeafIsUpToDate();
		traceTaskCheck(
			`${this.nameColored}: checkLeafIsUpToDate: ${Date.now() - start}ms`,
		);
		if (leafIsUpToDate) {
			this.node.taskStats.leafUpToDateCount++;
			this.traceExec("Skipping Leaf Task");
		}
		traceUpToDate(`${this.nameColored}: leafIsUpToDate=${leafIsUpToDate}`);

		return leafIsUpToDate;
	}

	private async checkDependentLeafTasksIsUpToDate(): Promise<boolean> {
		const dependentLeafTasks = this.getDependentLeafTasks();
		for (const dependentLeafTask of dependentLeafTasks) {
			if (!(await dependentLeafTask.isUpToDate())) {
				this.traceTrigger(
					`dependent task ${dependentLeafTask.toString()} not up to date`,
				);
				return false;
			}
		}
		return true;
	}

	protected getDependentLeafTasks() {
		this.dependentLeafTasks ??= new Set();
		// biome-ignore lint/suspicious/noMisplacedAssertion: Runtime invariant check, not a test assertion
		assert.notStrictEqual(this.dependentLeafTasks, undefined);
		// biome-ignore lint/style/noNonNullAssertion: null-coalescing assignment ensures non-null value
		return this.dependentLeafTasks!.values();
	}

	/**
	 * Returns the absolute path to a package-relative path within the repo.
	 *
	 * @param filePath - a path relative to the package being processed by this task.
	 * @returns An absolute path to the file.
	 */
	protected getPackageFileFullPath(filePath: string): string {
		if (path.isAbsolute(filePath)) {
			return filePath;
		}
		return path.join(this.node.pkg.directory, filePath);
	}

	/**
	 * Whether this task type supports shared caching.
	 * Override to return false for tasks that shouldn't be cached.
	 */
	public get canUseCache(): boolean {
		return true; // Most tasks can be cached
	}

	/**
	 * Get input files for cache key computation.
	 * Defaults to empty array - subclasses should override if they support caching.
	 */
	public async getCacheInputFiles(): Promise<string[]> {
		return [];
	}

	/**
	 * Get output files for cache storage/verification.
	 * Defaults to empty array - subclasses should override if they support caching.
	 */
	public async getCacheOutputFiles(): Promise<string[]> {
		return [];
	}

	/**
	 * Compute hashes from dependent tasks' donefile content.
	 * This enables cascading cache invalidation: when a dependency's outputs change,
	 * its donefile content changes, which changes these hashes, which invalidates
	 * this task's cache key.
	 *
	 * Must be called AFTER dependencies have completed (either restored from cache
	 * or executed), so their output files exist for getDoneFileContent() to work.
	 */
	protected async getDependencyHashes(): Promise<
		Array<{ name: string; hash: string }>
	> {
		const hashes: Array<{ name: string; hash: string }> = [];
		const dependentTasks = Array.from(this.getDependentLeafTasks());

		for (const depTask of dependentTasks) {
			// Only tasks with donefiles can provide content
			if (depTask instanceof LeafWithDoneFileTask) {
				try {
					// Compute donefile content hash from dep's donefile
					const donefileHash = await depTask.computeDonefileHash();
					if (donefileHash) {
						hashes.push({
							name: depTask.name,
							hash: donefileHash,
						});
					}
				} catch (error) {
					// If we can't get dep's donefile content, skip it
					// This can happen if dep's outputs are missing (corrupt cache)
					this.traceError(
						`Failed to get dependency hash for ${depTask.name}: ${error}`,
					);
				}
			}
		}

		return hashes;
	}

	/**
	 * Try to restore task outputs from shared cache.
	 * Returns true if cache hit, false if cache miss.
	 */
	private async tryRestoreFromCache(): Promise<boolean> {
		const cache = this.node.sharedCache;
		if (!cache) {
			return false;
		}

		try {
			// Get input files for cache key
			const inputFiles = await this.getCacheInputFiles();
			if (inputFiles.length === 0) {
				// Task doesn't support caching yet
				return false;
			}

			// Compute cache key
			const inputHashes = await Promise.all(
				inputFiles.map(async (file) => ({
					path: path.relative(this.node.pkg.directory, file),
					hash: await this.node.fileHashCache.getFileHash(file),
				})),
			);

			// Get dependency hashes for cascading cache invalidation
			const dependencyHashes = await this.getDependencyHashes();

			const cacheKeyInputs: CacheKeyInputs = {
				packageName: this.node.pkg.name,
				taskName: this.taskName ?? this.command,
				executable: this.executable,
				command: this.command,
				inputHashes,
				dependencyHashes:
					dependencyHashes.length > 0 ? dependencyHashes : undefined,
				...cache.options.globalKeyComponents,
			};

			// Log cache key inputs for debugging
			traceCacheKey(
				`${this.node.pkg.name}#${this.taskName ?? this.command} cache key inputs:`,
			);
			traceCacheKey(
				`  inputFiles: ${inputFiles.map((f) => path.relative(this.node.pkg.directory, f)).join(", ")}`,
			);
			traceCacheKey(
				`  inputHashes: ${inputHashes.map((h) => `${h.path}:${h.hash.substring(0, 8)}`).join(", ")}`,
			);
			if (dependencyHashes.length > 0) {
				traceCacheKey(
					`  dependencyHashes: ${dependencyHashes.map((h) => `${h.name}:${h.hash.substring(0, 8)}`).join(", ")}`,
				);
			}

			// Lookup cache entry
			const entry = await cache.lookup(cacheKeyInputs);
			if (!entry) {
				return false; // Cache miss
			}

			// Restore from cache
			const result = await cache.restore(entry, this.node.pkg.directory);

			if (result.success) {
				// Replay stdout/stderr for consistent UX (only when verbose flag is set)
				if (this.node.verbose) {
					if (result.stdout) {
						this.log.log(result.stdout);
					}
					if (result.stderr?.trim()) {
						this.log.warning(result.stderr);
					}
				}

				this.traceTrigger(
					`restored from cache (${result.filesRestored} files, ${(result.bytesRestored / 1024).toFixed(1)} KB)`,
				);
				return true;
			}

			return false;
		} catch (error) {
			// Don't fail the build if cache restore fails
			this.traceError(`Failed to restore from cache: ${error}`);
			return false;
		}
	}

	/**
	 * Store task outputs in shared cache after successful execution.
	 */
	private async storeInCache(
		executionTimeMs: number,
		stdout: string,
		stderr: string,
	): Promise<StoreResult> {
		const cache = this.node.sharedCache;
		if (!cache) {
			return { success: false, reason: "cache not initialized" };
		}
		if (cache.options.skipCacheWrite) {
			return { success: false, reason: "--skip-cache-write enabled" };
		}

		try {
			// Get input and output files
			const inputFiles = await this.getCacheInputFiles();
			const outputFiles = await this.getCacheOutputFiles();
			if (inputFiles.length === 0 || outputFiles.length === 0) {
				return { success: false, reason: "task does not support caching" };
			}

			// Compute input hashes
			const inputHashes = await Promise.all(
				inputFiles.map(async (file) => ({
					path: path.relative(this.node.pkg.directory, file),
					hash: await this.node.fileHashCache.getFileHash(file),
				})),
			);

			// Get dependency hashes for cascading cache invalidation
			const dependencyHashes = await this.getDependencyHashes();

			// Compute cache key inputs
			const cacheKeyInputs: CacheKeyInputs = {
				packageName: this.node.pkg.name,
				taskName: this.taskName ?? this.command,
				executable: this.executable,
				command: this.command,
				inputHashes,
				dependencyHashes:
					dependencyHashes.length > 0 ? dependencyHashes : undefined,
				...cache.options.globalKeyComponents,
			};

			// Prepare task outputs
			const taskOutputs: TaskOutputs = {
				files: outputFiles.map((file) => ({
					sourcePath: file,
					relativePath: path.relative(this.node.pkg.directory, file),
				})),
				stdout,
				stderr,
				exitCode: 0,
				executionTimeMs,
			};

			// Store in cache
			const result = await cache.store(
				cacheKeyInputs,
				taskOutputs,
				this.node.pkg.directory,
			);
			return result;
		} catch (error) {
			// Don't fail the build if cache storage fails
			this.traceError(`Failed to store in cache: ${error}`);
			return {
				success: false,
				reason: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Subclass should override these to configure the leaf task
	 */

	// After the task is done, indicate whether the command can be incremental next time.
	protected abstract get isIncremental(): boolean | undefined;

	// check if this task is up to date
	protected abstract checkLeafIsUpToDate(): Promise<boolean>;

	/**
	 * Return if the task supports recheck when it time to execute.
	 * Default to false so that the task will execute if any of the dependent task is out of date at the
	 * beginning of the build.
	 * Override to true if the task knows all the input dependencies (e.g. tsc) and is able to detect if
	 * the dependent task's output changes this tasks' input and really need rebuild or not.
	 */
	protected get recheckLeafIsUpToDate(): boolean {
		return false;
	}

	// For called when the task has successfully executed
	// biome-ignore lint/suspicious/noEmptyBlockStatements: hook method intended for subclass override
	protected async markExecDone(): Promise<void> {}

	protected getVsCodeErrorMessages(errorMessages: string) {
		return errorMessages;
	}
}

/**
 * A LeafTask with a "done file" which represents the work this task needs to do.
 */
export abstract class LeafWithDoneFileTask extends LeafTask {
	private _isIncremental = true;
	private _cachedDoneFileContent?: string;

	protected get isIncremental() {
		return this._isIncremental;
	}
	protected get doneFileFullPath() {
		return this.getPackageFileFullPath(this.doneFile);
	}

	/**
	 * Subclasses can optionally override to provide config file paths that should be included in cache inputs.
	 * Examples: tsconfig.json, webpack.config.js, .eslintrc, etc.
	 * These files will be automatically included in getCacheInputFiles() if they exist.
	 */
	protected get configFileFullPaths(): string[] {
		return [];
	}

	/**
	 * Compute a hash of the donefile content.
	 * This is a public method that can be called by dependent tasks to include
	 * in their cache keys for cascading invalidation.
	 *
	 * Returns undefined if donefile content cannot be computed (e.g., missing outputs).
	 */
	public async computeDonefileHash(): Promise<string | undefined> {
		const donefileContent = await this.getDoneFileContent();
		if (!donefileContent) {
			return undefined;
		}
		// Import sha256 at the top of the file
		const { sha256 } = await import("../../hash.js");
		return sha256(Buffer.from(donefileContent, "utf8"));
	}

	protected override async checkIsUpToDate(): Promise<boolean> {
		const leafIsUpToDate = await super.checkIsUpToDate();
		// biome-ignore lint/complexity/useSimplifiedLogicExpression: condition logic is intentionally explicit for clarity
		if (!leafIsUpToDate && !this.recheckLeafIsUpToDate) {
			// Delete the done file so that even if we get interrupted, we will rebuild the next time.
			// Unless recheck is enable, which means the task has the ability to determine whether it
			// needs to be rebuilt even the initial check failed
			const doneFileFullPath = this.doneFileFullPath;
			try {
				if (existsSync(doneFileFullPath)) {
					await unlink(doneFileFullPath);
				}
			} catch {
				this.log.warning(
					`${this.node.pkg.nameColored}: warning: unable to unlink ${doneFileFullPath}`,
				);
			}
		}
		return leafIsUpToDate;
	}

	protected override async markExecDone() {
		const doneFileFullPath = this.doneFileFullPath;
		try {
			// Use cached content from checkLeafIsUpToDate, or compute if not cached
			const content =
				this._cachedDoneFileContent ?? (await this.getDoneFileContent());
			if (content !== undefined) {
				await writeFile(doneFileFullPath, content);
			} else {
				this._isIncremental = false;
				this.log.warning(
					`${this.node.pkg.nameColored}: warning: unable to generate content for ${doneFileFullPath}`,
				);
			}
		} catch (error) {
			this._isIncremental = false;
			this.log.warning(
				`${this.node.pkg.nameColored}: warning: unable to write ${doneFileFullPath}\n error: ${error}`,
			);
		}
	}

	protected async checkLeafIsUpToDate() {
		const doneFileFullPath = this.doneFileFullPath;
		try {
			const doneFileExpectedContent = await this.getDoneFileContent();
			// Cache the content for reuse in markExecDone
			this._cachedDoneFileContent = doneFileExpectedContent;

			if (doneFileExpectedContent !== undefined) {
				const doneFileContent = await readFile(doneFileFullPath, "utf8");
				if (doneFileContent === doneFileExpectedContent) {
					return true;
				}
				this.traceTrigger(`mismatched compare file: ${doneFileFullPath}`);
				// These log statements can be useful for debugging, but they're extremely long and completely
				// obscure other logs.
				// In the future we can consider logging just the diff between the input and output.
				// this.traceTrigger(doneFileExpectedContent);
				// this.traceTrigger(doneFileContent);
			} else {
				this.traceTrigger(
					"unable to generate done file expected content (getDoneFileContent returned undefined)",
				);
			}
		} catch {
			this.traceTrigger(`unable to read compare file: ${doneFileFullPath}`);
		}
		return false;
	}

	/**
	 * Override to include the done file in cache inputs (if it exists).
	 * Subclasses should call super.getCacheInputFiles() and add their own inputs.
	 */
	/**
	 * Override to automatically include config files in cache inputs (if they exist).
	 * Subclasses should call super.getCacheInputFiles() and add their own inputs.
	 */
	public override async getCacheInputFiles(): Promise<string[]> {
		const inputs = await super.getCacheInputFiles();
		// NOTE: Done file is NOT included in cache inputs because:
		// 1. It's an OUTPUT of the task (created by markExecDone after execution)
		// 2. It's already included in getCacheOutputFiles()
		// 3. Including it causes cache key instability:
		//    - At lookup time: done file doesn't exist yet → not in inputs → key A
		//    - At store time: done file exists (just created) → would be in inputs → key B
		// The done file content is based on the actual input files (via getDoneFileContent),
		// so changes to inputs will already invalidate the cache through input file hashes.

		// Automatically include config files if they exist
		for (const configPath of this.configFileFullPaths) {
			if (existsSync(configPath)) {
				inputs.push(configPath);
			}
		}

		return inputs;
	}

	/**
	 * Override to include the done file in cache outputs.
	 * Subclasses should call super.getCacheOutputFiles() and add their own outputs.
	 *
	 * NOTE: Only includes done file if it exists. The done file may not exist if:
	 * - getDoneFileContent() returned undefined (e.g., missing tsBuildInfo)
	 * - Writing the done file failed (caught and logged as warning in markExecDone)
	 * Since done files are optional markers, not required outputs, we check existence
	 * to avoid ENOENT errors during cache store operations.
	 */
	public override async getCacheOutputFiles(): Promise<string[]> {
		const outputs = await super.getCacheOutputFiles();
		// Only include done file if it actually exists
		if (existsSync(this.doneFileFullPath)) {
			outputs.push(this.doneFileFullPath);
		}
		return outputs;
	}

	public override reset(): void {
		super.reset();
		// Clear cached done file content to ensure fresh computation on next build
		this._cachedDoneFileContent = undefined;
	}

	/**
	 * Subclass could override this to provide an alternative done file name
	 */
	protected get doneFile(): string {
		const name = path.parse(this.executable).name.replace(/\s/g, "_");
		// use 8 char of the sha256 hash of the command to distinguish different tasks
		const hash = crypto
			.createHash("sha256")
			.update(this.command)
			.digest("hex")
			.substring(0, 8);
		return `${name}-${hash}.done.build.log`;
	}

	/**
	 * Subclass should override these to configure the leaf with done file task
	 */

	/**
	 * The content to be written in the "done file".
	 * @remarks
	 * This file must have different content if the work needed to be done by this task changes.
	 * This is typically done by listing and/or hashing the inputs and outputs to this task.
	 * This is invoked before the task is run to check if an existing done file from a previous run matches: if so, the task can be skipped.
	 * If not, the task is run, after which this is invoked a second time to produce the contents to write to disk.
	 */
	protected abstract getDoneFileContent(): Promise<string | undefined>;
}

export class UnknownLeafTask extends LeafTask {
	protected get isIncremental() {
		return this.command === "";
	}

	protected async checkLeafIsUpToDate() {
		if (this.command === "") {
			// Empty command is always up to date.
			return true;
		}
		// Because we don't know, it is always out of date and need to rebuild
		this.traceTrigger("Unknown task");
		return false;
	}
}

export abstract class LeafWithFileStatDoneFileTask extends LeafWithDoneFileTask {
	/**
	 * @returns the list of absolute paths to files that this task depends on.
	 */
	protected abstract getInputFiles(): Promise<string[]>;

	/**
	 * @returns the list of absolute paths to files that this task generates.
	 */
	protected abstract getOutputFiles(): Promise<string[]>;

	/**
	 * If this returns true, then the donefile will use the hash of the file contents instead of the last modified time
	 * and other file stats.
	 *
	 * Hashing is roughly 20% slower than the stats-based approach, but is less susceptible to getting invalidated by
	 * other processes like git touching files but not ultimately changing their contents.
	 */
	protected get useHashes(): boolean {
		return false;
	}

	/**
	 * Automatically includes input files from getInputFiles() for caching.
	 * Subclasses rarely need to override this - just implement getInputFiles() instead.
	 */
	public override async getCacheInputFiles(): Promise<string[]> {
		const inputs = await super.getCacheInputFiles();
		inputs.push(...(await this.getInputFiles()));
		return inputs;
	}

	/**
	 * Automatically includes output files from getOutputFiles() for caching.
	 * Subclasses rarely need to override this - just implement getOutputFiles() instead.
	 */
	public override async getCacheOutputFiles(): Promise<string[]> {
		const outputs = await super.getCacheOutputFiles();
		outputs.push(...(await this.getOutputFiles()));
		return outputs;
	}

	protected async getDoneFileContent(): Promise<string | undefined> {
		if (this.useHashes) {
			return this.getHashDoneFileContent();
		}

		// Gather the file information
		try {
			const srcFiles = await this.getInputFiles();
			const dstFiles = await this.getOutputFiles();
			const srcTimesP = Promise.all(
				srcFiles
					.map((match) => this.getPackageFileFullPath(match))
					.map((match) => stat(match)),
			);
			const dstTimesP = Promise.all(
				dstFiles
					.map((match) => this.getPackageFileFullPath(match))
					.map((match) => stat(match)),
			);
			const [srcTimes, dstTimes] = await Promise.all([srcTimesP, dstTimesP]);

			const srcInfo = srcTimes.map((srcTime) => {
				return { mtimeMs: srcTime.mtimeMs, size: srcTime.size };
			});
			const dstInfo = dstTimes.map((dstTime) => {
				return { mtimeMs: dstTime.mtimeMs, size: dstTime.size };
			});
			return JSON.stringify({ srcFiles, dstFiles, srcInfo, dstInfo });
		} catch (error) {
			this.traceError(
				`error comparing file times: ${(error as Error).message}`,
			);
			this.traceTrigger("failed to get file stats");
			return undefined;
		}
	}

	private async getHashDoneFileContent(): Promise<string | undefined> {
		const mapHash = async (name: string) => {
			const hash = await this.node.fileHashCache.getFileHash(
				this.getPackageFileFullPath(name),
			);
			return { name, hash };
		};

		try {
			const srcFiles = await this.getInputFiles();
			const dstFiles = await this.getOutputFiles();
			const srcHashesP = Promise.all(srcFiles.map(mapHash));
			const dstHashesP = Promise.all(dstFiles.map(mapHash));

			const [srcHashes, dstHashes] = await Promise.all([
				srcHashesP,
				dstHashesP,
			]);

			// sort by name for determinism
			srcHashes.sort(sortByName);
			dstHashes.sort(sortByName);

			const output = JSON.stringify({
				srcHashes,
				dstHashes,
			});
			return output;
		} catch (error) {
			this.traceError(
				`error calculating file hashes: ${(error as Error).message}`,
			);
			this.traceTrigger("failed to get file hash");
			return undefined;
		}
	}
}

function sortByName(a: { name: string }, b: { name: string }): number {
	if (a.name < b.name) {
		return -1;
	}
	if (a.name > b.name) {
		return 1;
	}
	return 0;
}
