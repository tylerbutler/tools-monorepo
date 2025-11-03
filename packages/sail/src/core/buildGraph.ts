import type { Logger } from "@tylerbu/cli-api";
import type {
	BuildProjectConfig,
	Stopwatch,
} from "@tylerbu/sail-infrastructure";
import type { AsyncPriorityQueue } from "async";
import registerDebug from "debug";
import chalk from "picocolors";
import type { SimpleGit } from "simple-git";
import type { BuildPackage } from "../common/npmPackage.js";
import type { BuildContext } from "./buildContext.js";
import {
	type DependencyNode,
	DependencyResolver,
} from "./dependencies/DependencyResolver.js";
import { BuildError } from "./errors/BuildError.js";
import { ConfigurationError } from "./errors/ConfigurationError.js";
import { FileSystemError } from "./errors/FileSystemError.js";
import { isKnownMainExecutable } from "./executables.js";
import { BuildExecutor } from "./execution/BuildExecutor.js";
import { BuildResult, summarizeBuildResult } from "./execution/BuildResult.js";
import { FileHashCache } from "./fileHashCache.js";
import type {
	IBuildablePackage as BuildablePackage,
	IBuildExecutionContext as BuildExecutionContext,
	IBuildablePackage,
	IBuildResult,
} from "./interfaces/index.js";
import type { BuildOptions } from "./options.js";
import { BuildProfiler } from "./performance/BuildProfiler.js";
import type { ISailConfig } from "./sailConfig.js";
import type { SharedCacheManager } from "./sharedCache/index.js";
import {
	getDefaultTaskDefinition,
	getTaskDefinitions,
	normalizeGlobalTaskDefinitions,
	type TaskDefinition,
	type TaskDefinitions,
	type TaskDefinitionsOnDisk,
} from "./taskDefinitions.js";
import type { TaskHandlerRegistry } from "./tasks/TaskHandlerRegistry.js";
import { TaskManager } from "./tasks/TaskManager.js";
import type { Task, TaskExec } from "./tasks/task.js";
import { WorkerPool } from "./tasks/workers/workerPool.js";

const traceTaskDef = registerDebug("sail:task:definition");
const _traceTaskDepTask = registerDebug("sail:task:init:dep:task");
const traceGraph = registerDebug("sail:graph");

class TaskStats {
	public leafTotalCount = 0;
	public leafUpToDateCount = 0;
	public leafBuiltCount = 0;
	public leafExecTimeTotal = 0;
	public leafQueueWaitTimeTotal = 0;
}

class BuildGraphContext implements BuildContext, BuildExecutionContext {
	public readonly fileHashCache: FileHashCache;
	public readonly taskStats = new TaskStats();
	public readonly failedTaskLines: string[] = [];
	public readonly sailConfig: ISailConfig;
	public readonly buildProjectConfig: BuildProjectConfig;
	public readonly repoRoot: string;
	public readonly gitRepo: SimpleGit;
	public readonly gitRoot: string;
	public readonly buildProfiler: BuildProfiler;
	public readonly sharedCache?: SharedCacheManager;
	public readonly taskHandlerRegistry: TaskHandlerRegistry;

	public readonly log: Logger;

	public constructor(
		public readonly repoPackageMap: ReadonlyMap<string, BuildPackage>,
		public readonly buildContext: BuildContext,
		public readonly force: boolean,
		public readonly matchedOnly: boolean,
		public readonly workerPool?: WorkerPool,
	) {
		this.sailConfig = buildContext.sailConfig;
		this.buildProjectConfig = buildContext.buildProjectConfig;
		this.repoRoot = buildContext.repoRoot;
		this.gitRepo = buildContext.gitRepo;
		this.gitRoot = buildContext.gitRoot;
		this.log = buildContext.log;
		this.sharedCache = buildContext.sharedCache;
		this.taskHandlerRegistry = buildContext.taskHandlerRegistry;

		// Use simple in-memory cache like fluid-build to avoid memory exhaustion
		// PersistentFileHashCache loads entire cache file into memory which causes OOM
		this.fileHashCache = new FileHashCache();
		this.buildProfiler = new BuildProfiler(buildContext.log);
	}
}

/**
 * BuildGraphPackage represents a package node in the build dependency graph.
 *
 * Responsibilities:
 * - Graph structure management (dependencies, levels)
 * - Task definition resolution for the package
 * - Task management delegation to TaskManager
 * - Build execution implementation (BuildablePackage)
 *
 * After refactoring, this class focuses on graph structure and delegates
 * specialized functionality to dedicated classes.
 */
export class BuildGraphPackage implements DependencyNode, BuildablePackage {
	public readonly dependentPackages = [] as BuildGraphPackage[];
	public level = -1;
	private buildP?: Promise<IBuildResult>;

	// Task definitions for this package (use getTaskDefinition for access)
	private readonly _taskDefinitions: TaskDefinitions;

	// Task management is delegated to TaskManager
	public readonly taskManager: TaskManager;

	public constructor(
		public readonly context: BuildGraphContext,
		public readonly pkg: BuildPackage,
		globalTaskDefinitions: TaskDefinitions,
	) {
		this._taskDefinitions = this.initializeTaskDefinitions(
			globalTaskDefinitions,
		);
		this.taskManager = this.initializeTaskManager();
	}

	private initializeTaskDefinitions(
		globalTaskDefinitions: TaskDefinitions,
	): TaskDefinitions {
		traceTaskDef(
			`${this.pkg.name}: globalTaskDefinitions=%O`,
			globalTaskDefinitions,
		);
		traceTaskDef(
			`${this.pkg.name}: packageJson.name=%s`,
			this.pkg.packageJson.name,
		);
		traceTaskDef(
			`${this.pkg.name}: packageJson.scripts=%O`,
			this.pkg.packageJson.scripts,
		);
		traceTaskDef(
			`${this.pkg.name}: has scripts property=%s`,
			"scripts" in this.pkg.packageJson,
		);
		const taskDefinitions = getTaskDefinitions(
			this.pkg.packageJson,
			globalTaskDefinitions,
			{
				isReleaseGroupRoot: this.pkg.isReleaseGroupRoot,
			},
		);

		traceTaskDef(
			`${this.pkg.nameColored}: Task def: ${JSON.stringify(taskDefinitions, undefined, 2)}`,
		);

		return taskDefinitions;
	}

	private initializeTaskManager(): TaskManager {
		return new TaskManager(
			this.pkg,
			this.context,
			(taskName: string) => this.getTaskDefinition(taskName),
			this.dependentPackages,
			this,
		);
	}

	// Task management delegation methods
	public get taskCount(): number {
		return this.taskManager.taskCount;
	}

	public createTasks(buildTaskNames: string[]): boolean | undefined {
		return this.taskManager.createTasks(buildTaskNames);
	}

	private getTaskDefinition(taskName: string): TaskDefinition | undefined {
		const taskDefinition = this._taskDefinitions[taskName];
		if (taskDefinition !== undefined) {
			return taskDefinition;
		}
		if (!this.pkg.isReleaseGroupRoot) {
			return this.pkg.getScript(taskName) !== undefined
				? getDefaultTaskDefinition(taskName)
				: undefined;
		}
		const isReleaseGroupRootScriptEnabled =
			(this.pkg.packageJson.sail?.tasks ??
				this.pkg.packageJson.fluidBuild?.tasks) !== undefined;
		const script = this.pkg.getScript(taskName);
		if (
			// Only enable release group root script if it is explicitly defined, for places that don't use it yet
			!isReleaseGroupRootScriptEnabled ||
			// if there is no script or the script starts with a known executable name, then use the default
			script === undefined ||
			isKnownMainExecutable(script)
		) {
			// default for release group root is to depend on the task of all packages in the release group
			return {
				dependsOn: [`^${taskName}`],
				script: false,
				before: [],
				children: [],
				after: [],
			};
		}
		return undefined;
	}

	// Task retrieval and management delegation
	public getTask(
		taskName: string,
		pendingInitDep: Task[] | undefined,
	): Task | undefined {
		return this.taskManager.getTask(taskName, pendingInitDep);
	}

	public getScriptTask(
		taskName: string,
		pendingInitDep: Task[],
	): Task | undefined {
		return this.taskManager.getScriptTask(taskName, pendingInitDep);
	}

	public getDependsOnTasks(
		task: Task,
		taskName: string,
		pendingInitDep: Task[],
	) {
		return this.taskManager.getDependsOnTasks(task, taskName, pendingInitDep);
	}

	// Task initialization delegation
	public finalizeDependentTasks(): void {
		this.taskManager.finalizeDependentTasks();
	}

	public initializeDependentLeafTasks(): void {
		for (const task of this.taskManager.tasksMap.values()) {
			task.initializeDependentLeafTasks();
		}
	}

	public initializeWeight(): void {
		for (const task of this.taskManager.tasksMap.values()) {
			task.initializeWeight();
		}
	}

	public async isUpToDate(): Promise<boolean> {
		if (this.taskManager.taskCount === 0) {
			return true;
		}
		const isUpToDateP: Promise<boolean>[] = [];
		for (const task of this.taskManager.tasksMap.values()) {
			isUpToDateP.push(task.isUpToDate());
		}
		const isUpToDateArr = await Promise.all(isUpToDateP);
		return isUpToDateArr.every((isUpToDate) => isUpToDate);
	}

	private async buildAllTasks(
		q: AsyncPriorityQueue<TaskExec>,
	): Promise<IBuildResult> {
		const runP: Promise<BuildResult>[] = [];
		for (const task of this.taskManager.tasksMap.values()) {
			runP.push(task.run(q));
		}
		return summarizeBuildResult(await Promise.all(runP));
	}

	public async build(q: AsyncPriorityQueue<TaskExec>): Promise<IBuildResult> {
		if (!this.buildP) {
			if (this.taskManager.taskCount > 0) {
				this.buildP = this.buildAllTasks(q);
			} else {
				this.buildP = Promise.resolve(BuildResult.UpToDate);
			}
		}
		return this.buildP;
	}

	/**
	 * Resets cached build state, allowing the package to be rebuilt.
	 * Note: Primarily intended for use in tests where package instances are reused.
	 * In production, each build creates new package instances, so reset is not needed.
	 */
	public reset(): void {
		this.buildP = undefined;
		this.taskManager.resetAllTasks();
	}

	// Package utility methods
	public async getLockFileHash(): Promise<string> {
		const lockfile = this.pkg.getLockFilePath();
		if (lockfile) {
			return this.context.fileHashCache.getFileHash(lockfile);
		}
		throw FileSystemError.lockFileNotFound(this.pkg.nameColored, {
			packageName: this.pkg.nameColored,
		});
	}
}

/**
 * BuildGraph is a representation of all the tasks and the dependent order
 * specified by the task definitions.
 *
 * To create the graph:
 * 1. Initialize BuildPackages
 * 	  a. Create the BuildPackage nodes for packages that are matched (on the command line)
 *       and then transitively create dependent packages as needed. Not all repo packages
 *       will have a BuildPackage created.
 *    b. Detect if there is a circular dependency by assign level to packages. The package
 *       level has no other use currently.
 * 2. Tasks and dependencies graph
 *    a. Create the initial task specified on the command line.  Without --dep option, the
 *       the initial task will only for created for matched BuildPackages. With --dep option
 *       the initial task will be created for all instantiated BuildPackages (i.e. all the
 *       package that is transitive dependencies of the matched BuildPackages).
 *	  b. Transitively resolve and create dependent tasks starting from the initial tasks
 *       based on the `dependsOn` specified in the TaskDefinitions
 *    c. Resolve all `before` and `after` dependencies to tasks that is already instantiated.
 * 	     `before` and `after` doesn't cause new task to be created, only match to existing tasks.
 * 3. Initialize gather up all the leaf tasks dependencies.
 * 4. Assign tasks weight to prioritize tasks based on how expansive the tasks depending on
 *    this one will unblock.
 */
export class BuildGraph {
	private matchedPackages = 0;
	private readonly _buildPackages = new Map<BuildPackage, BuildGraphPackage>();
	private readonly context: BuildGraphContext;
	private readonly dependencyResolver = new DependencyResolver();
	private readonly buildExecutor: BuildExecutor;

	public constructor(
		packages: ReadonlyMap<string, BuildPackage>,
		releaseGroupPackages: BuildPackage[],
		buildContext: BuildContext,
		private readonly buildTaskNames: string[],
		globalTaskDefinitions: TaskDefinitionsOnDisk | undefined,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
		private log: Logger,
		options: Pick<
			BuildOptions,
			"matchedOnly" | "worker" | "workerMemoryLimit" | "workerThreads" | "force"
		>,
	) {
		traceGraph("globalTaskDefinitions=%O", globalTaskDefinitions);
		traceGraph(
			"globalTaskDefinitions keys=%O",
			Object.keys(globalTaskDefinitions ?? {}),
		);
		this.context = new BuildGraphContext(
			packages,
			buildContext,
			options.force,
			options.matchedOnly,
			options.worker
				? new WorkerPool(options.workerThreads, options.workerMemoryLimit)
				: undefined,
		);
		this.buildExecutor = new BuildExecutor(this.log, this.context);
		this.initializePackages(
			packages,
			releaseGroupPackages,
			globalTaskDefinitions,
			getDepFilter,
		);
		this.initializeTasks(buildTaskNames, options);
	}

	public async checkInstall() {
		return this.buildExecutor.checkInstall(
			this._buildPackages as ReadonlyMap<BuildPackage, IBuildablePackage>,
		);
	}

	public async build(timer?: Stopwatch): Promise<BuildResult> {
		const result = await this.buildExecutor.executeBuild(
			this._buildPackages as ReadonlyMap<BuildPackage, IBuildablePackage>,
			this.buildTaskNames,
			this.matchedPackages,
			timer,
		);
		return result as BuildResult;
	}

	public get numSkippedTasks(): number {
		return this.buildExecutor.numSkippedTasks;
	}

	public get totalElapsedTime(): number {
		return this.buildExecutor.totalElapsedTime;
	}

	public get totalQueueWaitTime(): number {
		return this.buildExecutor.totalQueueWaitTime;
	}

	public get taskFailureSummary(): string {
		return this.buildExecutor.taskFailureSummary;
	}

	public get taskStats(): TaskStats {
		return this.context.taskStats;
	}

	/**
	 * Get all build packages as an array.
	 * Useful for iteration and finding specific packages.
	 */
	public get buildPackages(): BuildGraphPackage[] {
		return Array.from(this._buildPackages.values());
	}

	/**
	 * Get cache statistics if caching is enabled.
	 * Returns formatted string with cache hit rate, size, and time saved.
	 */
	public getCacheStatistics(): string | undefined {
		const cache = this.context.sharedCache;
		if (!cache) {
			return undefined;
		}

		const stats = cache.getStatistics();
		const totalLookups = stats.hitCount + stats.missCount;

		if (totalLookups === 0) {
			// No cache operations performed
			return undefined;
		}

		const hitRate = ((stats.hitCount / totalLookups) * 100).toFixed(1);
		const cacheSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
		const timeSavedSeconds = (stats.timeSavedMs / 1000).toFixed(1);

		return chalk.magentaBright(
			`Cache: ${stats.hitCount} hits, ${stats.missCount} misses (${hitRate}% hit rate) | ${stats.totalEntries} entries, ${cacheSizeMB} MB | ${timeSavedSeconds}s saved`,
		);
	}

	private initializePackages(
		packages: ReadonlyMap<string, BuildPackage>,
		releaseGroupPackages: BuildPackage[],
		globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
	) {
		traceGraph(
			"initPackages: globalTaskDefinitionsOnDisk=%O",
			globalTaskDefinitionsOnDisk,
		);
		traceGraph(
			"initPackages: globalTaskDefinitionsOnDisk keys=%O",
			Object.keys(globalTaskDefinitionsOnDisk ?? {}),
		);
		// Use DependencyResolver to resolve package dependencies
		const dependencyNodes = this.dependencyResolver.resolvePackageDependencies(
			packages,
			releaseGroupPackages,
			globalTaskDefinitionsOnDisk,
			getDepFilter,
		);

		traceGraph(
			"initPackages: before convert, globalTaskDefinitionsOnDisk=%O",
			globalTaskDefinitionsOnDisk,
		);
		// Convert DependencyNodes to BuildGraphPackages
		this.convertDependencyNodesToBuildGraphPackages(
			dependencyNodes,
			globalTaskDefinitionsOnDisk,
		);
	}

	private convertDependencyNodesToBuildGraphPackages(
		dependencyNodes: Map<BuildPackage, DependencyNode>,
		globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
	) {
		traceGraph(
			"convertDependencyNodes: START globalTaskDefinitionsOnDisk=%O",
			globalTaskDefinitionsOnDisk,
		);
		traceGraph(
			"convertDependencyNodes: keys=%O",
			Object.keys(globalTaskDefinitionsOnDisk ?? {}),
		);
		// First pass: create all BuildGraphPackages
		for (const [pkg, depNode] of dependencyNodes) {
			traceGraph(
				`convertDependencyNodes: About to create ${pkg.name}, globalTaskDefinitionsOnDisk=%O`,
				globalTaskDefinitionsOnDisk,
			);
			const buildGraphPackage = this.createBuildGraphPackage(
				pkg,
				globalTaskDefinitionsOnDisk,
			);
			buildGraphPackage.level = depNode.level;
		}

		// Second pass: establish dependency relationships
		for (const [pkg, depNode] of dependencyNodes) {
			const buildGraphPackage = this._buildPackages.get(pkg);
			if (buildGraphPackage) {
				for (const depPkg of depNode.dependentPackages) {
					const depBuildGraphPackage = this._buildPackages.get(depPkg.pkg);
					if (depBuildGraphPackage) {
						buildGraphPackage.dependentPackages.push(depBuildGraphPackage);
					}
				}
			}
		}
	}

	private createBuildGraphPackage(
		pkg: BuildPackage,
		globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
	): BuildGraphPackage {
		traceGraph(
			`createBuildGraphPackage: ${pkg.name} arg globalTaskDefinitionsOnDisk=%O`,
			globalTaskDefinitionsOnDisk,
		);
		traceGraph(
			`createBuildGraphPackage: ${pkg.name} arg type=%s`,
			typeof globalTaskDefinitionsOnDisk,
		);
		traceGraph(
			`createBuildGraphPackage: ${pkg.name} arg keys=%O`,
			Object.keys(globalTaskDefinitionsOnDisk ?? {}),
		);

		let buildPackage = this._buildPackages.get(pkg);
		if (buildPackage === undefined) {
			try {
				traceGraph(
					`createBuildGraphPackage: ${pkg.name} BEFORE normalize, globalTaskDefinitionsOnDisk=%O`,
					globalTaskDefinitionsOnDisk,
				);
				traceGraph(
					`createBuildGraphPackage: ${pkg.name} BEFORE normalize, keys=%O`,
					Object.keys(globalTaskDefinitionsOnDisk ?? {}),
				);
				const globalTaskDefinitions = normalizeGlobalTaskDefinitions(
					globalTaskDefinitionsOnDisk,
				);
				traceGraph(
					`createBuildGraphPackage: ${pkg.name} AFTER normalize, globalTaskDefinitions=%O`,
					globalTaskDefinitions,
				);
				traceGraph(
					`createBuildGraphPackage: ${pkg.name} AFTER normalize, keys=%O`,
					Object.keys(globalTaskDefinitions),
				);
				buildPackage = new BuildGraphPackage(
					this.context,
					pkg,
					globalTaskDefinitions,
				);
				this._buildPackages.set(pkg, buildPackage);
			} catch (e: unknown) {
				throw BuildError.packageLoadFailed(
					pkg.nameColored,
					pkg.directory,
					e as Error,
					{ packageName: pkg.nameColored },
				);
			}
		}
		return buildPackage;
	}

	private initializeTasks(
		buildTaskNames: string[],
		{ matchedOnly }: Pick<BuildOptions, "matchedOnly">,
	) {
		let hasTask = false;
		for (const node of this._buildPackages.values()) {
			if (matchedOnly && !node.pkg.matched) {
				// Don't initialize task on package that wasn't matched in matchedOnly mode
				continue;
			}

			this.matchedPackages++;

			// Initialize tasks
			if (node.createTasks(buildTaskNames)) {
				hasTask = true;
			}
		}

		if (!hasTask) {
			throw ConfigurationError.noTasksFound(this.buildTaskNames);
		}

		traceGraph("package task initialized");

		// All the transitive task has been created, finalize "soft" dependent edges and before/after tasks
		for (const node of this._buildPackages.values()) {
			node.finalizeDependentTasks();
		}

		traceGraph("dependent task initialized");

		// All the tasks and dependency has been initialized, now initialize the leaf graph (which is used in build)
		for (const node of this._buildPackages.values()) {
			node.initializeDependentLeafTasks();
		}

		traceGraph("dependent leaf task initialized");

		// Leaf graph is completed. Compute the weight
		for (const node of this._buildPackages.values()) {
			node.initializeWeight();
		}

		traceGraph("task weight initialized");
	}
}
