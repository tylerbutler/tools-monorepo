import type { BuildContext } from "../../../src/core/buildContext.js";
import { BuildGraphPackage } from "../../../src/core/buildGraph.js";
// Import dependencies needed for BuildGraphContext
import { FileHashCache } from "../../../src/core/fileHashCache.js";
import { BuildProfiler } from "../../../src/core/performance/BuildProfiler.js";
import { BiomeTask } from "../../../src/core/tasks/leaf/biomeTasks.js";
import { CopyfilesTask } from "../../../src/core/tasks/leaf/miscTasks.js";
import { PrettierTask } from "../../../src/core/tasks/leaf/prettierTask.js";
import { TscTask } from "../../../src/core/tasks/leaf/tscTask.js";
import { WebpackTask } from "../../../src/core/tasks/leaf/webpackTask.js";
import { BuildContextBuilder } from "./BuildContextBuilder.js";
import { PackageBuilder } from "./PackageBuilder.js";

/**
 * Fluent builder for creating LeafTask instances for testing.
 *
 * Simplifies test setup for leaf task testing by providing sensible defaults
 * and a clean API for configuring task-specific behavior.
 *
 * @example
 * ```typescript
 * const task = new LeafTaskBuilder()
 *   .withPackageName("my-app")
 *   .withCommand("tsc")
 *   .buildTscTask();
 * ```
 *
 * @example
 * ```typescript
 * const task = new LeafTaskBuilder()
 *   .withBuildGraphPackage(buildGraphPkg)
 *   .withContext(customContext)
 *   .buildBiomeTask();
 * ```
 */
export class LeafTaskBuilder {
	private buildGraphPackage?: BuildGraphPackage;
	private context?: BuildContext;
	private command?: string;
	private taskName?: string;
	private packageName = "test-package";
	private packagePath = "/test/package";
	private scripts: Record<string, string> = {};

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
	 * Get or create BuildGraphPackage for task construction
	 */
	getBuildGraphPackage(): BuildGraphPackage {
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
			buildGraphContext as unknown as BuildGraphContext,
			pkg,
			{},
		);

		return buildGraphPkg;
	}

	/**
	 * Build a TscTask instance
	 */
	buildTscTask(): TscTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "tsc";

		return new TscTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a BiomeTask instance
	 */
	buildBiomeTask(): BiomeTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "biome check";

		return new BiomeTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a WebpackTask instance
	 */
	buildWebpackTask(): WebpackTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "webpack";

		return new WebpackTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a CopyfilesTask instance
	 */
	buildCopyfilesTask(): CopyfilesTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "copyfiles src/**/*.txt dist";

		return new CopyfilesTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a PrettierTask instance
	 */
	buildPrettierTask(): PrettierTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "prettier --check src";

		return new PrettierTask(node, cmd, node.context, this.taskName);
	}
}
