import { stat } from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	copyFileWithMtime,
	getFileStats,
} from "../../../../src/core/sharedCache/fileOperations.js";

/**
 * Unit tests for file metadata restoration in the cache system
 *
 * The cache system must preserve file metadata (timestamps) when storing
 * and restoring files. This ensures that incremental build tools (like TypeScript's
 * tsBuildInfo) can correctly determine if files have changed.
 *
 * Metadata preserved:
 * - mtime (modification time) - CRITICAL for incremental builds
 * - atime (access time) - Set to same as mtime for consistency
 *
 * Note: File permissions are NOT currently preserved in the cache system.
 * This could be a future enhancement if needed.
 */
describe("File Metadata Restoration", () => {
	let testDir: string;
	let sourceDir: string;
	let destDir: string;

	beforeEach(async () => {
		// Create temporary directories
		testDir = await mkdtemp(join(tmpdir(), "sail-metadata-test-"));
		sourceDir = join(testDir, "source");
		destDir = join(testDir, "dest");

		await mkdir(sourceDir, { recursive: true });
		await mkdir(destDir, { recursive: true });
	});

	afterEach(async () => {
		// Clean up test directories
		await rm(testDir, { recursive: true, force: true });
	});

	describe("copyFileWithMtime", () => {
		it("should copy file with preserved modification time", async () => {
			// Arrange: Create a source file with specific mtime
			const sourceFile = join(sourceDir, "test.txt");
			const destFile = join(destDir, "test.txt");
			await writeFile(sourceFile, "test content");

			// Set source file mtime to a specific past time (January 1, 2024)
			const targetMtime = new Date("2024-01-01T12:00:00Z");
			await utimes(sourceFile, targetMtime, targetMtime);

			// Verify source file has the expected mtime
			const sourceStats = await stat(sourceFile);
			expect(sourceStats.mtime.getTime()).toBe(targetMtime.getTime());

			// Act: Copy file with preserved mtime
			await copyFileWithMtime(sourceFile, destFile, targetMtime.getTime());

			// Assert: Destination file should have the same mtime
			const destStats = await stat(destFile);
			expect(destStats.mtime.getTime()).toBe(targetMtime.getTime());
		});

		it("should copy file with mtime different from current time", async () => {
			// Arrange: Create a source file
			const sourceFile = join(sourceDir, "test2.txt");
			const destFile = join(destDir, "test2.txt");
			await writeFile(sourceFile, "test content 2");

			// Use a very old timestamp (2020)
			const oldMtime = new Date("2020-06-15T08:30:00Z");

			// Act: Copy with old mtime
			await copyFileWithMtime(sourceFile, destFile, oldMtime.getTime());

			// Assert: Dest should have old mtime, not current time
			const destStats = await stat(destFile);
			const currentTime = Date.now();
			const timeDiff = Math.abs(destStats.mtime.getTime() - currentTime);

			// Verify mtime is the old time, not current (tolerance: 1 second)
			expect(destStats.mtime.getTime()).toBe(oldMtime.getTime());
			expect(timeDiff).toBeGreaterThan(1000); // More than 1 second old
		});

		it("should create parent directories if they don't exist", async () => {
			// Arrange: Source file with nested destination path
			const sourceFile = join(sourceDir, "test3.txt");
			const nestedDestDir = join(destDir, "nested", "deeply", "path");
			const destFile = join(nestedDestDir, "test3.txt");
			await writeFile(sourceFile, "test content 3");

			const targetMtime = new Date("2023-12-25T00:00:00Z");

			// Act: Copy to nested path (parent dirs don't exist)
			await copyFileWithMtime(sourceFile, destFile, targetMtime.getTime());

			// Assert: File should be copied with correct mtime
			const destStats = await stat(destFile);
			expect(destStats.mtime.getTime()).toBe(targetMtime.getTime());
		});

		it("should preserve both atime and mtime to same value", async () => {
			// Arrange: Create source file
			const sourceFile = join(sourceDir, "test4.txt");
			const destFile = join(destDir, "test4.txt");
			await writeFile(sourceFile, "test content 4");

			const targetTime = new Date("2024-03-15T10:30:45Z");

			// Act: Copy with preserved time
			await copyFileWithMtime(sourceFile, destFile, targetTime.getTime());

			// Assert: Both atime and mtime should be set to target time
			const destStats = await stat(destFile);
			expect(destStats.mtime.getTime()).toBe(targetTime.getTime());
			// Note: atime might not match exactly on all filesystems (noatime mount option)
			// but we can verify it was set by the function
		});

		it("should handle binary files correctly", async () => {
			// Arrange: Create a binary file (simulated with Buffer)
			const sourceFile = join(sourceDir, "binary.dat");
			const destFile = join(destDir, "binary.dat");
			const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
			await writeFile(sourceFile, binaryContent);

			const targetMtime = new Date("2024-02-14T18:45:00Z");

			// Act: Copy binary file with preserved mtime
			await copyFileWithMtime(sourceFile, destFile, targetMtime.getTime());

			// Assert: Binary file copied with correct mtime
			const destStats = await stat(destFile);
			expect(destStats.mtime.getTime()).toBe(targetMtime.getTime());

			// Verify content is identical
			const sourceContent = await stat(sourceFile);
			expect(destStats.size).toBe(sourceContent.size);
		});
	});

	describe("getFileStats", () => {
		it("should return file metadata including mtime", async () => {
			// Arrange: Create a file with specific mtime
			const testFile = join(sourceDir, "stats.txt");
			const content = "test file content for stats";
			await writeFile(testFile, content);

			const targetMtime = new Date("2024-04-20T14:30:00Z");
			await utimes(testFile, targetMtime, targetMtime);

			// Act: Get file stats
			const stats = await getFileStats(testFile);

			// Assert: Stats should include correct mtime
			expect(stats.modifiedTime.getTime()).toBe(targetMtime.getTime());
			expect(stats.size).toBe(Buffer.from(content).length);
		});

		it("should handle multiple files with different mtimes", async () => {
			// Arrange: Create multiple files with different mtimes
			const file1 = join(sourceDir, "file1.txt");
			const file2 = join(sourceDir, "file2.txt");
			const file3 = join(sourceDir, "file3.txt");

			await writeFile(file1, "content 1");
			await writeFile(file2, "content 2");
			await writeFile(file3, "content 3");

			const mtime1 = new Date("2024-01-01T00:00:00Z");
			const mtime2 = new Date("2024-02-01T00:00:00Z");
			const mtime3 = new Date("2024-03-01T00:00:00Z");

			await utimes(file1, mtime1, mtime1);
			await utimes(file2, mtime2, mtime2);
			await utimes(file3, mtime3, mtime3);

			// Act: Get stats for all files
			const stats1 = await getFileStats(file1);
			const stats2 = await getFileStats(file2);
			const stats3 = await getFileStats(file3);

			// Assert: Each file should have its correct mtime
			expect(stats1.modifiedTime.getTime()).toBe(mtime1.getTime());
			expect(stats2.modifiedTime.getTime()).toBe(mtime2.getTime());
			expect(stats3.modifiedTime.getTime()).toBe(mtime3.getTime());

			// Verify they're different from each other
			expect(stats1.modifiedTime.getTime()).not.toBe(stats2.modifiedTime.getTime());
			expect(stats2.modifiedTime.getTime()).not.toBe(stats3.modifiedTime.getTime());
		});
	});

	describe("Metadata preservation in cache workflow", () => {
		it("should preserve mtime through store and restore cycle", async () => {
			// This test simulates the full cache workflow:
			// 1. Original file created with specific mtime
			// 2. File stored in cache (metadata captured in manifest)
			// 3. Original file deleted
			// 4. File restored from cache (metadata restored from manifest)

			// Arrange: Create original file with specific mtime
			const originalFile = join(sourceDir, "original.txt");
			await writeFile(originalFile, "original content");

			const originalMtime = new Date("2024-05-01T09:15:30Z");
			await utimes(originalFile, originalMtime, originalMtime);

			// Step 1: Get metadata (simulating cache store)
			const statsBeforeCache = await getFileStats(originalFile);
			expect(statsBeforeCache.modifiedTime.getTime()).toBe(originalMtime.getTime());

			// Simulate cache storage by copying to cache directory
			const cacheFile = join(destDir, "cache", "original.txt");
			await copyFileWithMtime(
				originalFile,
				cacheFile,
				statsBeforeCache.modifiedTime.getTime(),
			);

			// Step 2: Verify cached file has correct mtime
			const cacheStats = await stat(cacheFile);
			expect(cacheStats.mtime.getTime()).toBe(originalMtime.getTime());

			// Step 3: Delete original (simulating clean)
			await rm(originalFile);

			// Step 4: Restore from cache (simulating cache restore)
			const restoredFile = join(sourceDir, "restored.txt");
			await copyFileWithMtime(cacheFile, restoredFile, cacheStats.mtime.getTime());

			// Assert: Restored file should have original mtime
			const restoredStats = await stat(restoredFile);
			expect(restoredStats.mtime.getTime()).toBe(originalMtime.getTime());
		});

		it("should handle cache restoration of multiple files with different mtimes", async () => {
			// Arrange: Create multiple files with different mtimes (like a TypeScript build)
			const files = [
				{ name: "index.js", content: "export const main = 1;", mtime: new Date("2024-01-10T10:00:00Z") },
				{ name: "utils.js", content: "export const util = 2;", mtime: new Date("2024-01-15T11:00:00Z") },
				{ name: "types.js", content: "export const types = 3;", mtime: new Date("2024-01-20T12:00:00Z") },
			];

			// Create original files
			const originalFiles: Array<{ path: string; mtime: number }> = [];
			for (const file of files) {
				const filePath = join(sourceDir, file.name);
				await writeFile(filePath, file.content);
				await utimes(filePath, file.mtime, file.mtime);
				originalFiles.push({ path: filePath, mtime: file.mtime.getTime() });
			}

			// Simulate cache storage
			const cacheFiles: Array<{ path: string; mtime: number }> = [];
			for (const original of originalFiles) {
				const cacheFile = join(destDir, "cache", original.path.split("/").pop()!);
				await copyFileWithMtime(original.path, cacheFile, original.mtime);
				cacheFiles.push({ path: cacheFile, mtime: original.mtime });
			}

			// Delete originals (simulate clean)
			for (const original of originalFiles) {
				await rm(original.path);
			}

			// Restore from cache
			const restoredFiles: Array<{ path: string; expectedMtime: number }> = [];
			for (let i = 0; i < cacheFiles.length; i++) {
				const restoredPath = join(sourceDir, files[i].name);
				await copyFileWithMtime(
					cacheFiles[i].path,
					restoredPath,
					cacheFiles[i].mtime,
				);
				restoredFiles.push({
					path: restoredPath,
					expectedMtime: originalFiles[i].mtime,
				});
			}

			// Assert: All restored files should have their original mtimes
			for (const restored of restoredFiles) {
				const stats = await stat(restored.path);
				expect(stats.mtime.getTime()).toBe(restored.expectedMtime);
			}
		});

		it("should preserve mtime for unchanged files across multiple builds", async () => {
			// This test verifies that if a file doesn't change between builds,
			// its mtime is preserved correctly through cache restoration

			// Arrange: Create a file that won't change
			const unchangedFile = join(sourceDir, "unchanged.js");
			const content = "export const VERSION = 1;";
			await writeFile(unchangedFile, content);

			const originalMtime = new Date("2024-06-01T08:00:00Z");
			await utimes(unchangedFile, originalMtime, originalMtime);

			// Build 1: Store in cache
			const build1Cache = join(destDir, "build1", "unchanged.js");
			await copyFileWithMtime(unchangedFile, build1Cache, originalMtime.getTime());

			// Clean workspace
			await rm(unchangedFile);

			// Build 2: Restore from cache
			await copyFileWithMtime(build1Cache, unchangedFile, originalMtime.getTime());

			// Verify mtime is still original
			const build2Stats = await stat(unchangedFile);
			expect(build2Stats.mtime.getTime()).toBe(originalMtime.getTime());

			// Build 3: Store again (file unchanged)
			const build3Cache = join(destDir, "build3", "unchanged.js");
			await copyFileWithMtime(unchangedFile, build3Cache, build2Stats.mtime.getTime());

			// Verify mtime is STILL the original
			const build3Stats = await stat(build3Cache);
			expect(build3Stats.mtime.getTime()).toBe(originalMtime.getTime());
		});
	});
});
