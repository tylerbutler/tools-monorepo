/*!
 * Integration test to reproduce cache restoration bug with TypeScript project references.
 *
 * This test reproduces the FluidFramework issue where test compilation tasks
 * that have TypeScript project references to main compilation don't properly
 * restore from cache after outputs are cleaned.
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
 * Helper to get cache statistics
 */
function getCacheStats(
	result: Awaited<ReturnType<typeof executeBuildAndGetResult>>,
) {
	const taskStats = result.buildGraph.taskStats;
	const sharedCache = result.buildGraph.context?.sharedCache;
	const sharedCacheStats = sharedCache?.getStatistics() || {
		hitCount: 0,
		missCount: 0,
	};

	const totalCacheHits = taskStats.leafUpToDateCount || 0;
	const sharedCacheHits = sharedCacheStats.hitCount || 0;
	const tasksBuilt = taskStats.leafBuiltCount || 0;
	const totalTasks = taskStats.leafTotalCount || 0;

	return {
		totalTasks,
		tasksBuilt,
		totalCacheHits,
		sharedCacheHits,
		sharedCacheMisses: sharedCacheStats.missCount,
	};
}

describe("TypeScript Project References Cache Bug", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "../fixtures/cache-validity");
	const fixtureName = "typescript-project-references";

	beforeEach(async () => {
		ctx = await setupTestContext();
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	it("BUG REPRODUCTION: test tasks don't restore from cache when they have project references", async () => {
		// Setup: Copy fixture
		const fixtureSource = join(fixturesDir, fixtureName);
		await cp(fixtureSource, ctx.testDir, { recursive: true });

		// Build 1: Initial build - creates cache entries
		console.log("\n=== Build 1: Initial build ===");
		const build1 = await executeBuildAndGetResult(ctx.testDir, [
			"build",
			"build:test:esm",
			"build:test:cjs",
			"build:test:no-exact",
		]);
		const stats1 = getCacheStats(build1);

		console.log(`  Total tasks: ${stats1.totalTasks}`);
		console.log(`  Tasks built: ${stats1.tasksBuilt}`);
		console.log(`  Cache hits: ${stats1.totalCacheHits}`);
		console.log(
			"  Shared cache stats:",
			build1.buildGraph.context?.sharedCache?.getStatistics(),
		);

		// Verify initial build executed tasks
		expect(stats1.tasksBuilt).toBeGreaterThan(0);

		await waitForFilesystemSync();

		// Clean all outputs and donefiles
		console.log("\n=== Cleaning outputs ===");
		await cleanDonefilesAndOutputs(ctx.testDir, ["lib-a"]);

		// Build 2: After cleaning - should restore ALL from cache
		console.log(
			"\n=== Build 2: After cleaning (should restore from cache) ===",
		);
		const build2 = await executeBuildAndGetResult(ctx.testDir, [
			"build",
			"build:test:esm",
			"build:test:cjs",
			"build:test:no-exact",
		]);
		const stats2 = getCacheStats(build2);

		console.log(`  Total tasks: ${stats2.totalTasks}`);
		console.log(`  Tasks built: ${stats2.tasksBuilt}`);
		console.log(`  Cache hits: ${stats2.totalCacheHits}`);
		console.log(`  Shared cache hits: ${stats2.sharedCacheHits}`);
		console.log(`  Shared cache misses: ${stats2.sharedCacheMisses}`);

		// Access internal task stats to find which task rebuilt
		console.log("\n  Which task rebuilt?");
		const taskStats = build2.buildGraph.context.taskStats;
		console.log(`    Total leaf tasks: ${taskStats.leafTotalCount}`);
		console.log(`    Leaf tasks built: ${taskStats.leafBuiltCount}`);
		console.log(`    Leaf tasks up-to-date: ${taskStats.leafUpToDateCount}`);

		// EXPECTATION: All tasks should restore from cache
		// BUG: Test compilation tasks (build:test:esm, build:test:cjs, build:test:no-exact)
		// rebuild because they see main compilation outputs with new timestamps via project reference

		console.log("\n=== Analysis ===");
		if (stats2.tasksBuilt > 0) {
			console.log(
				"❌ BUG DETECTED: Test tasks were rebuilt despite cache existing",
			);
			console.log(
				"   This happens because TypeScript project references cause",
			);
			console.log("   the test tasks to see main outputs with new timestamps.");
		} else {
			console.log("✅ All tasks restored from cache");
		}

		// This assertion documents the bug - it SHOULD pass but may not
		// All tasks should restore from cache
		expect(stats2.tasksBuilt, "All tasks should restore from cache").toBe(0);
		expect(stats2.totalCacheHits).toBe(stats2.totalTasks);
	}, 300_000);
});
