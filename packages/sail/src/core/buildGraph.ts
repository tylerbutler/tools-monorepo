import type {
	BuildProjectConfig,
	Stopwatch,
} from '@tylerbu/sail-infrastructure';
import type { AsyncPriorityQueue } from "async";
import registerDebug from "debug";
import type { SimpleGit } from "simple-git";

import type { Logger } from "@tylerbu/cli-api";
import { BuildPackage } from "../common/npmPackage.js";
import type { BuildContext } from "./buildContext.js";
import { PersistentFileHashCache } from "./cache/PersistentFileHashCache.js";
import {
	type DependencyNode,
	DependencyResolver,
} from "./dependencies/DependencyResolver.js";
import {
	BuildError,
	ConfigurationError,
	FileSystemError,
} from "./errors/index.js";
import {
	type BuildExecutionContext,
	BuildExecutor,
	BuildResult,
	type BuildablePackage,
	summarizeBuildResult,
} from "./execution/BuildExecutor.js";
import { FileHashCache } from "./fileHashCache.js";
import type { IBuildResult, IBuildablePackage } from "./interfaces/index.js";
import type { BuildOptions } from "./options.js";
import { BuildProfiler } from "./performance/BuildProfiler.js";
import type { ISailConfig } from "./sailConfig.js";
import {
	type TaskDefinition,
	type TaskDefinitions,
	type TaskDefinitionsOnDisk,
	getDefaultTaskDefinition,
	getTaskDefinitions,
	normalizeGlobalTaskDefinitions,
} from "./taskDefinitions.js";
import { TaskManager } from "./tasks/TaskManager.js";
import { Task, type TaskExec } from "./tasks/task.js";
import { WorkerPool } from "./tasks/workers/workerPool.js";

const traceTaskDef = registerDebug("sail:task:definition");
const traceTaskDepTask = registerDebug("sail:task:init:dep:task");
const traceGraph = registerDebug("sail:graph");

const knownMainExecutableNames = new Set([
	"sail build",
	"sail b",
	"fluid-build",
]);

export function isKnownMainExecutable(script: string): boolean {
	return [...knownMainExecutableNames].some((name) =>
		script.startsWith(`${name} `),
	);
}

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

	public readonly log: Logger;

	constructor(
		public readonly repoPackageMap: ReadonlyMap<string, BuildPackage>,
		readonly buildContext: BuildContext,
		public readonly workerPool?: WorkerPool,
	) {
		this.sailConfig = buildContext.sailConfig;
		this.buildProjectConfig = buildContext.buildProjectConfig;
		this.repoRoot = buildContext.repoRoot;
		this.gitRepo = buildContext.gitRepo;
		this.gitRoot = buildContext.gitRoot;
		this.log = buildContext.log;

		// Use persistent cache for better performance
		this.fileHashCache = new PersistentFileHashCache();
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
	public readonly dependentPackages = new Array<BuildGraphPackage>();
	public level = -1;
	private buildP?: Promise<IBuildResult>;

	// Task definitions for this package (use getTaskDefinition for access)
	private readonly _taskDefinitions: TaskDefinitions;

	// Task management is delegated to TaskManager
	public readonly taskManager: TaskManager;

	constructor(
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
		const isUpToDateP = new Array<Promise<boolean>>();
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
	private readonly buildPackages = new Map<BuildPackage, BuildGraphPackage>();
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
			"matchedOnly" | "worker" | "workerMemoryLimit" | "workerThreads"
		>,
	) {
		this.context = new BuildGraphContext(
			packages,
			buildContext,
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
			this.buildPackages as ReadonlyMap<BuildPackage, IBuildablePackage>,
		);
	}

	public async build(timer?: Stopwatch): Promise<BuildResult> {
		const result = await this.buildExecutor.executeBuild(
			this.buildPackages as ReadonlyMap<BuildPackage, IBuildablePackage>,
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

	private initializePackages(
		packages: ReadonlyMap<string, BuildPackage>,
		releaseGroupPackages: BuildPackage[],
		globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
	) {
		// Use DependencyResolver to resolve package dependencies
		const dependencyNodes = this.dependencyResolver.resolvePackageDependencies(
			packages,
			releaseGroupPackages,
			globalTaskDefinitionsOnDisk,
			getDepFilter,
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
		// First pass: create all BuildGraphPackages
		for (const [pkg, depNode] of dependencyNodes) {
			const buildGraphPackage = this.createBuildGraphPackage(
				pkg,
				globalTaskDefinitionsOnDisk,
			);
			buildGraphPackage.level = depNode.level;
		}

		// Second pass: establish dependency relationships
		for (const [pkg, depNode] of dependencyNodes) {
			const buildGraphPackage = this.buildPackages.get(pkg);
			if (buildGraphPackage) {
				for (const depPkg of depNode.dependentPackages) {
					const depBuildGraphPackage = this.buildPackages.get(depPkg.pkg);
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
		let buildPackage = this.buildPackages.get(pkg);
		if (buildPackage === undefined) {
			try {
				const globalTaskDefinitions = normalizeGlobalTaskDefinitions(
					globalTaskDefinitionsOnDisk,
				);
				buildPackage = new BuildGraphPackage(
					this.context,
					pkg,
					globalTaskDefinitions,
				);
				this.buildPackages.set(pkg, buildPackage);
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
		for (const node of this.buildPackages.values()) {
			if (matchedOnly && !node.pkg.matched) {
				// Don't initialize task on package that wasn't matched in matchedOnly mode
				return;
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
		for (const node of this.buildPackages.values()) {
			node.finalizeDependentTasks();
		}

		traceGraph("dependent task initialized");

		// All the tasks and dependency has been initialized, now initialize the leaf graph (which is used in build)
		for (const node of this.buildPackages.values()) {
			node.initializeDependentLeafTasks();
		}

		traceGraph("dependent leaf task initialized");

		// Leaf graph is completed. Compute the weight
		for (const node of this.buildPackages.values()) {
			node.initializeWeight();
		}

		traceGraph("task weight initialized");
	}
}
