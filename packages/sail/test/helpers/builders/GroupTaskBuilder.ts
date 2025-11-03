import type { BuildContext } from "../../../src/core/buildContext.js";
import { BuildGraphPackage } from "../../../src/core/buildGraph.js";
// Import dependencies needed for BuildGraphContext
import { FileHashCache } from "../../../src/core/fileHashCache.js";
import { BuildProfiler } from "../../../src/core/performance/BuildProfiler.js";
import { GroupTask } from "../../../src/core/tasks/groupTask.js";
import type { Task } from "../../../src/core/tasks/task.js";
import { BuildContextBuilder } from "./BuildContextBuilder.js";
import { LeafTaskBuilder } from "./LeafTaskBuilder.js";
import { PackageBuilder } from "./PackageBuilder.js";

/**
 * Fluent builder for creating GroupTask instances for testing.
 *
 * Simplifies test setup for group task testing by providing sensible defaults
 * and a clean API for configuring group-specific behavior.
 *
 * @example
 * ```typescript
 * const task = new GroupTaskBuilder()
 *   .withPackageName("my-app")
 *   .withCommand("build")
 *   .withSubTasks([task1, task2])
 *   .build();
 * ```
 *
 * @example
 * ```typescript
 * const task = new GroupTaskBuilder()
 *   .withBuildGraphPackage(buildGraphPkg)
 *   .withContext(customContext)
 *   .withSequential(true)
 *   .build();
 * ```
 */
export class GroupTaskBuilder {
	private buildGraphPackage?: BuildGraphPackage;
	private context?: BuildContext;
	private command?: string;
	private taskName?: string;
	private packageName = "test-package";
	private packagePath = "/test/package";
	private scripts: Record<string, string> = {};
	private subTasks: Task[] = [];
	private sequential = false;

	/**
	 * Set an existing BuildGraphPackage (advanced usage)
	 */
	withBuildGraphPackage(pkg: BuildGraphPackage): this {
		this.buildGraphPackage = pkg;
		return this;
	}

	/**
	 * Set an existing BuildContext (advanced usage)
	 */
	withContext(context: BuildContext): this {
		this.context = context;
		return this;
	}

	/**
	 * Set the command to execute
	 */
	withCommand(command: string): this {
		this.command = command;
		return this;
	}

	/**
	 * Set the task name (defaults to command if not specified)
	 */
	withTaskName(name: string): this {
		this.taskName = name;
		return this;
	}

	/**
	 * Set the package name
	 */
	withPackageName(name: string): this {
		this.packageName = name;
		return this;
	}

	/**
	 * Set the package directory path
	 */
	withPackagePath(path: string): this {
		this.packagePath = path;
		return this;
	}

	/**
	 * Add a script to package.json
	 */
	withScript(name: string, command: string): this {
		this.scripts[name] = command;
		return this;
	}

	/**
	 * Add multiple scripts at once
	 */
	withScripts(scripts: Record<string, string>): this {
		Object.assign(this.scripts, scripts);
		return this;
	}

	/**
	 * Set the subtasks for the group
	 */
	withSubTasks(tasks: Task[]): this {
		this.subTasks = tasks;
		return this;
	}

	/**
	 * Add a single subtask to the group
	 */
	addSubTask(task: Task): this {
		this.subTasks.push(task);
		return this;
	}

	/**
	 * Set whether the group should execute sequentially
	 */
	withSequential(sequential: boolean): this {
		this.sequential = sequential;
		return this;
	}

	/**
	 * Get or create BuildGraphPackage for task construction
	 */
	private getBuildGraphPackage(): BuildGraphPackage {
		if (this.buildGraphPackage) {
			return this.buildGraphPackage;
		}

		// Create default package
		const pkg = new PackageBuilder()
			.withName(this.packageName)
			.atPath(this.packagePath)
			.withScripts(this.scripts)
			.build();

		// Create or use provided context
		const buildContext =
			this.context ??
			new BuildContextBuilder()
				.withRepoRoot("/test/repo")
				.withPackage(pkg)
				.build();

		// Create BuildGraphContext (wraps BuildContext with extra properties)
		// This mimics what BuildGraph does internally
		const repoPackageMap = new Map([[pkg.name, pkg]]);

		const buildGraphContext = {
			// Properties from BuildContext
			sailConfig: buildContext.sailConfig,
			buildProjectConfig: buildContext.buildProjectConfig,
			repoRoot: buildContext.repoRoot,
			gitRepo: buildContext.gitRepo,
			gitRoot: buildContext.gitRoot,
			log: buildContext.log,
			sharedCache: buildContext.sharedCache,
			taskHandlerRegistry: buildContext.taskHandlerRegistry,
			// Additional properties for BuildGraphContext
			repoPackageMap,
			buildContext,
			force: false,
			matchedOnly: false,
			fileHashCache: new FileHashCache(),
			taskStats: {
				// TaskStats is a simple object with counters
				leafTotalCount: 0,
				leafBuiltCount: 0,
				leafUpToDateCount: 0,
				leafExecTimeMs: 0,
			},
			failedTaskLines: [],
			buildProfiler: new BuildProfiler(buildContext.log),
			workerPool: undefined,
		};

		// Create BuildGraphPackage with BuildGraphContext
		// Constructor: (context, pkg, globalTaskDefinitions)
		const buildGraphPkg = new BuildGraphPackage(
			buildGraphContext as any,
			pkg,
			{},
		);

		return buildGraphPkg;
	}

	/**
	 * Build a GroupTask instance
	 */
	build(): GroupTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "group";

		return new GroupTask(
			node,
			cmd,
			node.context,
			this.subTasks,
			this.taskName,
			this.sequential,
		);
	}

	/**
	 * Build a GroupTask with default leaf tasks for testing
	 */
	buildWithDefaultSubTasks(count = 2): GroupTask {
		const node = this.getBuildGraphPackage();

		// Create default subtasks if none provided
		if (this.subTasks.length === 0) {
			for (let i = 0; i < count; i++) {
				const task = new LeafTaskBuilder()
					.withBuildGraphPackage(node)
					.withCommand(`task${i + 1}`)
					.withTaskName(`task${i + 1}`)
					.buildBiomeTask();
				this.subTasks.push(task);
			}
		}

		return this.build();
	}
}
