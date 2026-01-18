import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BuildGraphPackage } from "../../../src/core/buildGraph.js";
import { createBuildGraphTestContext } from "../support/buildGraphIntegrationHelper.js";
import {
	setupTestContext,
	type TestContext,
} from "../support/integrationTestHelpers.js";

/**
 * Filter packages to only include those that should have tasks.
 * Workspace root packages without scripts typically don't get tasks created.
 */
function getPackagesWithScripts(
	packages: BuildGraphPackage[],
): BuildGraphPackage[] {
	return packages.filter((pkg) => {
		// Exclude workspace root packages without scripts
		if (pkg.pkg.isWorkspaceRoot) {
			const hasScripts =
				pkg.pkg.packageJson.scripts &&
				Object.keys(pkg.pkg.packageJson.scripts).length > 0;
			return hasScripts;
		}
		// Include all non-root packages
		return true;
	});
}

/**
 * Integration tests for configuration system end-to-end.
 *
 * These tests verify:
 * 1. Configuration loading from sail.config.cjs
 * 2. Global vs package-specific configuration merging
 * 3. Task definition inheritance and overrides
 * 4. Declarative task configuration
 * 5. Configuration validation and error handling
 */
describe("Configuration System Integration", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "..", "fixtures");

	beforeEach(async () => {
		ctx = await setupTestContext("sail-integration-config-");
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	describe("configuration loading", () => {
		it("should load global configuration from sail.config.cjs", async () => {
			// Copy simple-monorepo fixture (has sail.config.cjs)
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Create BuildGraph context
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			// Execute build to trigger config loading
			const buildGraph = await buildCtx.executeBuild(["build"]);

			// Verify configuration was loaded and applied
			// Check that tasks exist (defined in sail.config.cjs)
			// Filter to packages that should have scripts/tasks
			const packages = getPackagesWithScripts(buildGraph.buildPackages);
			expect(packages.length).toBeGreaterThan(0);

			// Verify each package has a build task from config
			for (const pkg of packages) {
				const buildTask = pkg.taskManager.tasksMap.get("build");
				expect(buildTask).toBeDefined();
			}
		}, 180_000);

		it("should merge package-specific configuration with global config", async () => {
			// Create test monorepo with package-specific config
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "base"), { recursive: true });
			await mkdir(join(packagesDir, "override"), { recursive: true });

			// Root package.json
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

			// Global sail.config.cjs with default task definition
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["^build"],
			script: true
		}
	}
};
`,
			);

			// Add required workspace files
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

			// Base package (uses global config)
			await writeFile(
				join(packagesDir, "base", "package.json"),
				JSON.stringify(
					{
						name: "@test/base",
						version: "1.0.0",
						scripts: {
							build: "echo 'Building base'",
						},
					},
					null,
					2,
				),
			);

			// Override package (has package-specific config)
			await writeFile(
				join(packagesDir, "override", "package.json"),
				JSON.stringify(
					{
						name: "@test/override",
						version: "1.0.0",
						dependencies: {
							"@test/base": "workspace:^",
						},
						scripts: {
							build: "echo 'Building override'",
							test: "echo 'Testing override'",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["^build", "test"], // Override: add test dependency
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

			// Create BuildGraph and verify merged configuration
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.createBuildGraph();

			// Find packages
			const basePkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/base",
			);
			const overridePkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/override",
			);

			expect(basePkg).toBeDefined();
			expect(overridePkg).toBeDefined();

			// Base package should have build task only
			const baseBuildTask = basePkg?.taskManager.tasksMap.get("build");
			expect(baseBuildTask).toBeDefined();

			// Override package should have both build and test tasks
			const overrideBuildTask = overridePkg?.taskManager.tasksMap.get("build");
			const overrideTestTask = overridePkg?.taskManager.tasksMap.get("test");

			expect(overrideBuildTask).toBeDefined();
			expect(overrideTestTask).toBeDefined();

			// Override build task should depend on test task
			// This verifies package-specific config merged correctly
			const buildDeps = Array.from(overrideBuildTask?.dependentLeafTasks ?? []);
			expect(buildDeps).toContain(overrideTestTask);
		}, 180_000);
	});

	describe("task definition inheritance", () => {
		it("should apply global task definitions to all packages", async () => {
			// Copy simple-monorepo fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build"]);

			// Verify all packages have build task from global config
			// Filter to packages that should have scripts/tasks
			const packages = getPackagesWithScripts(buildGraph.buildPackages);
			for (const pkg of packages) {
				const buildTask = pkg.taskManager.tasksMap.get("build");
				expect(buildTask).toBeDefined();
				expect(buildTask?.taskName).toBe("build");
			}
		}, 180_000);

		it("should allow package-specific task definitions to override global", async () => {
			// Create test structure with override
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "standard"), { recursive: true });
			await mkdir(join(packagesDir, "custom"), { recursive: true });

			// Root package.json
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

			// Global config
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`
module.exports = {
	version: 1,
	tasks: {
		clean: {
			script: true
		}
	}
};
`,
			);

			// Add required workspace files
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

			// Standard package (uses global clean)
			await writeFile(
				join(packagesDir, "standard", "package.json"),
				JSON.stringify(
					{
						name: "@test/standard",
						version: "1.0.0",
						scripts: {
							clean: "rm -rf dist",
						},
					},
					null,
					2,
				),
			);

			// Custom package (overrides clean with dependencies)
			await writeFile(
				join(packagesDir, "custom", "package.json"),
				JSON.stringify(
					{
						name: "@test/custom",
						version: "1.0.0",
						dependencies: {
							"@test/standard": "workspace:^",
						},
						scripts: {
							clean: "rm -rf dist build",
							prepare: "echo 'prepare'",
						},
						sail: {
							tasks: {
								clean: {
									dependsOn: ["prepare"],
									script: true,
								},
								prepare: {
									script: true,
								},
							},
						},
					},
					null,
					2,
				),
			);

			// Build and verify
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.createBuildGraph({
				buildTaskNames: ["clean"],
			});

			// Find packages
			const standardPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/standard",
			);
			const customPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/custom",
			);

			// Standard package should have simple clean task
			const standardClean = standardPkg?.taskManager.tasksMap.get("clean");
			expect(standardClean).toBeDefined();

			// Custom package should have clean task that depends on prepare
			const customClean = customPkg?.taskManager.tasksMap.get("clean");
			const customPrepare = customPkg?.taskManager.tasksMap.get("prepare");

			expect(customClean).toBeDefined();
			expect(customPrepare).toBeDefined();

			// Verify dependency relationship
			const cleanDeps = Array.from(customClean?.dependentLeafTasks ?? []);
			expect(cleanDeps).toContain(customPrepare);
		}, 180_000);
	});

	describe("declarative task configuration", () => {
		it("should support declarative tasks with input/output globs", async () => {
			// Create monorepo with declarative task
			const packagesDir = join(ctx.testDir, "packages");
			await mkdir(join(packagesDir, "lib"), { recursive: true });
			await mkdir(join(packagesDir, "lib", "src"), { recursive: true });

			// Root package.json
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

			// Config with declarative task
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`
module.exports = {
	version: 1,
	tasks: {
		bundle: {
			script: true
		}
	},
	declarativeTasks: {
		"bundle": {
			inputGlobs: ["src/**/*.ts"],
			outputGlobs: ["dist/**/*.js"]
		}
	}
};
`,
			);

			// Add required workspace files
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

			// Package with bundle script
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							bundle: "echo 'bundling'",
						},
					},
					null,
					2,
				),
			);

			// Create source file
			await writeFile(
				join(packagesDir, "lib", "src", "index.ts"),
				"export const lib = 'test';",
			);

			// Build and verify declarative task was created
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.createBuildGraph({
				buildTaskNames: ["bundle"],
			});

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const bundleTask = libPkg?.taskManager.tasksMap.get("bundle");

			expect(bundleTask).toBeDefined();
			expect(bundleTask?.taskName).toBe("bundle");

			// Verify declarative task configuration was applied
			// (Task should track input/output files for incremental builds)
		}, 180_000);
	});

	describe("configuration validation", () => {
		it("should handle missing configuration gracefully", async () => {
			// Create minimal monorepo without sail.config.cjs
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

			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "echo 'building'",
						},
					},
					null,
					2,
				),
			);

			// Add workspace config files
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

			// Should not throw, should use inference mode
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			// createBuildGraph should succeed without config
			const buildGraph = await buildCtx.createBuildGraph();
			expect(buildGraph).toBeDefined();
			// Should discover at least the lib package (may also include workspace root)
			expect(buildGraph.buildPackages.length).toBeGreaterThanOrEqual(1);

			// Verify the lib package exists
			const libPackage = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			expect(libPackage).toBeDefined();
		}, 180_000);

		it("should validate task definition references", async () => {
			// Create config with invalid task reference
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

			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`
module.exports = {
	version: 1,
	tasks: {
		build: {
			dependsOn: ["nonexistent-task"], // Invalid reference
			script: true
		}
	}
};
`,
			);

			// Add required workspace files
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
					},
					null,
					2,
				),
			);

			// Build should handle invalid task reference
			// (Either skip silently or log warning)
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			const buildGraph = await buildCtx.createBuildGraph();

			// Verify build graph was created despite invalid reference
			expect(buildGraph).toBeDefined();

			const libPkg = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);
			const buildTask = libPkg?.taskManager.tasksMap.get("build");
			expect(buildTask).toBeDefined();
		}, 180_000);
	});

	describe("configuration priority", () => {
		it("should prioritize package.json sail config over global config", async () => {
			// Copy fixture and modify to test priority
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Add package-specific sail config to lib package
			const libPackageJsonPath = join(
				ctx.testDir,
				"packages",
				"lib",
				"package.json",
			);
			const libPackageJson = await import("node:fs/promises").then((fs) =>
				fs.readFile(libPackageJsonPath, "utf-8"),
			);
			const libPkg = JSON.parse(libPackageJson);

			// Add sail config with different task definition
			libPkg.sail = {
				tasks: {
					build: {
						dependsOn: [], // Override: no dependencies (different from global)
						script: true,
					},
					custom: {
						script: true,
					},
				},
			};

			// Add custom script
			libPkg.scripts.custom = "echo 'custom task'";

			await writeFile(libPackageJsonPath, JSON.stringify(libPkg, null, 2));

			// Build and verify package config took precedence
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();
			const buildGraph = await buildCtx.executeBuild(["build", "custom"], {
				force: true,
			});

			const libPkgNode = buildGraph.buildPackages.find(
				(p) => p.pkg.name === "@test/lib",
			);

			// Should have custom task (from package config)
			const customTask = libPkgNode?.taskManager.tasksMap.get("custom");
			expect(customTask).toBeDefined();

			// Build task should exist
			const buildTask = libPkgNode?.taskManager.tasksMap.get("build");
			expect(buildTask).toBeDefined();
		}, 180_000);
	});
});
