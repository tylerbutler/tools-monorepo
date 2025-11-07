/*!
 * Integration test for cache restoration with task dependencies.
 *
 * This test reproduces the bug where tasks with dependencies on restored outputs
 * don't properly restore from cache on subsequent builds.
 */

import { cp } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeBuildAndGetResult } from "../support/buildGraphIntegrationHelper.js";
import {
	cleanDonefilesAndOutputs,
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
	donefileHits: number;
	sharedCacheHits: number;
	totalCacheHits: number;
	tasksBuilt: number;
	totalTasks: number;
	sharedCacheHitRate: number;
	overallHitRate: number;
}

function getCacheHitBreakdown(
	result: Awaited<ReturnType<typeof executeBuildAndGetResult>>,
): CacheHitBreakdown {
	const taskStats = result.buildGraph.taskStats;
	const sharedCache = result.buildGraph.context?.sharedCache;
	const sharedCacheStats = sharedCache?.getStatistics() || {
		hitCount: 0,
		missCount: 0,
	};

	const totalCacheHits = taskStats.leafUpToDateCount || 0;
	const sharedCacheHits = sharedCacheStats.hitCount || 0;
	const donefileHits = totalCacheHits - sharedCacheHits;
	const tasksBuilt = taskStats.leafBuiltCount || 0;
	const totalTasks = taskStats.leafTotalCount || 0;

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

describe("Cache Restoration with Task Dependencies", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "../fixtures/cache-validity");
	const fixtureName = "multi-level-multi-task";

	beforeEach(async () => {
		ctx = await setupTestContext();
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	it("should restore dependent tasks from cache after cleaning outputs", async () => {
		// Setup: Copy fixture
		const fixtureSource = join(fixturesDir, fixtureName);
		await cp(fixtureSource, ctx.testDir, { recursive: true });

		// Build 1: Initial build - creates cache entries for all tasks
		const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown1 = getCacheHitBreakdown(build1);

		console.log("Build 1 - Initial:");
		console.log(`  Total tasks: ${breakdown1.totalTasks}`);
		console.log(`  Tasks built: ${breakdown1.tasksBuilt}`);
		console.log(`  Cache hits: ${breakdown1.totalCacheHits}`);

		// Verify initial build executed tasks
		expect(breakdown1.totalTasks).toBe(12);
		expect(breakdown1.tasksBuilt).toBe(12);
		expect(breakdown1.totalCacheHits).toBe(0);

		await waitForFilesystemSync();

		// Clean all outputs and donefiles to force shared cache usage
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
		await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

		// Build 2: After cleaning - should restore ALL tasks from shared cache
		const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown2 = getCacheHitBreakdown(build2);

		console.log("\nBuild 2 - After cleaning:");
		console.log(`  Total tasks: ${breakdown2.totalTasks}`);
		console.log(`  Tasks built: ${breakdown2.tasksBuilt}`);
		console.log(`  Cache hits: ${breakdown2.totalCacheHits}`);
		console.log(`  Shared cache hits: ${breakdown2.sharedCacheHits}`);
		console.log(
			`  Shared cache hit rate: ${breakdown2.sharedCacheHitRate.toFixed(1)}%`,
		);

		// EXPECTATION: All tasks should restore from cache
		expect(breakdown2.totalTasks).toBe(12);
		expect(breakdown2.tasksBuilt).toBe(0); // No tasks should be rebuilt
		expect(breakdown2.totalCacheHits).toBe(12); // All tasks from cache

		// BUG: If this fails, some tasks didn't restore from cache despite having cache entries
		if (breakdown2.tasksBuilt > 0) {
			console.error(
				"\n❌ BUG DETECTED: Some tasks were rebuilt despite cache existing",
			);
			console.error(`   Tasks rebuilt: ${breakdown2.tasksBuilt}`);
			console.error("   Expected: 0 (all from cache)");
		}

		// This assertion will fail if the bug exists
		expect(breakdown2.tasksBuilt, "All tasks should restore from cache").toBe(
			0,
		);
	}, 300_000);

	it("should maintain cache key consistency across builds", async () => {
		// Setup: Copy fixture
		const fixtureSource = join(fixturesDir, fixtureName);
		await cp(fixtureSource, ctx.testDir, { recursive: true });

		const allPackages = ["utils", "types", "config"];

		// Build 1: Create cache
		const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const sharedCache1 = build1.buildGraph.context?.sharedCache;

		// Get cache stats before cleaning
		const stats1 = sharedCache1?.getStatistics();
		const cacheEntriesBefore = stats1?.totalEntries ?? 0;

		await waitForFilesystemSync();

		// Build 2: Repeat without cleaning (should use donefiles)
		const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown2 = getCacheHitBreakdown(build2);

		// Should be 100% cached via donefiles
		expect(breakdown2.overallHitRate).toBe(100);
		expect(breakdown2.tasksBuilt).toBe(0);

		await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

		// Build 3: After cleaning (should restore from shared cache)
		const build3 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown3 = getCacheHitBreakdown(build3);
		const sharedCache3 = build3.buildGraph.context?.sharedCache;
		const stats3 = sharedCache3?.getStatistics();

		console.log("\nCache Statistics:");
		console.log(`  Entries before: ${cacheEntriesBefore}`);
		console.log(`  Entries after: ${stats3?.totalEntries}`);
		console.log(`  Cache hits (build 3): ${stats3?.hitCount}`);
		console.log(`  Cache misses (build 3): ${stats3?.missCount}`);

		// BUG CHECK: No new entries should be created (cache keys should match)
		expect(stats3?.totalEntries).toBe(cacheEntriesBefore);

		// All tasks should be cached
		expect(breakdown3.overallHitRate).toBe(100);
		expect(breakdown3.tasksBuilt).toBe(0);
	}, 300_000);

	it("BUG: tsbuildinfo files cause cache misses when kept after cleaning outputs", async () => {
		// This test demonstrates the bug: when tsbuildinfo files are kept but outputs
		// are cleaned, restored outputs have new timestamps which cause TypeScript to
		// rebuild dependent tasks even though their cache entries exist.

		const fixtureSource = join(fixturesDir, fixtureName);
		await cp(fixtureSource, ctx.testDir, { recursive: true });

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

		// Build 1: Create cache entries
		const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown1 = getCacheHitBreakdown(build1);

		expect(breakdown1.totalTasks).toBe(12);
		expect(breakdown1.tasksBuilt).toBe(12);

		await waitForFilesystemSync();

		// Clean outputs but KEEP tsbuildinfo files
		await cleanDonefilesAndOutputs(ctx.testDir, allPackages, {
			keepTsBuildInfo: true,
		});

		// Build 2: This should restore from cache but may fail due to tsbuildinfo
		const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown2 = getCacheHitBreakdown(build2);

		console.log("\nBuild 2 (with tsbuildinfo kept):");
		console.log(`  Tasks built: ${breakdown2.tasksBuilt}`);
		console.log(`  Cache hits: ${breakdown2.totalCacheHits}`);
		console.log(`  Shared cache hits: ${breakdown2.sharedCacheHits}`);

		// This test documents the bug - it SHOULD pass but currently doesn't
		// because tsbuildinfo contains stale timestamps
		// TODO: Fix this by either:
		// 1. Updating timestamps when restoring from cache
		// 2. Always cleaning tsbuildinfo when cleaning outputs
		// 3. Making cache key computation ignore tsbuildinfo content

		// For now, we expect this to potentially fail (tasks rebuilt)
		// Uncomment when bug is fixed:
		// expect(breakdown2.tasksBuilt).toBe(0);
		// expect(breakdown2.totalCacheHits).toBe(12);

		// Document actual behavior
		console.log(
			"\n⚠️  BUG: Tasks may be rebuilt even though cache entries exist",
		);
		console.log("   Expected: 0 tasks built, 12 from cache");
		console.log(
			`   Actual: ${breakdown2.tasksBuilt} tasks built, ${breakdown2.totalCacheHits} from cache`,
		);
	}, 300_000);

	it("WORKAROUND: cleaning tsbuildinfo files prevents cache misses", async () => {
		// This test shows the workaround: always clean tsbuildinfo files along with outputs

		const fixtureSource = join(fixturesDir, fixtureName);
		await cp(fixtureSource, ctx.testDir, { recursive: true });

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

		// Build 1: Create cache entries
		const build1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown1 = getCacheHitBreakdown(build1);

		expect(breakdown1.totalTasks).toBe(12);
		expect(breakdown1.tasksBuilt).toBe(12);

		await waitForFilesystemSync();

		// Clean outputs AND tsbuildinfo files (default behavior)
		await cleanDonefilesAndOutputs(ctx.testDir, allPackages);

		// Build 2: Should restore from cache without issues
		const build2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
		const breakdown2 = getCacheHitBreakdown(build2);

		console.log("\nBuild 2 (with tsbuildinfo cleaned):");
		console.log(`  Tasks built: ${breakdown2.tasksBuilt}`);
		console.log(`  Cache hits: ${breakdown2.totalCacheHits}`);
		console.log(`  Shared cache hits: ${breakdown2.sharedCacheHits}`);

		// With tsbuildinfo cleaned, all tasks should restore from cache
		expect(breakdown2.tasksBuilt).toBe(0);
		expect(breakdown2.totalCacheHits).toBe(12);
		expect(breakdown2.overallHitRate).toBe(100);

		console.log("\n✅ WORKAROUND: Cleaning tsbuildinfo prevents the bug");
	}, 300_000);
});
