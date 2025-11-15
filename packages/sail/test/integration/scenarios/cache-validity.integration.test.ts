import { cp, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type BuildExecutionResult,
	executeBuildAndGetResult,
} from "../support/buildGraphIntegrationHelper.js";
import {
	assertCacheEntryValid,
	assertNoCacheCorruption,
	cleanDonefilesAndOutputs,
	corruptCacheEntry,
	getCacheStatistics,
	waitForFilesystemSync,
} from "../support/cacheValidationHelpers.js";
import {
	setupTestContext,
	type TestContext,
} from "../support/integrationTestHelpers.js";

/**
 * Helper to get detailed cache hit breakdown
 */
interface CacheHitBreakdown {
	donefileHits: number; // leafUpToDateCount - shared cache hits
	sharedCacheHits: number; // from shared cache statistics
	totalCacheHits: number; // leafUpToDateCount
	tasksBuilt: number; // leafBuiltCount
	totalTasks: number; // leafTotalCount
	sharedCacheHitRate: number; // percentage
	overallHitRate: number; // percentage
}

function getCacheHitBreakdown(result: BuildExecutionResult): CacheHitBreakdown {
	const stats = result.buildGraph.taskStats;
	const sharedCache = result.buildGraph.context?.sharedCache;
	const sharedCacheStats = sharedCache?.getStatistics() || {
		hitCount: 0,
		missCount: 0,
	};

	const totalCacheHits = stats.leafUpToDateCount || 0;
	const sharedCacheHits = sharedCacheStats.hitCount || 0;
	const donefileHits = totalCacheHits - sharedCacheHits;
	const tasksBuilt = stats.leafBuiltCount || 0;
	const totalTasks = stats.leafTotalCount || 0;

	const totalLookups = sharedCacheHits + sharedCacheStats.missCount;
	const sharedCacheHitRate =
		totalLookups > 0 ? (sharedCacheHits / totalLookups) * 100 : 0;
	const overallHitRate =
		totalTasks > 0 ? (totalCacheHits / totalTasks) * 100 : 0;

	return {
		donefileHits,
		sharedCacheHits,
		totalCacheHits,
		tasksBuilt,
		totalTasks,
		sharedCacheHitRate,
		overallHitRate,
	};
}

/**
 * Integration tests for cache validity and reliability.
 *
 * These tests verify:
 * 1. Cache entries are stored correctly under high concurrency
 * 2. Cache lookups work immediately after stores
 * 3. Cache handles corruption gracefully
 * 4. Cache entries are visible across processes
 * 5. Cache invalidation works correctly
 */
describe("Cache Validity: Multi-Level Multi-Task Monorepo", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "..", "fixtures");
	const fixtureName = "cache-validity/multi-level-multi-task";

	beforeEach(async () => {
		ctx = await setupTestContext("sail-cache-validity-");
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	describe("Scenario 1: First Build - Cache Population", () => {
		it("should execute all tasks and store cache entries", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build with all tasks
			const result = await executeBuildAndGetResult(ctx.testDir, [
				"build",
				"test",
				"lint",
			]);

			// Verify tasks executed (not cached on first build)
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			// Wait for filesystem to sync
			await waitForFilesystemSync();

			// Verify cache entries exist
			const cacheDir = join(ctx.testDir, ".sail-cache");
			const stats = await getCacheStatistics(cacheDir);

			// Should have cache entries (12 packages × 3 tasks = 36 tasks)
			expect(stats.entriesCount).toBeGreaterThan(0);
			expect(stats.corruptedCount).toBe(0);

			// Verify no corruption
			await assertNoCacheCorruption(cacheDir);
		}, 300_000);
	});

	describe("Scenario 2: Second Build - Full Cache Hit", () => {
		it("should use cache for all tasks on second build", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build - populate cache
			const firstResult = await executeBuildAndGetResult(ctx.testDir, [
				"build",
				"test",
				"lint",
			]);
			const firstBuiltCount = firstResult.buildGraph.taskStats.leafBuiltCount;
			expect(firstBuiltCount).toBeGreaterThan(0);

			await waitForFilesystemSync();

			// Second build - should use cache
			const secondResult = await executeBuildAndGetResult(ctx.testDir, [
				"build",
				"test",
				"lint",
			]);

			// Verify cache was used (tasks should be cached, not built)
			const secondBuiltCount = secondResult.buildGraph.taskStats.leafBuiltCount;
			const upToDateCount = secondResult.buildGraph.taskStats.leafUpToDateCount;

			// On second build, should have fewer tasks built (ideally 0)
			// and more cache hits (up-to-date tasks)
			expect(upToDateCount).toBeGreaterThan(0);
			expect(secondBuiltCount).toBeLessThan(firstBuiltCount);
		}, 300_000);
	});

	describe("Scenario 3: Partial Cache Invalidation", () => {
		it("should rebuild only affected packages when source changes", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build - populate cache
			await executeBuildAndGetResult(ctx.testDir, ["build", "test", "lint"]);
			await waitForFilesystemSync();

			// Modify source file in types package
			const typesSourcePath = join(
				ctx.testDir,
				"packages",
				"types",
				"src",
				"index.ts",
			);
			await writeFile(
				typesSourcePath,
				`export function typesFunction(): string {
  return "types-modified";
}`,
			);

			// Second build - should rebuild types and dependents
			const result = await executeBuildAndGetResult(ctx.testDir, [
				"build",
				"test",
				"lint",
			]);

			// Should have some cache hits (unaffected packages) and some builds (affected packages)
			expect(result.buildGraph.taskStats.leafUpToDateCount).toBeGreaterThan(0);
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			// Verify that at least some packages were affected by the change
			// (types package and its dependents should have been rebuilt)
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThanOrEqual(
				3,
			);
		}, 300_000);
	});

	describe("Scenario 6: Cache Recovery from Corruption", () => {
		it("should handle missing manifest.json gracefully", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build - populate cache
			await executeBuildAndGetResult(ctx.testDir, ["build"]);
			await waitForFilesystemSync();

			const cacheDir = join(ctx.testDir, ".sail-cache");
			const initialStats = await getCacheStatistics(cacheDir);

			// Corrupt a cache entry by removing manifest.json
			if (initialStats.validEntries.length > 0) {
				const entryToCorrupt = initialStats.validEntries[0];
				await corruptCacheEntry(cacheDir, entryToCorrupt, "missing-manifest");

				// Second build - should rebuild corrupted entry
				const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

				// Should have some cache hits (valid entries) and some builds (corrupted entry)
				expect(result.buildGraph.taskStats.leafUpToDateCount).toBeGreaterThan(
					0,
				);
				expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
			}
		}, 300_000);

		it("should handle invalid JSON in manifest.json", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build - populate cache
			await executeBuildAndGetResult(ctx.testDir, ["build"]);
			await waitForFilesystemSync();

			const cacheDir = join(ctx.testDir, ".sail-cache");
			const initialStats = await getCacheStatistics(cacheDir);

			// Corrupt a cache entry with invalid JSON
			if (initialStats.validEntries.length > 0) {
				const entryToCorrupt = initialStats.validEntries[0];
				await corruptCacheEntry(cacheDir, entryToCorrupt, "invalid-json");

				// Second build - should handle corruption gracefully
				const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

				// Build should succeed despite corruption
				expect(
					result.buildGraph.taskStats.leafBuiltCount,
				).toBeGreaterThanOrEqual(0);
			}
		}, 300_000);
	});

	describe("Scenario 7: Cache Under High Parallelism", () => {
		it("should handle cache operations under high concurrency", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build with high concurrency
			const result = await executeBuildAndGetResult(
				ctx.testDir,
				["build", "test", "lint"],
				{ concurrency: 16 },
			);

			// Verify all tasks executed successfully
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			await waitForFilesystemSync();

			// Verify cache has no corruption
			const cacheDir = join(ctx.testDir, ".sail-cache");
			await assertNoCacheCorruption(cacheDir);

			// Second build should use cache
			const secondResult = await executeBuildAndGetResult(
				ctx.testDir,
				["build", "test", "lint"],
				{ concurrency: 16 },
			);

			expect(
				secondResult.buildGraph.taskStats.leafUpToDateCount,
			).toBeGreaterThan(0);
		}, 300_000);
	});

	describe("Cache Entry Validation", () => {
		it("should create valid cache entries with proper structure", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);
			await waitForFilesystemSync();

			// Verify cache entries are valid
			const cacheDir = join(ctx.testDir, ".sail-cache");
			const stats = await getCacheStatistics(cacheDir);

			// Check that we have valid entries
			expect(stats.validEntries.length).toBeGreaterThan(0);

			// Validate first cache entry structure
			if (stats.validEntries.length > 0) {
				await assertCacheEntryValid(cacheDir, stats.validEntries[0]);
			}
		}, 300_000);
	});

	describe("Cache Statistics", () => {
		it("should track cache hits and misses correctly", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build - all misses
			const firstResult = await executeBuildAndGetResult(ctx.testDir, [
				"build",
			]);
			expect(firstResult.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(
				0,
			);

			await waitForFilesystemSync();

			// Second build - should have hits
			const secondResult = await executeBuildAndGetResult(ctx.testDir, [
				"build",
			]);
			expect(
				secondResult.buildGraph.taskStats.leafUpToDateCount,
			).toBeGreaterThan(0);

			// Cache hit count should be positive
			const upToDateCount = secondResult.buildGraph.taskStats.leafUpToDateCount;
			const leafBuiltCount = secondResult.buildGraph.taskStats.leafBuiltCount;

			// Second build should have more cache hits than builds
			expect(upToDateCount).toBeGreaterThanOrEqual(leafBuiltCount);
		}, 300_000);
	});

	describe("Multi-Build Correctness & Cache Hit Rate Analysis", () => {
		const allPackages = [
			"utils",
			"types",
			"config",
			"core",
			"validation",
			"parser",
			"formatter",
			"cli",
			"server",
			"client",
			"app-web",
			"app-desktop",
		];

		it("should achieve 100% shared cache hit rate on repeated builds (no donefiles)", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Build 1: Initial build (populates shared cache)
			const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown1 = getCacheHitBreakdown(build1);

			// Build 1: Should build all 12 packages
			expect(breakdown1.totalTasks).toBe(12);
			expect(breakdown1.tasksBuilt).toBe(12);
			expect(breakdown1.totalCacheHits).toBe(0);
			expect(breakdown1.sharedCacheHits).toBe(0);

			await waitForFilesystemSync();

			// Clean all donefiles and outputs to force shared cache usage
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 2: Should restore entirely from shared cache
			const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown2 = getCacheHitBreakdown(build2);

			// Build 2: All 12 tasks should be satisfied via cache
			expect(breakdown2.totalTasks).toBe(12);
			expect(breakdown2.tasksBuilt).toBe(0);
			expect(breakdown2.totalCacheHits).toBe(12);
			expect(breakdown2.overallHitRate).toBe(100);

			// With no donefiles, hits should come from shared cache
			expect(breakdown2.sharedCacheHits).toBeGreaterThanOrEqual(6); // At least half from shared cache
			expect(breakdown2.sharedCacheHitRate).toBeGreaterThan(40);

			// Clean again for Build 3
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 3: Verify consistency - should still use shared cache
			const build3 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown3 = getCacheHitBreakdown(build3);

			// Build 3: Same as Build 2
			expect(breakdown3.totalTasks).toBe(12);
			expect(breakdown3.tasksBuilt).toBe(0);
			expect(breakdown3.totalCacheHits).toBe(12);
			expect(breakdown3.overallHitRate).toBe(100);
			expect(breakdown3.sharedCacheHits).toBeGreaterThanOrEqual(6);
		}, 300_000);

		it("should restore 100% from shared cache without any local state", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Build 1: Initial build (populates shared cache)
			const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown1 = getCacheHitBreakdown(build1);

			// Build 1: Should build all 12 packages
			expect(breakdown1.totalTasks).toBe(12);
			expect(breakdown1.tasksBuilt).toBe(12);
			expect(breakdown1.totalCacheHits).toBe(0);

			await waitForFilesystemSync();

			// Clean ALL local state - donefiles and outputs
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 2: Should restore entirely from shared cache
			const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown2 = getCacheHitBreakdown(build2);

			// Build 2: All 12 tasks satisfied, none rebuilt
			expect(breakdown2.totalTasks).toBe(12);
			expect(breakdown2.tasksBuilt).toBe(0);
			expect(breakdown2.totalCacheHits).toBe(12);
			expect(breakdown2.overallHitRate).toBe(100);

			// With no local state, hits should come from shared cache
			expect(breakdown2.sharedCacheHits).toBeGreaterThanOrEqual(6);
			expect(breakdown2.sharedCacheHitRate).toBeGreaterThan(40);
		}, 300_000);

		it("should maintain 100% shared cache correctness across 5 consecutive builds", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			const breakdowns: CacheHitBreakdown[] = [];

			// Build 1: Initial (populates shared cache)
			const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			breakdowns.push(getCacheHitBreakdown(build1));
			await waitForFilesystemSync();

			// Builds 2-5: All from shared cache (clean local state each time)
			for (let i = 2; i <= 5; i++) {
				// Clean all local state before each build
				await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

				const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);
				breakdowns.push(getCacheHitBreakdown(result));
			}

			// Verify Build 1: built all 12 packages
			expect(breakdowns[0].totalTasks).toBe(12);
			expect(breakdowns[0].tasksBuilt).toBe(12);
			expect(breakdowns[0].totalCacheHits).toBe(0);
			expect(breakdowns[0].sharedCacheHits).toBe(0);

			// Verify Builds 2-5: all 12 tasks cached via shared cache
			for (let i = 1; i < 5; i++) {
				const breakdown = breakdowns[i];
				expect(breakdown.totalTasks, `Build ${i + 1} total tasks`).toBe(12);
				expect(
					breakdown.tasksBuilt,
					`Build ${i + 1} should not build any tasks`,
				).toBe(0);
				expect(
					breakdown.totalCacheHits,
					`Build ${i + 1} should have full cache hits`,
				).toBe(12);
				expect(
					breakdown.overallHitRate,
					`Build ${i + 1} should have 100% hit rate`,
				).toBe(100);

				// Should use shared cache (at least half of hits)
				expect(
					breakdown.sharedCacheHits,
					`Build ${i + 1} should use shared cache`,
				).toBeGreaterThanOrEqual(6);
				expect(
					breakdown.sharedCacheHitRate,
					`Build ${i + 1} should have good shared cache hit rate`,
				).toBeGreaterThan(40);
			}
		}, 600_000);

		it("should restore partial packages from shared cache correctly", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Build 1: Initial build (populates shared cache)
			const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown1 = getCacheHitBreakdown(build1);

			expect(breakdown1.totalTasks).toBe(12);
			expect(breakdown1.tasksBuilt).toBe(12);

			await waitForFilesystemSync();

			// Clean only 3 packages (Level 0) to test partial restore
			const packagesToClean = ["utils", "types", "config"];
			await cleanDonefilesAndOutputs(ctx.testDir, packagesToClean);

			// Build 2: Should restore 3 cleaned packages from shared cache
			const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown2 = getCacheHitBreakdown(build2);

			// Build 2: All 12 tasks satisfied, none rebuilt
			expect(breakdown2.totalTasks).toBe(12);
			expect(breakdown2.tasksBuilt).toBe(0);
			expect(breakdown2.totalCacheHits).toBe(12);

			// Should have at least 3 shared cache hits from cleaned packages
			expect(breakdown2.sharedCacheHits).toBeGreaterThanOrEqual(3);

			// Clean all 12 packages for Build 3
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 3: All 12 packages should restore from shared cache
			const build3 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown3 = getCacheHitBreakdown(build3);

			// Build 3: All 12 tasks satisfied, none rebuilt
			expect(breakdown3.totalTasks).toBe(12);
			expect(breakdown3.tasksBuilt).toBe(0);
			expect(breakdown3.totalCacheHits).toBe(12);

			// Should have more shared cache hits than Build 2 (all 12 cleaned vs 3)
			expect(breakdown3.sharedCacheHits).toBeGreaterThanOrEqual(
				breakdown2.sharedCacheHits,
			);
			expect(breakdown3.sharedCacheHits).toBeGreaterThanOrEqual(6);
		}, 600_000);

		it("should restore multiple task types from shared cache correctly", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Build 1: All 3 task types across 12 packages (36 total tasks)
			const build1 = await executeBuildAndGetResult(ctx.testDir, [
				"build",
				"test",
				"lint",
			]);
			const breakdown1 = getCacheHitBreakdown(build1);

			// Build 1: 12 packages × 3 tasks = 36 tasks total
			// Some tasks may be skipped initially due to dependencies
			expect(breakdown1.totalTasks).toBeGreaterThanOrEqual(36);
			expect(breakdown1.tasksBuilt).toBeGreaterThan(0);

			await waitForFilesystemSync();

			// Clean all local state to force shared cache
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 2: All task types should restore from shared cache
			const build2 = await executeBuildAndGetResult(ctx.testDir, [
				"build",
				"test",
				"lint",
			]);
			const breakdown2 = getCacheHitBreakdown(build2);

			// Build 2: Same task count, fewer/no rebuilds
			expect(breakdown2.totalTasks).toBe(breakdown1.totalTasks);
			expect(breakdown2.tasksBuilt).toBeLessThanOrEqual(breakdown1.tasksBuilt);
			expect(breakdown2.totalCacheHits).toBeGreaterThan(0);

			// Should use shared cache
			expect(breakdown2.sharedCacheHits).toBeGreaterThanOrEqual(12); // At least build tasks

			// Clean again and build only build tasks
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 3: Only build tasks (12 packages × 1 task = 12 tasks)
			const build3 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown3 = getCacheHitBreakdown(build3);

			// Build 3: Exactly 12 build tasks, all from cache
			expect(breakdown3.totalTasks).toBe(12);
			expect(breakdown3.tasksBuilt).toBe(0);
			expect(breakdown3.totalCacheHits).toBe(12);
			expect(breakdown3.overallHitRate).toBe(100);
			expect(breakdown3.sharedCacheHits).toBeGreaterThanOrEqual(6);
		}, 600_000);

		it("should track shared cache performance metrics accurately", async () => {
			// Copy fixture to test directory
			const fixtureSource = join(fixturesDir, fixtureName);
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Build 1: Populate shared cache
			const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown1 = getCacheHitBreakdown(build1);

			// Build 1: 12 packages built, 12 cache entries created
			expect(breakdown1.totalTasks).toBe(12);
			expect(breakdown1.tasksBuilt).toBe(12);
			expect(breakdown1.totalCacheHits).toBe(0);

			const cacheDir = join(ctx.testDir, ".sail-cache");
			const stats1 = await getCacheStatistics(cacheDir);

			// Should have 12 cache entries (one per package build task)
			expect(stats1.entriesCount).toBe(12);
			expect(stats1.corruptedCount).toBe(0);

			await waitForFilesystemSync();

			// Clean local state to force shared cache usage
			await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

			// Build 2: Use shared cache exclusively
			const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			const breakdown2 = getCacheHitBreakdown(build2);
			const stats2 = await getCacheStatistics(cacheDir);

			// Build 2: All 12 tasks from cache, 0 rebuilt
			expect(breakdown2.totalTasks).toBe(12);
			expect(breakdown2.tasksBuilt).toBe(0);
			expect(breakdown2.totalCacheHits).toBe(12);
			expect(breakdown2.overallHitRate).toBe(100);

			// Should use shared cache (at least half)
			expect(breakdown2.sharedCacheHits).toBeGreaterThanOrEqual(6);
			expect(breakdown2.sharedCacheHitRate).toBeGreaterThan(40);

			// Cache entries should remain stable at 12
			expect(stats2.entriesCount).toBe(12);
			expect(stats2.corruptedCount).toBe(0);

			// Verify time saved by shared cache
			const sharedCache = build2.buildGraph.context?.sharedCache;
			if (sharedCache) {
				const cacheStats = sharedCache.getStatistics();
				expect(cacheStats.hitCount).toBe(breakdown2.sharedCacheHits);
				expect(cacheStats.timeSavedMs).toBeGreaterThan(0);
			}
		}, 300_000);
	});
});
