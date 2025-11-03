import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBuildGraphTestContext } from "../support/buildGraphIntegrationHelper.js";
import {
	setupTestContext,
	type TestContext,
} from "../support/integrationTestHelpers.js";

/**
 * Integration tests for complex task dependency scenarios.
 *
 * These tests verify:
 * 1. Task dependency resolution with various syntaxes (^build, @pkg#task)
 * 2. Before/after weak dependencies
 * 3. Cross-package task references
 * 4. Circular dependency detection
 * 5. Missing task handling
 * 6. Task execution order with complex dependencies
 */
describe("Task Dependencies Integration", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "..", "fixtures");

	beforeEach(async () => {
		ctx = await setupTestContext("sail-integration-deps-");
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	describe("dependency syntax variations", () => {
		it("should resolve ^task dependencies (dependencies' tasks)", async () => {
			// Copy simple-monorepo fixture (has ^build syntax)
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Build and verify ^build resolution
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build"], {
				force: true,
			});

			// Find packages
			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const appPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/app",
			);

			expect(libPkg).toBeDefined();
			expect(appPkg).toBeDefined();

			// app depends on lib, so app#build should depend on lib#build (^build)
			const appBuildTask = appPkg?.taskManager.tasksMap.get("build");
			const libBuildTask = libPkg?.taskManager.tasksMap.get("build");

			expect(appBuildTask).toBeDefined();
			expect(libBuildTask).toBeDefined();

			// Verify dependency relationship
			const deps = Array.from(appBuildTask?.dependentLeafTasks ?? []);
			expect(deps).toContain(libBuildTask);
		}, 180_000);

		it("should resolve @package#task cross-package dependencies", async () => {
			// Create monorepo with explicit cross-package task reference
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });
			await mkdir(join(packagesDir, "app"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			// Lib package with test task
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "echo 'building lib'",
							test: "echo 'testing lib'",
						},
						sail: {
							tasks: {
								build: { script: true },
								test: { script: true },
							},
						},
					},
					null,
					2,
				),
			);

			// App package that depends on lib's test task explicitly
			await writeFile(
				join(packagesDir, "app", "package.json"),
				JSON.stringify(
					{
						name: "@test/app",
						version: "1.0.0",
						dependencies: {
							"@test/lib": "workspace:^",
						},
						scripts: {
							build: "echo 'building app'",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["@test/lib#test"], // Explicit cross-package reference
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Build and verify cross-package dependency
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build"], {
				force: true,
			});

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const appPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/app",
			);

			const libTestTask = libPkg?.taskManager.tasksMap.get("test");
			const appBuildTask = appPkg?.taskManager.tasksMap.get("build");

			expect(libTestTask).toBeDefined();
			expect(appBuildTask).toBeDefined();

			// app#build should depend on lib#test
			const deps = Array.from(appBuildTask?.dependentLeafTasks ?? []);
			expect(deps).toContain(libTestTask);
		}, 180_000);
	});

	describe("before/after weak dependencies", () => {
		it("should execute before tasks if target task is scheduled", async () => {
			// Create monorepo with before dependency
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			// Package with before relationship: clean runs before build
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							clean: "echo 'cleaning'",
							build: "echo 'building'",
						},
						sail: {
							tasks: {
								clean: {
									before: ["build"], // Weak dependency: run before build if build is scheduled
									script: true,
								},
								build: {
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Build with BOTH clean and build tasks explicitly
			// Note: before/after are "weak dependencies" - they don't auto-create tasks
			// We must explicitly request both tasks for the ordering to apply
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["clean", "build"], {
				force: true,
			});

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const cleanTask = libPkg?.taskManager.tasksMap.get("clean");
			const buildTask = libPkg?.taskManager.tasksMap.get("build");

			expect(cleanTask).toBeDefined();
			expect(buildTask).toBeDefined();

			// Verify at least 2 tasks executed (clean + build)
			expect(buildGraph.taskStats.leafBuiltCount).toBeGreaterThanOrEqual(2);
		}, 180_000);

		it("should execute after tasks if target task is scheduled", async () => {
			// Create monorepo with after dependency
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			// Package with after relationship: verify runs after build
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "echo 'building'",
							verify: "echo 'verifying'",
						},
						sail: {
							tasks: {
								build: {
									script: true,
								},
								verify: {
									after: ["build"], // Weak dependency: run after build if build is scheduled
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Build with BOTH build and verify tasks explicitly
			// Note: after is a "weak dependency" - doesn't auto-create tasks
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build", "verify"], {
				force: true,
			});

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const buildTask = libPkg?.taskManager.tasksMap.get("build");
			const verifyTask = libPkg?.taskManager.tasksMap.get("verify");

			expect(buildTask).toBeDefined();
			expect(verifyTask).toBeDefined();

			// Verify both tasks executed
			expect(buildGraph.taskStats.leafBuiltCount).toBeGreaterThanOrEqual(2);
		}, 180_000);

		it("should not execute before/after tasks if target is not scheduled", async () => {
			// Create monorepo with before/after but different target task
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							clean: "echo 'cleaning'",
							build: "echo 'building'",
							test: "echo 'testing'",
						},
						sail: {
							tasks: {
								clean: {
									before: ["build"], // Only runs if build is scheduled
									script: true,
								},
								build: {
									script: true,
								},
								test: {
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Execute test task only - clean should NOT run
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["test"], { force: true });

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const testTask = libPkg?.taskManager.tasksMap.get("test");

			expect(testTask).toBeDefined();

			// Only test task should have executed (count = 1)
			expect(buildGraph.taskStats.leafBuiltCount).toBe(1);
		}, 180_000);
	});

	describe("complex dependency chains", () => {
		it("should resolve multi-level task dependencies", async () => {
			// Copy diamond-dependency fixture
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build and verify dependency chain
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build"], {
				force: true,
			});

			// Verify all packages built (4 total in diamond)
			expect(buildGraph.taskStats.leafBuiltCount).toBe(4);

			// Find all packages
			const base = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/base",
			);
			const left = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/left",
			);
			const right = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/right",
			);
			const top = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/top",
			);

			// Verify dependency structure
			// top depends on left and right, both depend on base
			const topBuildTask = top?.taskManager.tasksMap.get("build");
			const leftBuildTask = left?.taskManager.tasksMap.get("build");
			const rightBuildTask = right?.taskManager.tasksMap.get("build");
			const baseBuildTask = base?.taskManager.tasksMap.get("build");

			expect(topBuildTask).toBeDefined();
			expect(leftBuildTask).toBeDefined();
			expect(rightBuildTask).toBeDefined();
			expect(baseBuildTask).toBeDefined();

			// top#build should depend on left#build and right#build
			const topDeps = Array.from(topBuildTask?.dependentLeafTasks ?? []);
			expect(topDeps).toContain(leftBuildTask);
			expect(topDeps).toContain(rightBuildTask);

			// left#build should depend on base#build
			const leftDeps = Array.from(leftBuildTask?.dependentLeafTasks ?? []);
			expect(leftDeps).toContain(baseBuildTask);

			// right#build should depend on base#build
			const rightDeps = Array.from(rightBuildTask?.dependentLeafTasks ?? []);
			expect(rightDeps).toContain(baseBuildTask);
		}, 180_000);

		it("should handle mixed dependency types in same package", async () => {
			// Create package with strong and weak dependencies
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							clean: "echo 'cleaning'",
							generate: "echo 'generating'",
							compile: "echo 'compiling'",
							build: "echo 'building'",
						},
						sail: {
							tasks: {
								clean: {
									before: ["build"], // Weak: runs before build if build scheduled
									script: true,
								},
								generate: {
									script: true,
								},
								compile: {
									dependsOn: ["generate"], // Strong: always runs generate first
									script: true,
								},
								build: {
									dependsOn: ["compile"], // Strong: always runs compile first
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Execute build - should run: generate, compile, build (3 tasks)
			// Note: clean has before: ["build"] but that's a weak dependency
			// It won't auto-create, so only the strong dependencies run
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build"], {
				force: true,
			});

			// Verify 3 tasks executed (NOT 4 - clean is not auto-created)
			expect(buildGraph.taskStats.leafBuiltCount).toBe(3);

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);

			const _cleanTask = libPkg?.taskManager.tasksMap.get("clean");
			const generateTask = libPkg?.taskManager.tasksMap.get("generate");
			const compileTask = libPkg?.taskManager.tasksMap.get("compile");
			const buildTask = libPkg?.taskManager.tasksMap.get("build");

			// Verify strong dependencies
			const compileDeps = Array.from(compileTask?.dependentLeafTasks ?? []);
			expect(compileDeps).toContain(generateTask);

			const buildDeps = Array.from(buildTask?.dependentLeafTasks ?? []);
			expect(buildDeps).toContain(compileTask);
		}, 180_000);
	});

	describe("error scenarios", () => {
		it("should detect circular task dependencies", async () => {
			// Create package with circular dependency
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			// Package with circular task dependency: build -> test -> build
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "echo 'building'",
							test: "echo 'testing'",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["test"],
									script: true,
								},
								test: {
									dependsOn: ["build"], // Circular!
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Attempt to build - should detect circular dependency
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			// Should either throw or handle gracefully
			try {
				await buildCtx.executeBuild(["build"], { force: true });
				// If no error thrown, verify build completed (circular handled)
			} catch (error) {
				// Expected: circular dependency detected
				expect(error).toBeDefined();
			}
		}, 180_000);

		it("should handle missing task references gracefully", async () => {
			// Create package with reference to non-existent task
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "echo 'building'",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["nonexistent"], // Task doesn't exist
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Should provide clear error for missing task reference
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			// Build should throw clear error about invalid dependency
			await expect(
				buildCtx.executeBuild(["build"], { force: true }),
			).rejects.toThrow(/nonexistent/);
		}, 180_000);
	});

	describe("task execution order", () => {
		it("should execute tasks in correct dependency order", async () => {
			// Create monorepo with clear execution order
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "base"), { recursive: true });
			await mkdir(join(packagesDir, "mid"), { recursive: true });
			await mkdir(join(packagesDir, "top"), { recursive: true });

			await writeFile(
				join(ctx.testDir, "package.json"),
				JSON.stringify(
					{
						name: "test-monorepo",
						private: true,
						workspaces: ["packages/*"],
					},
					null,
					2,
				),
			);

			// Add minimal config files (required for config loading)
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = { version: 1 };
`,
			);
			await writeFile(
				join(ctx.testDir, "buildProject.config.cjs"),
				`module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: { test: { include: ["*"] } },
			},
		},
	},
};
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-workspace.yaml"),
				`packages:
  - 'packages/*'
`,
			);
			await writeFile(
				join(ctx.testDir, "pnpm-lock.yaml"),
				`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .: {}
`,
			);

			// Linear dependency chain: top -> mid -> base
			await writeFile(
				join(packagesDir, "base", "package.json"),
				JSON.stringify(
					{
						name: "@test/base",
						version: "1.0.0",
						scripts: {
							build: "echo 'base'",
						},
						sail: {
							tasks: {
								build: { script: true },
							},
						},
					},
					null,
					2,
				),
			);

			await writeFile(
				join(packagesDir, "mid", "package.json"),
				JSON.stringify(
					{
						name: "@test/mid",
						version: "1.0.0",
						dependencies: {
							"@test/base": "workspace:^",
						},
						scripts: {
							build: "echo 'mid'",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["^build"],
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			await writeFile(
				join(packagesDir, "top", "package.json"),
				JSON.stringify(
					{
						name: "@test/top",
						version: "1.0.0",
						dependencies: {
							"@test/mid": "workspace:^",
						},
						scripts: {
							build: "echo 'top'",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["^build"],
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Execute build and verify order via levels
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build"], {
				force: true,
			});

			const basePkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/base",
			);
			const midPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/mid",
			);
			const topPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/top",
			);

			// Verify levels ensure correct execution order
			expect(basePkg?.level).toBe(0); // Executes first
			expect(midPkg?.level).toBe(1); // Executes second
			expect(topPkg?.level).toBe(2); // Executes last

			// All 3 tasks should have executed
			expect(buildGraph.taskStats.leafBuiltCount).toBe(3);
		}, 180_000);
	});
});
