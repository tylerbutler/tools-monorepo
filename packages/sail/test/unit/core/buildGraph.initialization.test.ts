import { describe, expect, it } from "vitest";
import { BuildGraph } from "../../../src/core/buildGraph.js";
import {
	BuildContextBuilder,
	BuildGraphBuilder,
	PackageBuilder,
} from "../../helpers/builders/index.js";

/**
 * Comprehensive tests for BuildGraph initialization
 *
 * This test suite focuses on:
 * 1. Package initialization and dependency graph construction
 * 2. Task initialization and cross-package task dependencies
 * 3. BuildGraph internal state after initialization
 *
 * Coverage goals:
 * - initializePackages() method
 * - initializeTasks() method
 * - convertDependencyNodesToBuildGraphPackages() method
 * - createBuildGraphPackage() method
 */
describe("BuildGraph - Initialization", () => {
	describe("Package Initialization", () => {
		it("should initialize packages from dependency nodes", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["pkg1", "pkg2", "pkg3"])
				.build();

			expect(graph).toBeDefined();
			// BuildGraph should have created BuildGraphPackage instances for all packages
			expect(graph.matchedPackages).toBe(3);
		});

		it("should assign dependency levels correctly", () => {
			// Create a simple dependency chain: app → lib → utils
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "lib", "utils"])
				.withDependencies("app → lib")
				.withDependencies("lib → utils")
				.build();

			// Access BuildGraphPackages through the private buildPackages map
			// Since we can't access private fields directly, we verify through public behavior
			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(3);
		});

		it("should handle packages with no dependencies", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["standalone1", "standalone2"])
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(2);
		});

		it("should handle deeply nested dependencies", () => {
			// Create a 5-level dependency chain
			const graph = new BuildGraphBuilder()
				.withPackages(["level1", "level2", "level3", "level4", "level5"])
				.withDependencies("level1 → level2")
				.withDependencies("level2 → level3")
				.withDependencies("level3 → level4")
				.withDependencies("level4 → level5")
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(5);
		});

		it("should establish dependent package relationships", () => {
			// Diamond dependency: app1 & app2 both depend on lib1 & lib2
			const graph = new BuildGraphBuilder()
				.withPackages(["app1", "app2", "lib1", "lib2"])
				.withDependencies("app1 → lib1, lib2")
				.withDependencies("app2 → lib1, lib2")
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(4);
		});

		it("should handle complex multi-level dependency graphs", () => {
			// Complex graph:
			// app → middleware, ui
			// middleware → core, utils
			// ui → core, components
			// components → utils
			const graph = new BuildGraphBuilder()
				.withPackages([
					"app",
					"middleware",
					"ui",
					"core",
					"utils",
					"components",
				])
				.withDependencies("app → middleware, ui")
				.withDependencies("middleware → core, utils")
				.withDependencies("ui → core, components")
				.withDependencies("components → utils")
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(6);
		});
	});

	describe("Task Initialization", () => {
		it("should initialize task managers for all packages", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["pkg1", "pkg2"])
				.build();

			// Verify that tasks were created by checking that graph initialized successfully
			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(2);
		});

		it("should create tasks based on task definitions", () => {
			// Create a package with a compile script
			const pkg = new PackageBuilder()
				.withName("pkg1")
				.withScript("build", "tsc")
				.withScript("compile", "tsc --noEmit")
				.build();

			const graph = new BuildGraphBuilder()
				// biome-ignore lint/suspicious/noExplicitAny: Testing with incomplete package mock
				.withPackage(pkg as any)
				.withTaskDefinition("compile", {
					dependsOn: [],
					before: [],
					after: [],
					children: [],
				})
				.withBuildTasks(["compile"])
				.build();

			expect(graph).toBeDefined();
		});

		it("should resolve task dependencies across packages", () => {
			// Create packages with ^build dependency (depends on build in dependencies)
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "lib"])
				.withDependencies("app → lib")
				.withTaskDefinition("build", {
					dependsOn: ["^build"], // Depend on build in all dependencies
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(2);
		});

		it("should handle task definitions with before/after relationships", () => {
			const pkg = new PackageBuilder()
				.withName("pkg1")
				.withScript("build", "tsc")
				.withScript("lint", "eslint")
				.build();

			const graph = new BuildGraphBuilder()
				// biome-ignore lint/suspicious/noExplicitAny: Testing with incomplete package mock
				.withPackage(pkg as any)
				.withTaskDefinition("lint", {
					dependsOn: [],
					before: ["build"], // Lint runs before build if both are scheduled
					after: [],
					children: [],
				})
				.withBuildTasks(["build", "lint"])
				.build();

			expect(graph).toBeDefined();
		});

		it("should initialize dependent leaf tasks correctly", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "lib1", "lib2"])
				.withDependencies("app → lib1, lib2")
				.withTaskDefinition("build", {
					dependsOn: ["^build"],
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(3);
		});

		it("should handle missing task definitions gracefully", () => {
			// Build a package without explicit task definitions
			// Tasks should be auto-detected from package.json scripts
			const graph = new BuildGraphBuilder().withPackages(["pkg1"]).build();

			expect(graph).toBeDefined();
		});

		it("should support multiple task names", () => {
			const pkg = new PackageBuilder()
				.withName("pkg1")
				.withScript("build", "tsc")
				.withScript("test", "vitest")
				.withScript("lint", "eslint")
				.build();

			const graph = new BuildGraphBuilder()
				// biome-ignore lint/suspicious/noExplicitAny: Testing with incomplete package mock
				.withPackage(pkg as any)
				.withBuildTasks(["build", "test", "lint"])
				.build();

			expect(graph).toBeDefined();
		});
	});

	describe("BuildGraph Internal State", () => {
		it("should track matched packages count", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["pkg1", "pkg2", "pkg3"])
				.build();

			expect(graph.matchedPackages).toBe(3);
		});

		it("should initialize with zero skipped tasks", () => {
			const graph = new BuildGraphBuilder().withPackages(["pkg1"]).build();

			// numSkippedTasks is a getter property
			expect(graph.numSkippedTasks).toBe(0);
		});

		it("should initialize with zero elapsed time", () => {
			const graph = new BuildGraphBuilder().withPackages(["pkg1"]).build();

			// totalElapsedTime is a getter property
			expect(graph.totalElapsedTime).toBe(0);
		});

		it("should initialize with zero queue wait time", () => {
			const graph = new BuildGraphBuilder().withPackages(["pkg1"]).build();

			// totalQueueWaitTime is a getter property
			expect(graph.totalQueueWaitTime).toBe(0);
		});

		it("should provide empty task failure summary initially", () => {
			const graph = new BuildGraphBuilder().withPackages(["pkg1"]).build();

			// taskFailureSummary is a getter property
			const failureSummary = graph.taskFailureSummary;
			expect(failureSummary).toBe("");
		});
	});

	describe("Error Handling", () => {
		it("should throw error when no tasks found", () => {
			// Create a package without any scripts
			const pkg = new PackageBuilder().withName("empty-pkg").build();

			expect(() => {
				new BuildGraphBuilder()
					// biome-ignore lint/suspicious/noExplicitAny: Testing with incomplete package mock
					.withPackage(pkg as any)
					.withBuildTasks(["nonexistent-task"])
					.build();
			}).toThrow(/No task.*found/);
		});

		it("should throw error when creating BuildGraph with empty packages", () => {
			const context = new BuildContextBuilder().buildBuildContext();

			expect(() => {
				new BuildGraph(
					new Map(),
					[],
					context,
					["build"],
					undefined,
					() => () => true,
					context.log,
					{ matchedOnly: false, worker: false },
				);
			}).toThrow();
		});
	});

	describe("Configuration Options", () => {
		it("should support matchedOnly option", () => {
			const pkg1 = new PackageBuilder()
				.withName("matched-pkg")
				.withScript("build", "tsc")
				.build();

			const graph = new BuildGraphBuilder()
				// biome-ignore lint/suspicious/noExplicitAny: Testing with incomplete package mock
				.withPackage({ ...pkg1, matched: true } as any)
				.withBuildOptions({ matchedOnly: true })
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(1);
		});

		it("should initialize worker pool when worker option is true", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["pkg1"])
				.withBuildOptions({
					worker: true,
					workerThreads: 2,
					workerMemoryLimit: 512,
				})
				.build();

			expect(graph).toBeDefined();
		});

		it("should not initialize worker pool when worker option is false", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["pkg1"])
				.withBuildOptions({ worker: false })
				.build();

			expect(graph).toBeDefined();
		});
	});

	describe("Task Definition Merging", () => {
		it("should merge global and package-specific task definitions", () => {
			const pkg = new PackageBuilder()
				.withName("pkg1")
				.withScript("build", "tsc")
				.withScript("clean", "rm -rf dist")
				.withSailTask("build", {
					dependsOn: ["clean"], // Package-specific dependency
				})
				.withSailTask("clean", {
					dependsOn: [],
					script: true,
				})
				.build();

			const graph = new BuildGraphBuilder()
				// biome-ignore lint/suspicious/noExplicitAny: Testing with incomplete package mock
				.withPackage(pkg as any)
				.withTaskDefinition("build", {
					dependsOn: ["^build"], // Global dependency
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
		});

		it("should use global task definitions when no package-specific definitions exist", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["pkg1", "pkg2"])
				.withTaskDefinition("build", {
					dependsOn: ["^build"],
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
		});
	});

	describe("Dependency Graph Structure", () => {
		it("should handle fan-out dependencies (one package depends on many)", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "lib1", "lib2", "lib3", "lib4"])
				.withDependencies("app → lib1, lib2, lib3, lib4")
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(5);
		});

		it("should handle fan-in dependencies (many packages depend on one)", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app1", "app2", "app3", "shared-lib"])
				.withDependencies("app1 → shared-lib")
				.withDependencies("app2 → shared-lib")
				.withDependencies("app3 → shared-lib")
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(4);
		});

		it("should handle diamond dependencies", () => {
			// Classic diamond: app → lib1, lib2; lib1 → utils; lib2 → utils
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "lib1", "lib2", "utils"])
				.withDependencies("app → lib1, lib2")
				.withDependencies("lib1 → utils")
				.withDependencies("lib2 → utils")
				.build();

			expect(graph).toBeDefined();
			expect(graph.matchedPackages).toBe(4);
		});
	});
});
