import { cp } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	assertBuildOutput,
	assertFileExists,
} from "../../support/assertionHelpers.js";
import {
	createBuildGraphTestContext,
	executeBuildAndGetResult,
} from "../../support/buildGraphIntegrationHelper.js";
import {
	setupTestContext,
	type TestContext,
} from "../../support/integrationTestHelpers.js";

/**
 * Integration tests for basic BuildGraph execution with real packages.
 *
 * These tests verify the complete workflow:
 * 1. Load real package.json files from fixtures
 * 2. Resolve dependencies and create BuildGraph
 * 3. Initialize tasks from configuration
 * 4. Execute build tasks (real TypeScript compilation)
 * 5. Verify build outputs exist
 */
describe("BuildGraph: Basic Build Execution", () => {
	let ctx: TestContext;
	const fixturesDir = join(__dirname, "..", "..", "fixtures");

	beforeEach(async () => {
		ctx = await setupTestContext("sail-integration-basic-");
	});

	afterEach(async () => {
		await ctx.cleanup();
	});

	describe("simple monorepo (app → lib)", () => {
		it("should build both packages in dependency order", async () => {
			// Copy simple-monorepo fixture to test directory
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Create BuildGraph context and execute build (dependencies installed automatically)
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify build succeeded
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);

			// Verify both packages were built
			const libDist = join(ctx.testDir, "packages", "lib", "dist");
			const appDist = join(ctx.testDir, "packages", "app", "dist");

			await assertBuildOutput(libDist, ["index.js", "index.d.ts"]);
			await assertBuildOutput(appDist, ["index.js", "index.d.ts"]);
		}, 180_000);

		it("should compile TypeScript source files", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify compilation outputs exist
			await assertFileExists(
				join(ctx.testDir, "packages", "lib", "dist", "index.js"),
			);
			await assertFileExists(
				join(ctx.testDir, "packages", "lib", "dist", "index.d.ts"),
			);
			await assertFileExists(
				join(ctx.testDir, "packages", "app", "dist", "index.js"),
			);
			await assertFileExists(
				join(ctx.testDir, "packages", "app", "dist", "index.d.ts"),
			);

			// Verify at least 2 tasks were executed (lib#build, app#build)
			expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThanOrEqual(
				2,
			);
		}, 180_000);

		it("should respect dependency order (lib before app)", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "simple-monorepo");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Create BuildGraph context
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);

			// Install dependencies (required for TypeScript resolution)
			await buildCtx.installDependencies();

			// Execute build
			const buildGraph = await buildCtx.executeBuild(["build"]);

			// Verify build graph structure shows correct dependency levels
			// lib should be at level 0, app at level 1
			const packages = buildGraph.buildPackages;
			const libPkg = packages.find((p) => p.pkg.name === "@test/lib");
			const appPkg = packages.find((p) => p.pkg.name === "@test/app");

			expect(libPkg).toBeDefined();
			expect(appPkg).toBeDefined();

			// Level 0 = no dependencies, Level 1 = depends on Level 0
			expect(libPkg!.level).toBe(0);
			expect(appPkg!.level).toBe(1);
		}, 180_000);
	});

	describe("diamond dependency (top → left,right → base)", () => {
		it("should build all packages in correct order", async () => {
			// Copy diamond-dependency fixture to test directory
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			const result = await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify all 4 packages were built
			expect(result.buildGraph.taskStats.leafBuiltCount).toBe(4);

			// Verify dependency levels are correct
			const packages = result.buildGraph.buildPackages;
			const base = packages.find((p) => p.pkg.name === "@test/base");
			const left = packages.find((p) => p.pkg.name === "@test/left");
			const right = packages.find((p) => p.pkg.name === "@test/right");
			const top = packages.find((p) => p.pkg.name === "@test/top");

			expect(base!.level).toBe(0); // Base has no dependencies
			expect(left!.level).toBe(1); // Left depends on base
			expect(right!.level).toBe(1); // Right depends on base
			expect(top!.level).toBe(2); // Top depends on left and right
		}, 180_000);

		it("should execute left and right builds at the same level", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Create BuildGraph context
			const buildCtx = await createBuildGraphTestContext(ctx.testDir);

			// Install dependencies (required for TypeScript resolution)
			await buildCtx.installDependencies();

			// Execute build and verify structure
			const buildGraph = await buildCtx.executeBuild(["build"]);

			// left and right should be at the same level (can execute in parallel)
			const packages = buildGraph.buildPackages;
			const left = packages.find((p) => p.pkg.name === "@test/left");
			const right = packages.find((p) => p.pkg.name === "@test/right");

			expect(left!.level).toBe(right!.level);
		}, 180_000);

		it("should produce correct build artifacts for all packages", async () => {
			// Copy fixture
			const fixtureSource = join(fixturesDir, "diamond-dependency");
			await cp(fixtureSource, ctx.testDir, { recursive: true });

			// Execute build
			await executeBuildAndGetResult(ctx.testDir, ["build"]);

			// Verify all package outputs exist
			const baseDist = join(ctx.testDir, "packages", "base", "dist");
			const leftDist = join(ctx.testDir, "packages", "left", "dist");
			const rightDist = join(ctx.testDir, "packages", "right", "dist");
			const topDist = join(ctx.testDir, "packages", "top", "dist");

			await assertBuildOutput(baseDist, ["index.js", "index.d.ts"]);
			await assertBuildOutput(leftDist, ["index.js", "index.d.ts"]);
			await assertBuildOutput(rightDist, ["index.js", "index.d.ts"]);
			await assertBuildOutput(topDist, ["index.js", "index.d.ts"]);
		}, 180_000);
	});
});
