import type { PackageJson } from "@tylerbu/sail-infrastructure";
import type {
	TaskConfigOnDisk,
	TaskDefinitionsOnDisk,
} from "../../../src/core/taskDefinitions.js";

/**
 * Fluent builder for creating test Package objects with simplified configuration.
 *
 * Provides a clean API for creating Package instances in tests without boilerplate.
 *
 * @example
 * ```typescript
 * const pkg = new PackageBuilder()
 *   .withName("my-app")
 *   .withVersion("2.0.0")
 *   .withScript("build", "tsc")
 *   .withScript("test", "vitest")
 *   .withDependency("@tylerbu/lib", "^1.0.0")
 *   .atPath("/workspace/packages/my-app")
 *   .build();
 * ```
 */
export class PackageBuilder {
	private name = "test-package";
	private version = "1.0.0";
	private scripts: Record<string, string> = {};
	private dependencies: Record<string, string> = {};
	private devDependencies: Record<string, string> = {};
	private peerDependencies: Record<string, string> = {};
	private packagePath = "/test/package";
	private isPrivate?: boolean;
	private sailTasks?: TaskDefinitionsOnDisk;
	private sailDeclarativeTasks?: Record<string, unknown>;
	private matched = true; // Default to true for test packages

	/**
	 * Set the package name
	 */
	withName(name: string): this {
		this.name = name;
		return this;
	}

	/**
	 * Set the package version
	 */
	withVersion(version: string): this {
		this.version = version;
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
	 * Add a production dependency
	 */
	withDependency(name: string, version: string): this {
		this.dependencies[name] = version;
		return this;
	}

	/**
	 * Add a dev dependency
	 */
	withDevDependency(name: string, version: string): this {
		this.devDependencies[name] = version;
		return this;
	}

	/**
	 * Add a peer dependency
	 */
	withPeerDependency(name: string, version: string): this {
		this.peerDependencies[name] = version;
		return this;
	}

	/**
	 * Set the package path (directory)
	 */
	atPath(path: string): this {
		this.packagePath = path;
		return this;
	}

	/**
	 * Mark the package as private
	 */
	asPrivate(isPrivate = true): this {
		this.isPrivate = isPrivate;
		return this;
	}

	/**
	 * Set the matched status (whether package is matched by filters)
	 */
	withMatched(matched: boolean): this {
		this.matched = matched;
		return this;
	}

	/**
	 * Add Sail task definitions
	 */
	withSailTasks(tasks: TaskDefinitionsOnDisk): this {
		this.sailTasks = tasks;
		return this;
	}

	/**
	 * Add a single Sail task definition
	 */
	withSailTask(name: string, config: TaskConfigOnDisk): this {
		if (!this.sailTasks) {
			this.sailTasks = {};
		}
		this.sailTasks[name] = config;
		return this;
	}

	/**
	 * Add Sail declarative tasks
	 */
	withSailDeclarativeTasks(tasks: Record<string, unknown>): this {
		this.sailDeclarativeTasks = tasks;
		return this;
	}

	/**
	 * Build the package.json object
	 */
	buildPackageJson(): PackageJson {
		const packageJson: PackageJson = {
			name: this.name,
			version: this.version,
		};

		if (this.isPrivate !== undefined) {
			packageJson.private = this.isPrivate;
		}

		if (Object.keys(this.scripts).length > 0) {
			packageJson.scripts = this.scripts;
		}

		if (Object.keys(this.dependencies).length > 0) {
			packageJson.dependencies = this.dependencies;
		}

		if (Object.keys(this.devDependencies).length > 0) {
			packageJson.devDependencies = this.devDependencies;
		}

		if (Object.keys(this.peerDependencies).length > 0) {
			packageJson.peerDependencies = this.peerDependencies;
		}

		// Add Sail configuration if present
		if (this.sailTasks || this.sailDeclarativeTasks) {
			packageJson.sail = {};
			if (this.sailTasks) {
				packageJson.sail.tasks = this.sailTasks;
			}
			if (this.sailDeclarativeTasks) {
				packageJson.sail.declarativeTasks = this.sailDeclarativeTasks;
			}
		}

		return packageJson;
	}

	/**
	 * Build a mock Package object suitable for testing
	 */
	build() {
		const packageJson = this.buildPackageJson();
		const scripts = packageJson.scripts || {};

		// Capture dependencies in closure for generator
		const dependencies = this.dependencies;
		const devDependencies = this.devDependencies;
		const peerDependencies = this.peerDependencies;

		// Create generator function that will be called via getter
		function* createDependenciesGenerator() {
			// Yield production dependencies
			for (const [name, version] of Object.entries(dependencies)) {
				yield {
					name,
					version,
					depKind: "prod" as const,
				};
			}

			// Yield dev dependencies
			for (const [name, version] of Object.entries(devDependencies)) {
				yield {
					name,
					version,
					depKind: "dev" as const,
				};
			}

			// Yield peer dependencies
			for (const [name, version] of Object.entries(peerDependencies)) {
				yield {
					name,
					version,
					depKind: "peer" as const,
				};
			}
		}

		return {
			name: this.name,
			nameColored: this.name,
			packagePath: this.packagePath,
			directory: this.packagePath, // Add directory property
			version: this.version,
			packageJson,
			matched: this.matched,
			isReleaseGroupRoot: false,
			/**
			 * Generator that yields all dependencies (prod, dev, peer)
			 * Mimics the behavior of PackageBase.combinedDependencies
			 */
			get combinedDependencies() {
				return createDependenciesGenerator();
			},
			workspace: {
				directory: "/test/repo",
				packageManager: {
					lockfileNames: ["pnpm-lock.yaml"],
				},
			},
			getScript: (scriptName: string) => scripts[scriptName],
		};
	}
}
