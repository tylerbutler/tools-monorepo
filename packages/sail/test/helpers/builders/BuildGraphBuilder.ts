import type { Logger } from "@tylerbu/cli-api";
import type { BuildPackage } from "@tylerbu/sail-infrastructure";
import type { BuildContext } from "../../../src/core/buildContext.js";
import { BuildGraph } from "../../../src/core/buildGraph.js";
import type { BuildOptions } from "../../../src/core/options.js";
import type {
	TaskConfig,
	TaskDefinitionsOnDisk,
} from "../../../src/core/taskDefinitions.js";
import { BuildContextBuilder } from "./BuildContextBuilder.js";
import { PackageBuilder } from "./PackageBuilder.js";

/**
 * Fluent builder for creating BuildGraph instances for testing.
 *
 * Provides high-level API for setting up complex dependency graphs with minimal boilerplate.
 *
 * @example
 * ```typescript
 * const graph = new BuildGraphBuilder()
 *   .withPackages(["app1", "lib1", "lib2"])
 *   .withDependencies("app1 → lib1, app1 → lib2")
 *   .withTaskDefinition("build", { dependsOn: ["^build"], script: true })
 *   .withBuildTasks(["build"])
 *   .build();
 * ```
 */
export class BuildGraphBuilder {
	private packages: Map<string, BuildPackage> = new Map();
	private dependencies: Map<string, string[]> = new Map();
	private taskDefinitions: Record<string, TaskConfig> = {};
	private buildTasks: string[] = ["build"];
	private contextBuilder: BuildContextBuilder = new BuildContextBuilder();
	private logger?: Logger;
	private buildOptions: Partial<BuildOptions> = {};
	private depFilter?: (pkg: BuildPackage) => (dep: BuildPackage) => boolean;

	/**
	 * Add packages by name (creates minimal packages with build script)
	 */
	withPackages(names: string[]): this {
		for (const name of names) {
			const pkg = new PackageBuilder()
				.withName(name)
				.atPath(`/test/packages/${name}`)
				.withScript("build", "tsc") // Add default build script
				.build();
			this.packages.set(name, pkg as unknown as BuildPackage);
		}
		return this;
	}

	/**
	 * Add a pre-built package
	 */
	withPackage(pkg: BuildPackage): this {
		this.packages.set(pkg.name, pkg);
		return this;
	}

	/**
	 * Define package dependencies using arrow syntax
	 *
	 * @param relationships - Dependency relationships like "app1 → lib1, app2 → lib1, lib2"
	 *
	 * @example
	 * ```typescript
	 * builder.withDependencies("app → lib1, lib2")
	 * // app depends on lib1 and lib2
	 *
	 * builder.withDependencies("app1 → lib1, app2 → lib1")
	 * // app1 and app2 both depend on lib1
	 * ```
	 */
	withDependencies(relationships: string): this {
		const parts = relationships.split(",").map((s) => s.trim());

		for (const part of parts) {
			if (part.includes("→")) {
				const [dependent, dependencies] = part.split("→").map((s) => s.trim());
				if (!dependent || !dependencies) continue;

				const deps = dependencies.split(/\s+/).filter(Boolean);
				const existing = this.dependencies.get(dependent) ?? [];
				this.dependencies.set(dependent, [...existing, ...deps]);
			}
		}

		return this;
	}

	/**
	 * Add a task definition
	 */
	withTaskDefinition(name: string, config: TaskConfig): this {
		this.taskDefinitions[name] = config;
		this.contextBuilder.withTaskDefinition(name, config);
		return this;
	}

	/**
	 * Set which tasks to build
	 */
	withBuildTasks(tasks: string[]): this {
		this.buildTasks = tasks;
		return this;
	}

	/**
	 * Set the repository root
	 */
	withRepoRoot(path: string): this {
		this.contextBuilder.withRepoRoot(path);
		return this;
	}

	/**
	 * Set a custom logger
	 */
	withLogger(logger: Logger): this {
		this.logger = logger;
		this.contextBuilder.withLogger(logger);
		return this;
	}

	/**
	 * Set build options
	 */
	withBuildOptions(options: Partial<BuildOptions>): this {
		this.buildOptions = { ...this.buildOptions, ...options };
		return this;
	}

	/**
	 * Set a dependency filter function
	 */
	withDepFilter(
		filter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
	): this {
		this.depFilter = filter;
		return this;
	}

	/**
	 * Use the context builder directly for advanced configuration
	 */
	configureContext(
		configure: (builder: BuildContextBuilder) => void,
	): this {
		configure(this.contextBuilder);
		return this;
	}

	/**
	 * Create a mock logger
	 */
	private createMockLogger(): Logger {
		return {
			info: () => {},
			warn: () => {},
			error: () => {},
			errorLog: () => {},
			verbose: () => {},
			debug: () => {},
		} as Logger;
	}

	/**
	 * Apply package dependencies to package.json
	 */
	private applyDependencies(): void {
		for (const [pkgName, deps] of this.dependencies.entries()) {
			const pkg = this.packages.get(pkgName);
			if (!pkg) {
				throw new Error(
					`Package "${pkgName}" not found when applying dependencies`,
				);
			}

			// Add dependencies to package.json
			for (const depName of deps) {
				const depPkg = this.packages.get(depName);
				if (!depPkg) {
					throw new Error(
						`Dependency package "${depName}" not found for "${pkgName}"`,
					);
				}

				if (!pkg.packageJson.dependencies) {
					pkg.packageJson.dependencies = {};
				}
				pkg.packageJson.dependencies[depName] = depPkg.packageJson.version;
			}
		}
	}

	/**
	 * Default dependency filter (includes all dependencies)
	 */
	private defaultDepFilter(
		_pkg: BuildPackage,
	): (dep: BuildPackage) => boolean {
		return (_dep: BuildPackage) => true;
	}

	/**
	 * Build the BuildGraph instance
	 */
	build(): BuildGraph {
		// Apply package dependencies
		this.applyDependencies();

		// Add all packages to context
		this.contextBuilder.withPackages(Array.from(this.packages.values()));

		// Build the context
		const buildContext: BuildContext = this.contextBuilder.buildBuildContext();

		// Convert task definitions to on-disk format
		// Note: Only include 'script' property if explicitly set to false (for group tasks)
		// If script is true or undefined, omit it to allow auto-detection from package.json
		const globalTaskDefinitions: TaskDefinitionsOnDisk = {};
		for (const [name, config] of Object.entries(this.taskDefinitions)) {
			const taskDef: any = {
				dependsOn: config.dependsOn,
				before: config.before,
				after: config.after,
			};
			// Only include script property if explicitly set to false (for group tasks)
			if (config.script === false) {
				taskDef.script = false;
			}
			globalTaskDefinitions[name] = taskDef;
		}

		// Create the BuildGraph
		return new BuildGraph(
			this.packages as ReadonlyMap<string, BuildPackage>,
			Array.from(this.packages.values()), // releaseGroupPackages
			buildContext,
			this.buildTasks,
			globalTaskDefinitions,
			this.depFilter ?? this.defaultDepFilter.bind(this),
			this.logger ?? this.createMockLogger(),
			{
				matchedOnly: this.buildOptions.matchedOnly ?? false,
				worker: this.buildOptions.worker ?? false,
				workerMemoryLimit: this.buildOptions.workerMemoryLimit,
				workerThreads: this.buildOptions.workerThreads,
			},
		);
	}
}
