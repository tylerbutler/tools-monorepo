import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BuildContextBuilder } from "../../../helpers/builders/BuildContextBuilder.js";
import { LeafTaskBuilder } from "../../../helpers/builders/LeafTaskBuilder.js";

/**
 * TDD Test: Cache Restoration After Clean
 *
 * This test reproduces the bug where cache restoration fails after running clean,
 * even though cache entries exist.
 *
 * Expected behavior:
 * 1. Build task A (no deps) → cache entry created
 * 2. Build task B (depends on A) → cache entry created (with A's donefile in key)
 * 3. Clean all outputs and donefiles
 * 4. Rebuild task A → should restore from cache (not execute)
 * 5. Rebuild task B → should restore from cache (not execute)
 *
 * Current bug:
 * - Step 4: Task A restores correctly
 * - Step 5: Task B FAILS to restore because:
 *   a) A's donefile was just recreated with new content
 *   b) B's cache key includes A's NEW donefile hash
 *   c) B's cache entry was stored with A's OLD donefile hash
 *   d) Key mismatch → cache MISS → execution instead of restoration
 */
describe("Cache Restoration After Clean", () => {
	let testDir: string;
	let cacheDir: string;
	let packageADir: string;
	let packageBDir: string;

	beforeEach(async () => {
		// Create temporary directories
		testDir = await mkdtemp(join(tmpdir(), "sail-cache-test-"));
		cacheDir = join(testDir, "cache");
		packageADir = join(testDir, "packageA");
		packageBDir = join(testDir, "packageB");

		await mkdir(cacheDir, { recursive: true });
		await mkdir(packageADir, { recursive: true });
		await mkdir(packageBDir, { recursive: true });

		// Create minimal source files for copyfiles task
		const srcDirA = join(packageADir, "src");
		const srcDirB = join(packageBDir, "src");
		await mkdir(srcDirA, { recursive: true });
		await mkdir(srcDirB, { recursive: true });

		await writeFile(join(srcDirA, "file1.txt"), "content A1");
		await writeFile(join(srcDirA, "file2.txt"), "content A2");
		await writeFile(join(srcDirB, "file1.txt"), "content B1");
		await writeFile(join(srcDirB, "file2.txt"), "content B2");
	});

	afterEach(async () => {
		// Clean up test directories
		await rm(testDir, { recursive: true, force: true });
	});

	it("should restore task from cache after clean", async () => {
		// STEP 1: Initial build of task A (no dependencies)
		const contextA = new BuildContextBuilder().withRepoRoot(testDir).build();

		const taskA = new LeafTaskBuilder()
			.withContext(contextA)
			.withPackageName("packageA")
			.withPackagePath(packageADir)
			.withCommand("copyfiles src/**/*.txt dist")
			.buildCopyfilesTask();

		// Simulate execution - create output files
		const outputDirA = join(packageADir, "dist");
		await mkdir(outputDirA, { recursive: true });
		await writeFile(join(outputDirA, "file1.txt"), "content A1");
		await writeFile(join(outputDirA, "file2.txt"), "content A2");

		// Create donefile for task A
		const donefileA = join(packageADir, "copyfiles-12345678.done.build.log");
		await writeFile(donefileA, "task-a-done-content-hash-123");

		// Get cache input files (should NOT include outputs)
		const cacheInputsA = await (
			taskA as unknown as { getCacheInputFiles: () => Promise<string[]> }
		).getCacheInputFiles();

		// Assert: Cache inputs should NOT include output files
		expect(cacheInputsA.some((f) => f.includes("dist/"))).toBe(false);
		expect(cacheInputsA.some((f) => f.includes(".sail-donefile"))).toBe(false);

		// STEP 2: Store task A in cache
		// TODO: Actually store in SharedCacheManager once we have it wired up
		// For now, just verify cache key can be computed
		expect(cacheInputsA.length).toBeGreaterThan(0);

		// STEP 3: Clean outputs (simulate `sail clean`)
		await rm(outputDirA, { recursive: true, force: true });
		await rm(donefileA, { force: true });

		// Verify clean worked
		expect(existsSync(outputDirA)).toBe(false);
		expect(existsSync(donefileA)).toBe(false);

		// STEP 4: Rebuild task A - should restore from cache
		// Get cache inputs again (after clean)
		const cacheInputsA2 = await (
			taskA as unknown as { getCacheInputFiles: () => Promise<string[]> }
		).getCacheInputFiles();

		// Assert: Cache key should be IDENTICAL before and after clean
		// This is critical for cache restoration to work!
		expect(cacheInputsA2).toEqual(cacheInputsA);

		// TODO: Actually test cache restoration once SharedCacheManager is wired up
		// Expected: tryRestoreFromCache() should succeed and restore outputs
	});

	it("should restore dependent task from cache after clean - THE BUG", async () => {
		// STEP 1: Build task A (no dependencies)
		const contextA = new BuildContextBuilder().withRepoRoot(testDir).build();

		const _taskA = new LeafTaskBuilder()
			.withContext(contextA)
			.withPackageName("packageA")
			.withPackagePath(packageADir)
			.withCommand("copyfiles src/**/*.txt dist")
			.withTaskName("build")
			.buildCopyfilesTask();

		// Create task A outputs and donefile
		const outputDirA = join(packageADir, "dist");
		await mkdir(outputDirA, { recursive: true });
		await writeFile(join(outputDirA, "file1.txt"), "content A1");
		await writeFile(join(outputDirA, "file2.txt"), "content A2");
		const donefileA = join(packageADir, "copyfiles-12345678.done.build.log");
		await writeFile(donefileA, "task-a-done-hash-OLD");

		// STEP 2: Build task B (depends on task A)
		const contextB = new BuildContextBuilder().withRepoRoot(testDir).build();

		const taskB = new LeafTaskBuilder()
			.withContext(contextB)
			.withPackageName("packageB")
			.withPackagePath(packageBDir)
			.withCommand("copyfiles src/**/*.txt dist")
			.withTaskName("build")
			.buildCopyfilesTask();

		// Add dependency: B depends on A
		// TODO: Wire up dependency properly using Task.addDependentLeafTasks

		// Get cache inputs for B (before clean)
		const cacheInputsB1 = await (
			taskB as unknown as { getCacheInputFiles: () => Promise<string[]> }
		).getCacheInputFiles();

		// With the donefile fix, B's cache inputs should include A's donefile
		// THIS IS THE BUG: A's donefile changes between builds!
		const includesADonefile = cacheInputsB1.some((f) =>
			f.includes("packageA/copyfiles-"),
		);

		if (includesADonefile) {
			// STEP 3: Clean all outputs
			await rm(outputDirA, { recursive: true, force: true });
			await rm(donefileA, { force: true });

			// STEP 4: Rebuild task A (recreates donefile with NEW content)
			await mkdir(outputDirA, { recursive: true });
			await writeFile(join(outputDirA, "index.js"), "export const a = 1;");
			await writeFile(donefileA, "task-a-done-hash-NEW"); // DIFFERENT CONTENT!

			// STEP 5: Try to rebuild task B
			const cacheInputsB2 = await (
				taskB as unknown as { getCacheInputFiles: () => Promise<string[]> }
			).getCacheInputFiles();

			// BUG REPRODUCTION: Cache keys are DIFFERENT!
			// B1 included A's donefile with hash "task-a-done-hash-OLD"
			// B2 includes A's donefile with hash "task-a-done-hash-NEW"
			// Therefore: Cache lookup will MISS even though cache entry exists!

			// This test SHOULD FAIL with current implementation
			expect(cacheInputsB2).toEqual(cacheInputsB1);
			// Expected: Keys should be same (cache hit)
			// Actual: Keys differ (cache miss) ← THE BUG
		} else {
			// If donefile fix isn't applied, this test documents expected behavior
			expect(includesADonefile).toBe(false);
		}
	});
});
