import type { BuildContext } from "../../../src/core/buildContext.js";
import { BuildGraphPackage } from "../../../src/core/buildGraph.js";
// Import dependencies needed for BuildGraphContext
import { FileHashCache } from "../../../src/core/fileHashCache.js";
import { BuildProfiler } from "../../../src/core/performance/BuildProfiler.js";
import { ApiExtractorTask } from "../../../src/core/tasks/leaf/apiExtractorTask.js";
import { BiomeTask } from "../../../src/core/tasks/leaf/biomeTasks.js";
import {
	JssmVizTask,
	MarkdownMagicTask,
	OclifManifestTask,
	OclifReadmeTask,
	SyncpackLintSemverRangesTask,
	SyncpackListMismatchesTask,
} from "../../../src/core/tasks/leaf/commonDeclarativeTasks.js";
import {
	FlubCheckLayerTask,
	FlubCheckPolicyTask,
	FlubGenerateChangesetConfigTask,
	FlubGenerateTypeTestsTask,
	FlubListTask,
} from "../../../src/core/tasks/leaf/flubTasks.js";
import { GenerateEntrypointsTask } from "../../../src/core/tasks/leaf/generateEntrypointsTask.js";
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
import { EsLintTask } from "../../../src/core/tasks/leaf/lintTasks.js";
import {
	CopyfilesTask,
	DepCruiseTask,
	EchoTask,
	GenVerTask,
	GoodFenceTask,
} from "../../../src/core/tasks/leaf/miscTasks.js";
import { PrettierTask } from "../../../src/core/tasks/leaf/prettierTask.js";
import { TscTask } from "../../../src/core/tasks/leaf/tscTask.js";
import { WebpackTask } from "../../../src/core/tasks/leaf/webpackTask.js";
import { BuildContextBuilder } from "./BuildContextBuilder.js";
import { PackageBuilder } from "./PackageBuilder.js";

export class LeafTaskBuilder {
	private buildGraphPackage?: BuildGraphPackage;
	private context?: BuildContext;
	private command?: string;
	private taskName?: string;
	private packageName = "test-package";
	private packagePath = "/test/package";
	private scripts: Record<string, string> = {};
	private workerPool?: { useWorkerThreads?: boolean };

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
	 * Alias for withPackagePath for clarity in tests
	 */
	withPackageDirectory(path: string): this {
		return this.withPackagePath(path);
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
	 * Set worker pool configuration
	 */
	withWorkerPool(workerPool: { useWorkerThreads?: boolean }): this {
		this.workerPool = workerPool;
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
			workerPool: this.workerPool,
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

	/**
	 * Build an EchoTask instance
	 */
	buildEchoTask(): EchoTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "echo test";

		return new EchoTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a GenVerTask instance
	 */
	buildGenVerTask(): GenVerTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "gen-version";

		return new GenVerTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a GoodFenceTask instance
	 */
	buildGoodFenceTask(): GoodFenceTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "good-fences";

		return new GoodFenceTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a DepCruiseTask instance
	 */
	buildDepCruiseTask(): DepCruiseTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "depcruise src";

		return new DepCruiseTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build an EsLintTask instance
	 */
	buildEsLintTask(): EsLintTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "eslint src";

		return new EsLintTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build an OclifManifestTask instance
	 */
	buildOclifManifestTask(): OclifManifestTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "oclif manifest";

		return new OclifManifestTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build an OclifReadmeTask instance
	 */
	buildOclifReadmeTask(): OclifReadmeTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "oclif readme";

		return new OclifReadmeTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a SyncpackLintSemverRangesTask instance
	 */
	buildSyncpackLintSemverRangesTask(): SyncpackLintSemverRangesTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "syncpack lint-semver-ranges";

		return new SyncpackLintSemverRangesTask(
			node,
			cmd,
			node.context,
			this.taskName,
		);
	}

	/**
	 * Build a SyncpackListMismatchesTask instance
	 */
	buildSyncpackListMismatchesTask(): SyncpackListMismatchesTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "syncpack list-mismatches";

		return new SyncpackListMismatchesTask(
			node,
			cmd,
			node.context,
			this.taskName,
		);
	}

	/**
	 * Build a MarkdownMagicTask instance
	 */
	buildMarkdownMagicTask(): MarkdownMagicTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "markdown-magic";

		return new MarkdownMagicTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a JssmVizTask instance
	 */
	buildJssmVizTask(): JssmVizTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "jssm-viz";

		return new JssmVizTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build an ApiExtractorTask instance
	 */
	buildApiExtractorTask(): ApiExtractorTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "api-extractor run --local";

		return new ApiExtractorTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a GenerateEntrypointsTask instance
	 */
	buildGenerateEntrypointsTask(): GenerateEntrypointsTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "flub generate entrypoints";

		return new GenerateEntrypointsTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a FlubListTask instance
	 */
	buildFlubListTask(): FlubListTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "flub list";

		return new FlubListTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a FlubCheckLayerTask instance
	 */
	buildFlubCheckLayerTask(): FlubCheckLayerTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "flub check layers";

		return new FlubCheckLayerTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a FlubCheckPolicyTask instance
	 */
	buildFlubCheckPolicyTask(): FlubCheckPolicyTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "flub check policy";

		return new FlubCheckPolicyTask(node, cmd, node.context, this.taskName);
	}

	/**
	 * Build a FlubGenerateTypeTestsTask instance
	 */
	buildFlubGenerateTypeTestsTask(): FlubGenerateTypeTestsTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "flub generate typetests";

		return new FlubGenerateTypeTestsTask(
			node,
			cmd,
			node.context,
			this.taskName,
		);
	}

	/**
	 * Build a FlubGenerateChangesetConfigTask instance
	 */
	buildFlubGenerateChangesetConfigTask(): FlubGenerateChangesetConfigTask {
		const node = this.getBuildGraphPackage();
		const cmd = this.command ?? "flub generate changeset-config";

		return new FlubGenerateChangesetConfigTask(
			node,
			cmd,
			node.context,
			this.taskName,
		);
	}
}
