import type { Logger } from "@tylerbu/cli-api";
import type {
	BuildPackage,
	BuildProjectConfig,
	PackageName,
} from "@tylerbu/sail-infrastructure";
import type { SimpleGit } from "simple-git";
import type { BuildContext } from "../../../src/core/buildContext.js";
import type { ISailConfig } from "../../../src/core/sailConfig.js";
import type { TaskHandlerRegistry } from "../../../src/core/tasks/TaskHandlerRegistry.js";
import type { TaskConfig } from "../../../src/core/taskDefinitions.js";
import type { WorkerPool } from "../../../src/core/tasks/workers/workerPool.js";

/**
 * Fluent builder for creating BuildGraphContext objects for testing.
 *
 * Provides sensible defaults and a clean API for test setup.
 *
 * @example
 * ```typescript
 * const context = new BuildContextBuilder()
 *   .withRepoRoot("/test/repo")
 *   .withPackages([pkg1, pkg2])
 *   .withTaskDefinition("build", { dependsOn: ["^build"], script: true })
 *   .build();
 * ```
 */
export class BuildContextBuilder {
	private repoRoot: string = "/test/repo";
	private gitRoot: string = "/test/repo";
	private taskDefinitions: Record<string, TaskConfig> = {};
	private declarativeTasks: Record<string, unknown> = {};
	private packages: Map<string, BuildPackage> = new Map();
	private buildProjectConfig: Partial<BuildProjectConfig> = {};
	private logger?: Logger;
	private gitRepo?: SimpleGit;
	private workerPool?: WorkerPool;
	private taskHandlerRegistry?: TaskHandlerRegistry;

	/**
	 * Set the repository root path
	 */
	withRepoRoot(path: string): this {
		this.repoRoot = path;
		return this;
	}

	/**
	 * Set the git root path (defaults to repoRoot if not set)
	 */
	withGitRoot(path: string): this {
		this.gitRoot = path;
		return this;
	}

	/**
	 * Add a package to the repo package map
	 */
	withPackage(pkg: BuildPackage): this {
		this.packages.set(pkg.name, pkg);
		return this;
	}

	/**
	 * Add multiple packages to the repo package map
	 */
	withPackages(packages: BuildPackage[]): this {
		for (const pkg of packages) {
			this.packages.set(pkg.name, pkg);
		}
		return this;
	}

	/**
	 * Add a task definition to the Sail config
	 */
	withTaskDefinition(name: string, config: TaskConfig): this {
		this.taskDefinitions[name] = config;
		return this;
	}

	/**
	 * Add multiple task definitions
	 */
	withTaskDefinitions(definitions: Record<string, TaskConfig>): this {
		Object.assign(this.taskDefinitions, definitions);
		return this;
	}

	/**
	 * Add a declarative task configuration
	 */
	withDeclarativeTask(name: string, config: unknown): this {
		this.declarativeTasks[name] = config;
		return this;
	}

	/**
	 * Set the build project config
	 */
	withBuildProjectConfig(config: Partial<BuildProjectConfig>): this {
		this.buildProjectConfig = config;
		return this;
	}

	/**
	 * Set a custom logger
	 */
	withLogger(logger: Logger): this {
		this.logger = logger;
		return this;
	}

	/**
	 * Set a custom git repo instance
	 */
	withGitRepo(gitRepo: SimpleGit): this {
		this.gitRepo = gitRepo;
		return this;
	}

	/**
	 * Set a worker pool
	 */
	withWorkerPool(pool: WorkerPool): this {
		this.workerPool = pool;
		return this;
	}

	/**
	 * Set a task handler registry
	 */
	withTaskHandlerRegistry(registry: TaskHandlerRegistry): this {
		this.taskHandlerRegistry = registry;
		return this;
	}

	/**
	 * Create a mock logger with no-op methods
	 */
	private createMockLogger(): Logger {
		return {
			info: () => {},
			warn: () => {},
			error: () => {},
			verbose: () => {},
			debug: () => {},
		} as Logger;
	}

	/**
	 * Create a mock git repo instance
	 */
	private createMockGitRepo(): SimpleGit {
		return {} as SimpleGit;
	}

	/**
	 * Create a mock task handler registry
	 */
	private createMockTaskHandlerRegistry(): TaskHandlerRegistry {
		return {
			register: () => {},
			get: () => undefined,
			has: () => false,
			loadPlugin: async () => {},
			loadPlugins: async () => [],
			getRegisteredExecutables: () => [],
			clear: () => {},
		} as unknown as TaskHandlerRegistry;
	}

	/**
	 * Build a BuildContext object
	 */
	buildBuildContext(): BuildContext {
		const sailConfig: ISailConfig = {
			version: 1,
			tasks: this.taskDefinitions,
			declarativeTasks: this.declarativeTasks,
		};

		return {
			sailConfig,
			buildProjectConfig: this.buildProjectConfig as BuildProjectConfig,
			repoRoot: this.repoRoot,
			gitRoot: this.gitRoot,
			gitRepo: this.gitRepo ?? this.createMockGitRepo(),
			log: this.logger ?? this.createMockLogger(),
			taskHandlerRegistry:
				this.taskHandlerRegistry ?? this.createMockTaskHandlerRegistry(),
		};
	}

	/**
	 * Build a BuildContext object (simpler than full BuildGraphContext)
	 * For tests that need BuildGraphContext, use BuildGraph constructor directly
	 */
	build(): BuildContext {
		return this.buildBuildContext();
	}
}
