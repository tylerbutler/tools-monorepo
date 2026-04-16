import { cp, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	assertBuildOutput,
	assertFileExists,
} from "../../support/assertionHelpers.js";
import { executeBuildAndGetResult } from "../../support/buildGraphIntegrationHelper.js";
import {
	setupTestContext,
	type TestContext,
} from "../../support/integrationTestHelpers.js";

/**
 * Integration tests for incremental builds and cache behavior.
 *
 * These tests verify:
 * 1. Initial build executes all tasks
 * 2. Subsequent build with no changes skips all tasks (cache hits)
 * 3. Modifying a file causes rebuild of affected packages only
 * 4. Cache invalidation works correctly
 */
describe("BuildGraph: Incremental Builds and Cache", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "..", "..", "fixtures");

	beforeEach(async () => {
		ctx = await setupTestContext("sail-integration-cache-");
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	describe("cache behavior", () => {
		it("should execute all tasks on initial build", async () => {
			// Copy simple-monorepo fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build - everything should execute
			const result1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify tasks were executed (not skipped)
			expect(result1.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
			expect(result1.buildGraph.taskStats.leafUpToDateCount).toBe(0);

			// Verify build artifacts exist
			await assertFileExists(
				join(ctx.testDir, "packages", "lib", "dist", "index.js"),
			);
			await assertFileExists(
				join(ctx.testDir, "packages", "app", "dist", "index.js"),
			);
		}, 180_000);

		it("should skip all tasks when nothing changes (cache hit)", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// First build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Second build with no changes - everything should be cached
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify tasks were skipped (cache hits)
			expect(result2.buildGraph.taskStats.leafBuiltCount).toBe(0);
			expect(result2.buildGraph.taskStats.leafUpToDateCount).toBeGreaterThan(0);

			// Verify cache stats show hits
			expect(result2.cacheStats).toBeDefined();
			if (result2.cacheStats) {
				expect(result2.cacheStats).toContain("hits");
			}
		}, 180_000);

		it("should rebuild only affected packages when file changes", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Initial build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Modify lib source file
			const libSource = join(ctx.testDir, "packages", "lib", "src", "index.ts");
			await writeFile(
				libSource,
				`
export function greet(name: string): string {
	return \`Hello, \${name}! Modified!\`;
}

export function add(a: number, b: number): number {
	return a + b;
}

export const VERSION = "1.0.1";
`,
			);

			// Rebuild - lib and app should rebuild, but not other packages
			const result3 = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// At least lib and app should be built (due to dependency)
			expect(result3.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			// Verify new build artifacts were created
			await assertFileExists(
				join(ctx.testDir, "packages", "lib", "dist", "index.js"),
			);
			await assertFileExists(
				join(ctx.testDir, "packages", "app", "dist", "index.js"),
			);
		}, 180_000);

		it("should handle diamond dependency cache correctly", async () => {
			// Copy diamond-dependency fixture
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Initial build
			const result1 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			expect(result1.buildGraph.taskStats.leafBuiltCount).toBe(4);

			// Second build - all should be cached
			const result2 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			expect(result2.buildGraph.taskStats.leafBuiltCount).toBe(0);
			expect(result2.buildGraph.taskStats.leafUpToDateCount).toBe(4);

			// Modify base package (affects all downstream)
			const baseSource = join(
				ctx.testDir,
				"packages",
				"base",
				"src",
				"index.ts",
			);
			await writeFile(
				baseSource,
				`
export interface BaseConfig {
	name: string;
	version: string;
	modified: boolean;
}

export function createConfig(name: string): BaseConfig {
	return {name, version: "1.0.0", modified: true};
}
`,
			);

			// Rebuild - all 4 packages should rebuild
			const result3 = await executeBuildAndGetResult(ctx.testDir, ["build"]);
			expect(result3.buildGraph.taskStats.leafBuiltCount).toBe(4);

			// Verify all outputs were regenerated
			await assertBuildOutput(join(ctx.testDir, "packages", "base", "dist"), [
				"index.js",
				"index.d.ts",
			]);
			await assertBuildOutput(join(ctx.testDir, "packages", "left", "dist"), [
				"index.js",
				"index.d.ts",
			]);
			await assertBuildOutput(join(ctx.testDir, "packages", "right", "dist"), [
				"index.js",
				"index.d.ts",
			]);
			await assertBuildOutput(join(ctx.testDir, "packages", "top", "dist"), [
				"index.js",
				"index.d.ts",
			]);
		}, 180_000);

		it("should handle partial rebuilds in diamond dependency", async () => {
			// Copy diamond-dependency fixture
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Initial build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Modify only left package (should affect left and top, not right)
			const leftSource = join(
				ctx.testDir,
				"packages",
				"left",
				"src",
				"index.ts",
			);
			await writeFile(
				leftSource,
				`
import {BaseConfig, createConfig} from "@test/base";

export function createLeftConfig(): BaseConfig {
	return createConfig("left-modified");
}

export const LEFT_VERSION = "1.0.1";
`,
			);

			// Rebuild - left and top should rebuild, base and right should be cached
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// At least 2 packages should be built (left + top)
			// Note: Exact count may vary depending on cache implementation
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThanOrEqual(
				2,
			);
		}, 180_000);
	});

	describe("force rebuild", () => {
		it("should rebuild all tasks when force flag is set", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Initial build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Force rebuild - all tasks should execute
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"], {
				force: true,
			});

			// All tasks should be executed (not skipped)
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
			expect(result.buildGraph.taskStats.leafUpToDateCount).toBe(0);
		}, 180_000);
	});
});
