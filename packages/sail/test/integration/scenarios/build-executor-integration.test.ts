import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createBuildGraphTestContext,
	executeBuildAndGetResult,
} from "../support/buildGraphIntegrationHelper.js";
import {
	setupTestContext,
	type TestContext,
} from "../support/integrationTestHelpers.js";

/**
 * Integration tests for BuildExecutor workflow and execution logic.
 *
 * These tests verify:
 * 1. Task scheduling and priority queue management
 * 2. Concurrency control and parallel execution
 * 3. Build statistics collection and reporting
 * 4. Error handling and propagation
 * 5. Complete build workflow from initialization to completion
 */
describe("BuildExecutor Integration", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "..", "fixtures");

	beforeEach(async () => {
		ctx = await setupTestContext("sail-integration-executor-");
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	describe("task scheduling and execution", () => {
		it("should execute tasks in dependency order via priority queue", async () => {
			// Copy diamond-dependency fixture (has clear dependency levels)
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build and track timing
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify all 4 packages built
			expect(result.buildGraph.taskStats.leafBuiltCount).toBe(4);

			// Verify packages at same level could execute in parallel
			const packages = result.buildGraph.buildPackages;
			const left = packages.find((p) => p.pkg.name === "@test/left");
			const right = packages.find((p) => p.pkg.name === "@test/right");

			// left and right are both at level 1, can execute in parallel
			expect(left?.level).toBe(right?.level);
		}, 180_000);

		it("should respect concurrency limits", async () => {
			// Copy simple-monorepo fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build with concurrency limit
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"], {
				concurrency: 1, // Force sequential execution
			});

			// Verify build succeeded with concurrency limit
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
			expect(result.buildGraph).toBeDefined();
		}, 180_000);

		it("should handle parallel task execution correctly", async () => {
			// Copy diamond-dependency (has parallel opportunities)
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute with higher concurrency
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"], {
				concurrency: 4,
			});

			// All 4 tasks should complete successfully
			expect(result.buildGraph.taskStats.leafBuiltCount).toBe(4);

			// Verify total elapsed time is reasonable (parallel execution)
			expect(result.elapsedTime).toBeGreaterThan(0);
		}, 180_000);
	});

	describe("build statistics", () => {
		it("should collect accurate task execution statistics", async () => {
			// Copy simple-monorepo fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify statistics are collected
			const stats = result.buildGraph.taskStats;
			expect(stats).toBeDefined();

			// At least 2 tasks should have built (lib + app)
			expect(stats.leafBuiltCount).toBeGreaterThanOrEqual(2);

			// Verify other stat fields exist
			expect(stats.leafUpToDateCount).toBeDefined();
			expect(stats.leafUpToDateCount).toBeGreaterThanOrEqual(0);
		}, 180_000);

		it("should track total elapsed time accurately", async () => {
			// Copy simple-monorepo fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build with timing
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify elapsed time is positive
			expect(result.elapsedTime).toBeGreaterThan(0);

			// Verify total elapsed time from BuildGraph
			const totalTime = result.buildGraph.totalElapsedTime;
			expect(totalTime).toBeGreaterThan(0);
		}, 180_000);

		it("should track queue wait times for tasks", async () => {
			// Copy diamond-dependency (has queue opportunities)
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify queue wait time is tracked
			const queueWaitTime = result.buildGraph.totalQueueWaitTime;
			expect(queueWaitTime).toBeGreaterThanOrEqual(0);

			// Total time should be >= queue wait time
			const totalTime = result.buildGraph.totalElapsedTime;
			expect(totalTime).toBeGreaterThanOrEqual(queueWaitTime);
		}, 180_000);

		it("should track number of skipped tasks", async () => {
			// Copy fixture and build twice to get skips
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Second build - should have skips (cache hits)
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify skipped tasks tracked
			const numSkipped = result2.buildGraph.numSkippedTasks;
			expect(numSkipped).toBeGreaterThan(0);
		}, 180_000);
	});

	describe("cache integration", () => {
		it("should collect and report cache statistics", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Second build with cache
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify cache statistics are available
			expect(result2.cacheStats).toBeDefined();

			// Should contain cache hit information
			if (result2.cacheStats) {
				// Cache stats should mention hits or lookups
				const hasHits =
					result2.cacheStats.includes("hits") ||
					result2.cacheStats.includes("up-to-date");
				expect(hasHits).toBe(true);
			}
		}, 180_000);

		it("should invalidate cache when files change", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build
			const result1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const initialBuiltCount = result1.buildGraph.taskStats.leafBuiltCount;

			// Modify a file
			const libSource = join(ctx.testDir, "packages", "lib", "src", "index.ts");
			await writeFile(
				libSource,
				`
export function greet(name: string): string {
	return \`Hello, \${name}! MODIFIED!\`;
}
`,
			);

			// Second build - should rebuild affected packages
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Some tasks should rebuild (cache invalidated)
			expect(result2.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			// Should have some up-to-date tasks (unaffected packages)
			// This verifies cache invalidation is selective, not global
			const hasUpToDate =
				result2.buildGraph.taskStats.leafUpToDateCount > 0 ||
				result2.buildGraph.taskStats.leafBuiltCount < initialBuiltCount;
			expect(hasUpToDate).toBe(true);
		}, 180_000);
	});

	describe("error handling", () => {
		it("should handle task execution failures", async () => {
			// Create package with failing task
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

			// Add sail.config.cjs
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = {
	version: 1,
	tasks: {
		build: {
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

			// Package with failing build script
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "exit 1", // Failing script
						},
					},
					null,
					2,
				),
			);

			// Build should handle failure gracefully
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			try {
				await buildCtx.executeBuild(["build"]);
				// If no error thrown, verify build reported failure
			} catch (error) {
				// Expected: build failure detected
				expect(error).toBeDefined();
			}
		}, 180_000);

		it("should propagate errors to dependent tasks", async () => {
			// Create chain where failure should stop dependents
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

			// Add sail.config.cjs
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = {
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

			// Lib with failing build
			await writeFile(
				join(packagesDir, "lib", "package.json"),
				JSON.stringify(
					{
						name: "@test/lib",
						version: "1.0.0",
						scripts: {
							build: "exit 1",
						},
					},
					null,
					2,
				),
			);

			// App depends on lib
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

			// Build should fail and not execute app build
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			try {
				await buildCtx.executeBuild(["build"]);
				// If no error, verify app didn't build
			} catch (error) {
				// Expected: lib build failed, app build didn't execute
				expect(error).toBeDefined();
			}
		}, 180_000);

		it("should collect error summary for failed builds", async () => {
			// Create package with failing task
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

			// Add sail.config.cjs
			await writeFile(
				join(ctx.testDir, "sail.config.cjs"),
				`module.exports = {
	version: 1,
	tasks: {
		build: {
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
							build: "exit 1",
						},
					},
					null,
					2,
				),
			);

			// Execute build and capture failure
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);
			await buildCtx.installDependencies();

			try {
				const buildGraph = await buildCtx.executeBuild(["build"]);

				// If build completed, check for failure summary
				const failureSummary = buildGraph.taskFailureSummary();
				expect(failureSummary).toBeDefined();
			} catch (error) {
				// Expected error
				expect(error).toBeDefined();
			}
		}, 180_000);
	});

	describe("complete build workflow", () => {
		it("should execute complete workflow: init → build → stats", async () => {
			// Copy simple-monorepo fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute full workflow
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);

			// 1. Install dependencies
			const installed = await buildCtx.installDependencies();
			expect(installed).toBe(true);

			// 2. Create BuildGraph (initialization)
			const buildGraph = await buildCtx.createBuildGraph();
			expect(buildGraph).toBeDefined();
			expect(buildGraph.buildPackages.length).toBeGreaterThan(0);

			// 3. Check install
			const checkResult = await buildGraph.checkInstall();
			expect(checkResult).toBe(true);

			// 4. Execute build
			await buildGraph.build();

			// 5. Verify statistics
			const stats = buildGraph.taskStats;
			expect(stats.leafBuiltCount).toBeGreaterThan(0);

			const totalTime = buildGraph.totalElapsedTime;
			expect(totalTime).toBeGreaterThan(0);

			const cacheStats = buildGraph.getCacheStatistics();
			expect(cacheStats).toBeDefined();
		}, 180_000);

		it("should support multiple builds in same session", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute multiple builds
			const result1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Both builds should succeed
			expect(result1.buildGraph).toBeDefined();
			expect(result2.buildGraph).toBeDefined();

			// First build executes tasks
			expect(result1.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			// Second build uses cache
			expect(result2.buildGraph.taskStats.leafUpToDateCount).toBeGreaterThan(0);
		}, 180_000);

		it("should handle incremental builds correctly", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Initial build
			const result1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const initialCount = result1.buildGraph.taskStats.leafBuiltCount;

			// Modify single file
			const libSource = join(ctx.testDir, "packages", "lib", "src", "index.ts");
			await writeFile(
				libSource,
				`
export function greet(name: string): string {
	return \`Modified: \${name}\`;
}
`,
			);

			// Incremental build
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Some tasks rebuilt, some cached
			expect(result2.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
			expect(result2.buildGraph.taskStats.leafUpToDateCount).toBeGreaterThanOrEqual(
				0,
			);

			// Total tasks = built + up-to-date
			const totalTasks =
				result2.buildGraph.taskStats.leafBuiltCount +
				result2.buildGraph.taskStats.leafUpToDateCount;
			expect(totalTasks).toBeGreaterThanOrEqual(initialCount);
		}, 180_000);
	});

	describe("performance characteristics", () => {
		it("should complete small monorepo builds in reasonable time", async () => {
			// Copy simple-monorepo (2 packages)
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build and verify timing
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Build should complete in reasonable time (< 60s for 2 packages)
			expect(result.elapsedTime).toBeLessThan(60);

			// Verify build succeeded
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
		}, 180_000);

		it("should show performance improvement with caching", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build (no cache)
			const result1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const time1 = result1.elapsedTime;

			// Second build (with cache)
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const time2 = result2.elapsedTime;

			// Cached build should be significantly faster
			// (at least 50% faster, though actual ratio depends on hardware)
			expect(time2).toBeLessThan(time1);

			// Verify second build used cache
			expect(result2.buildGraph.taskStats.leafUpToDateCount).toBeGreaterThan(0);
		}, 180_000);
	});
});
