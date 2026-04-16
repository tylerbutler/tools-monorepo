import { describe, expect, it } from "vitest";
import type { BuildPackage } from "../../../src/common/npmPackage.js";
import {
	BuildContextBuilder,
	BuildGraphBuilder,
	createTaskDefinitionMap,
	PackageBuilder,
	TaskDefinitionBuilder,
} from "../../helpers/builders/index.js";

describe("Test Builders", () => {
	describe("PackageBuilder", () => {
		it("should create a package with default values", () => {
			const pkg = new PackageBuilder().build();

			expect(pkg.name).toBe("test-package");
			expect(pkg.packageJson.version).toBe("1.0.0");
			expect(pkg.packagePath).toBe("/test/package");
		});

		it("should create a package with custom name and version", () => {
			const pkg = new PackageBuilder()
				.withName("my-app")
				.withVersion("2.0.0")
				.build();

			expect(pkg.name).toBe("my-app");
			expect(pkg.packageJson.version).toBe("2.0.0");
		});

		it("should add scripts to package.json", () => {
			const pkg = new PackageBuilder()
				.withScript("build", "tsc")
				.withScript("test", "vitest")
				.build();

			expect(pkg.packageJson.scripts).toEqual({
				build: "tsc",
				test: "vitest",
			});
		});

		it("should add multiple scripts at once", () => {
			const pkg = new PackageBuilder()
				.withScripts({
					build: "tsc",
					test: "vitest",
					lint: "biome lint",
				})
				.build();

			expect(pkg.packageJson.scripts).toEqual({
				build: "tsc",
				test: "vitest",
				lint: "biome lint",
			});
		});

		it("should add dependencies", () => {
			const pkg = new PackageBuilder()
				.withDependency("react", "^18.0.0")
				.withDevDependency("vitest", "^1.0.0")
				.withPeerDependency("typescript", "^5.0.0")
				.build();

			expect(pkg.packageJson.dependencies).toEqual({ react: "^18.0.0" });
			expect(pkg.packageJson.devDependencies).toEqual({ vitest: "^1.0.0" });
			expect(pkg.packageJson.peerDependencies).toEqual({
				typescript: "^5.0.0",
			});
		});

		it("should set custom path", () => {
			const pkg = new PackageBuilder()
				.atPath("/workspace/packages/app")
				.build();

			expect(pkg.packagePath).toBe("/workspace/packages/app");
		});

		it("should mark package as private", () => {
			const pkg = new PackageBuilder().asPrivate().build();

			expect(pkg.packageJson.private).toBe(true);
		});

		it("should add Sail task definitions", () => {
			const pkg = new PackageBuilder()
				.withSailTask("build", {
					dependsOn: ["^build"],
					script: true,
					before: [],
					after: [],
				})
				.build();

			expect(pkg.packageJson.sail?.tasks).toEqual({
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					after: [],
				},
			});
		});

		it("should implement getScript method", () => {
			const pkg = new PackageBuilder()
				.withScript("build", "tsc")
				.withScript("test", "vitest")
				.build();

			expect(pkg.getScript("build")).toBe("tsc");
			expect(pkg.getScript("test")).toBe("vitest");
			expect(pkg.getScript("nonexistent")).toBeUndefined();
		});
	});

	describe("TaskDefinitionBuilder", () => {
		it("should create a task definition with default values", () => {
			const taskDef = new TaskDefinitionBuilder().build();

			expect(taskDef.dependsOn).toEqual([]);
			expect(taskDef.before).toEqual([]);
			expect(taskDef.after).toEqual([]);
			expect(taskDef.children).toEqual([]);
			expect(taskDef.script).toBe(true);
		});

		it("should create a task definition with dependencies", () => {
			const taskDef = new TaskDefinitionBuilder()
				.dependingOn("^build", "clean")
				.build();

			expect(taskDef.dependsOn).toEqual(["^build", "clean"]);
		});

		it("should create a task definition with before/after", () => {
			const taskDef = new TaskDefinitionBuilder()
				.runningBefore("build")
				.runningAfter("compile")
				.build();

			expect(taskDef.before).toEqual(["build"]);
			expect(taskDef.after).toEqual(["compile"]);
		});

		it("should create a task definition with children", () => {
			const taskDef = new TaskDefinitionBuilder()
				.withChildren("compile", "bundle")
				.build();

			expect(taskDef.children).toEqual(["compile", "bundle"]);
		});

		it("should create a group task", () => {
			const taskDef = new TaskDefinitionBuilder().asGroupTask().build();

			expect(taskDef.script).toBe(false);
		});

		it("should set task name and return it", () => {
			const builder = new TaskDefinitionBuilder().named("my-task");

			expect(builder.getTaskName()).toBe("my-task");
		});

		it("should create task entry tuple", () => {
			const [name, config] = new TaskDefinitionBuilder()
				.named("build")
				.dependingOn("^build")
				.buildEntry();

			expect(name).toBe("build");
			expect(config.dependsOn).toEqual(["^build"]);
		});

		it("should create task definition map from multiple builders", () => {
			const taskDefs = createTaskDefinitionMap(
				new TaskDefinitionBuilder().named("build").dependingOn("^build"),
				new TaskDefinitionBuilder().named("test").dependingOn("build"),
				new TaskDefinitionBuilder().named("ci").asGroupTask(),
			);

			expect(taskDefs).toEqual({
				build: {
					dependsOn: ["^build"],
					before: [],
					after: [],
					children: [],
					script: true,
				},
				test: {
					dependsOn: ["build"],
					before: [],
					after: [],
					children: [],
					script: true,
				},
				ci: {
					dependsOn: [],
					before: [],
					after: [],
					children: [],
					script: false,
				},
			});
		});
	});

	describe("BuildContextBuilder", () => {
		it("should create a BuildContext with default values", () => {
			const context = new BuildContextBuilder().buildBuildContext();

			expect(context.repoRoot).toBe("/test/repo");
			expect(context.gitRoot).toBe("/test/repo");
			expect(context.sailConfig.version).toBe(1);
			expect(context.sailConfig.tasks).toEqual({});
		});

		it("should create a BuildContext with custom repo root", () => {
			const context = new BuildContextBuilder()
				.withRepoRoot("/custom/repo")
				.buildBuildContext();

			expect(context.repoRoot).toBe("/custom/repo");
		});

		it("should add task definitions", () => {
			const context = new BuildContextBuilder()
				.withTaskDefinition("build", {
					dependsOn: ["^build"],
					script: true,
					before: [],
					after: [],
					children: [],
				})
				.buildBuildContext();

			expect(context.sailConfig.tasks.build).toEqual({
				dependsOn: ["^build"],
				script: true,
				before: [],
				after: [],
				children: [],
			});
		});

		it("should build a BuildContext object", () => {
			const context = new BuildContextBuilder().build();

			expect(context).toBeDefined();
			expect(context.repoRoot).toBe("/test/repo");
			expect(context.sailConfig.version).toBe(1);
		});
	});

	describe("BuildGraphBuilder", () => {
		it("should create a BuildGraph with packages", () => {
			// Don't define task - let it auto-detect from package.json scripts
			const graph = new BuildGraphBuilder()
				.withPackages(["app1", "lib1"])
				.build();

			expect(graph).toBeDefined();
		});

		it("should create a BuildGraph with dependencies", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app1", "lib1", "lib2"])
				.withDependencies("app1 → lib1, lib2")
				.withTaskDefinition("build", {
					dependsOn: ["^build"],
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
		});

		it("should parse dependency relationships correctly", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app1", "app2", "lib1"])
				.withDependencies("app1 → lib1, app2 → lib1")
				.withTaskDefinition("build", {
					dependsOn: [],
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
		});

		it("should set build tasks", () => {
			// Create package with test script
			const pkg = new PackageBuilder()
				.withName("app1")
				.atPath("/test/packages/app1")
				.withScript("build", "tsc")
				.withScript("test", "vitest") // Add test script
				.build();

			const graph = new BuildGraphBuilder()
				// PackageBuilder returns a mock object, not a real BuildPackage instance
				.withPackage(pkg as unknown as BuildPackage)
				.withBuildTasks(["build", "test"])
				.withTaskDefinition("build", {
					dependsOn: [],
					before: [],
					after: [],
					children: [],
				})
				.withTaskDefinition("test", {
					dependsOn: ["build"],
					before: [],
					after: [],
					children: [],
				})
				.build();

			expect(graph).toBeDefined();
		});

		it("should use context builder for advanced configuration", () => {
			// Create a package with custom task script
			const pkg = new PackageBuilder()
				.withName("app1")
				.atPath("/test/packages/app1")
				.withScript("build", "tsc")
				.withScript("custom-task", "echo test")
				.build();

			const graph = new BuildGraphBuilder()
				// PackageBuilder returns a mock object, not a real BuildPackage instance
				.withPackage(pkg as unknown as BuildPackage)
				.withBuildTasks(["custom-task"])
				.configureContext((ctx) => {
					ctx.withRepoRoot("/custom/repo").withTaskDefinition("custom-task", {
						dependsOn: [],
						before: [],
						after: [],
						children: [],
					});
				})
				.build();

			expect(graph).toBeDefined();
		});
	});

	describe("Integration: Complex Build Graph", () => {
		it("should create a diamond dependency graph", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "lib1", "lib2", "utils"])
				.withDependencies("app → lib1, lib2")
				.withDependencies("lib1 → utils, lib2 → utils")
				.withTaskDefinition("build", {
					dependsOn: ["^build"],
					before: [],
					after: [],
					children: [],
				})
				.withBuildTasks(["build"])
				.build();

			expect(graph).toBeDefined();
		});

		it("should create a linear dependency chain", () => {
			const graph = new BuildGraphBuilder()
				.withPackages(["app", "middleware", "core", "utils"])
				.withDependencies("app → middleware")
				.withDependencies("middleware → core")
				.withDependencies("core → utils")
				.withTaskDefinition("build", {
					dependsOn: ["^build"],
					before: [],
					after: [],
					children: [],
				})
				.withTaskDefinition("test", {
					dependsOn: ["build"],
					before: [],
					after: [],
					children: [],
				})
				.withBuildTasks(["build", "test"])
				.build();

			expect(graph).toBeDefined();
		});
	});
});
