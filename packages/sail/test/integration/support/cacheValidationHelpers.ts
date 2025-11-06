import { readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "vitest";

/**
 * Cache validation helpers for integration tests.
 */

export interface CacheStats {
	storeCount: number;
	hitCount: number;
	missCount: number;
	entriesCount: number;
	corruptedCount: number;
	validEntries: string[];
	corruptedEntries: string[];
}

export interface CacheEntryValidation {
	exists: boolean;
	valid: boolean;
	hasManifest: boolean;
	manifestValid: boolean;
	reason?: string;
}

/**
 * Get statistics about cache entries in a cache directory.
 */
export async function getCacheStatistics(
	cacheDir: string,
): Promise<CacheStats> {
	const stats: CacheStats = {
		storeCount: 0,
		hitCount: 0,
		missCount: 0,
		entriesCount: 0,
		corruptedCount: 0,
		validEntries: [],
		corruptedEntries: [],
	};

	try {
		// Cache entries are stored in v1/entries/ subdirectory
		const entriesDir = join(cacheDir, "v1", "entries");
		const entries = await readdir(entriesDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				// Skip hidden directories
				if (entry.name.startsWith(".")) {
					continue;
				}

				const validation = await verifyCacheEntry(entriesDir, entry.name);

				stats.entriesCount++;

				if (validation.valid) {
					stats.validEntries.push(entry.name);
				} else {
					stats.corruptedCount++;
					stats.corruptedEntries.push(entry.name);
				}
			}
		}
	} catch (error) {
		// Cache directory might not exist
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
	}

	return stats;
}

/**
 * Verify that a cache entry is valid.
 */
export async function verifyCacheEntry(
	cacheDir: string,
	taskId: string,
): Promise<CacheEntryValidation> {
	const entryPath = join(cacheDir, taskId);
	const manifestPath = join(entryPath, "manifest.json");

	const result: CacheEntryValidation = {
		exists: false,
		valid: false,
		hasManifest: false,
		manifestValid: false,
	};

	try {
		// Check if entry directory exists
		await readdir(entryPath);
		result.exists = true;

		// Check if manifest.json exists
		const manifestContent = await readFile(manifestPath, "utf-8");
		result.hasManifest = true;

		// Validate manifest JSON
		const manifest = JSON.parse(manifestContent);
		result.manifestValid = true;

		// Check if manifest has required fields
		// Manifest should have either outputFiles (new format) or be otherwise valid
		if (manifest.version && manifest.cacheKey) {
			result.valid = true;
		} else {
			result.reason = "Manifest missing required fields (version or cacheKey)";
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			if (!result.exists) {
				result.reason = "Cache entry directory does not exist";
			} else if (!result.hasManifest) {
				result.reason = "manifest.json does not exist";
			}
		} else if (error instanceof SyntaxError) {
			result.reason = "manifest.json contains invalid JSON";
		} else {
			result.reason = `Unexpected error: ${(error as Error).message}`;
		}
	}

	return result;
}

/**
 * Corrupt a cache entry for testing purposes.
 */
export async function corruptCacheEntry(
	cacheDir: string,
	taskId: string,
	corruptionType: "missing-manifest" | "invalid-json" | "missing-outputs",
): Promise<void> {
	const entriesDir = join(cacheDir, "v1", "entries");
	const entryPath = join(entriesDir, taskId);
	const manifestPath = join(entryPath, "manifest.json");

	switch (corruptionType) {
		case "missing-manifest":
			await unlink(manifestPath);
			break;

		case "invalid-json":
			await writeFile(manifestPath, "{ invalid json content }");
			break;

		case "missing-outputs": {
			const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
			// Remove output files but keep manifest
			if (manifest.outputFiles) {
				for (const output of manifest.outputFiles) {
					const outputPath = join(entryPath, output.path);
					try {
						await rm(outputPath, { recursive: true, force: true });
					} catch {
						// Ignore if file doesn't exist
					}
				}
			}
			break;
		}
	}
}

/**
 * Assert that all specified tasks are present in cache and valid.
 */
export async function assertAllTasksCached(
	cacheDir: string,
	taskIds: string[],
): Promise<void> {
	const entriesDir = join(cacheDir, "v1", "entries");
	for (const taskId of taskIds) {
		const validation = await verifyCacheEntry(entriesDir, taskId);
		expect(validation.exists, `Cache entry should exist for ${taskId}`).toBe(
			true,
		);
		expect(
			validation.valid,
			`Cache entry should be valid for ${taskId}: ${validation.reason}`,
		).toBe(true);
	}
}

/**
 * Assert that cache entry is valid.
 */
export async function assertCacheEntryValid(
	cacheDir: string,
	taskId: string,
): Promise<void> {
	const entriesDir = join(cacheDir, "v1", "entries");
	const entry = await verifyCacheEntry(entriesDir, taskId);
	expect(entry.exists, `Cache entry should exist: ${taskId}`).toBe(true);
	expect(
		entry.valid,
		`Cache entry should be valid: ${taskId} - ${entry.reason}`,
	).toBe(true);
}

/**
 * Assert that there are no corrupted cache entries.
 */
export async function assertNoCacheCorruption(cacheDir: string): Promise<void> {
	const stats = await getCacheStatistics(cacheDir);
	expect(
		stats.corruptedCount,
		`Found ${stats.corruptedCount} corrupted entries: ${stats.corruptedEntries.join(", ")}`,
	).toBe(0);
}

/**
 * Assert that cache directory has expected number of entries.
 */
export async function assertCacheEntryCount(
	cacheDir: string,
	expectedCount: number,
): Promise<void> {
	const stats = await getCacheStatistics(cacheDir);
	expect(stats.entriesCount).toBe(expectedCount);
}

/**
 * Wait for filesystem to sync (useful for testing race conditions).
 */
export async function waitForFilesystemSync(): Promise<void> {
	// Small delay to allow filesystem operations to complete
	await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Clean all donefiles and output directories to force shared cache usage.
 * This removes donefiles, dist/ directories, AND tsbuildinfo files from all packages.
 *
 * NOTE: We must remove tsbuildinfo files because they contain TypeScript's incremental
 * compilation state which includes timestamps. If tsbuildinfo exists when outputs are
 * restored with new timestamps, TypeScript sees the outputs as "newer" and triggers
 * rebuild of dependent tasks (e.g., test compilation that references main compilation).
 */
export async function cleanDonefilesAndOutputs(
	testDir: string,
	packageNames: string[],
	options?: { keepTsBuildInfo?: boolean },
): Promise<void> {
	const packagesDir = join(testDir, "packages");

	for (const pkg of packageNames) {
		const pkgDir = join(packagesDir, pkg);

		// Remove dist directory
		const distDir = join(pkgDir, "dist");
		await rm(distDir, { recursive: true, force: true });

		// Remove coverage directory
		const coverageDir = join(pkgDir, ".coverage");
		await rm(coverageDir, { recursive: true, force: true });

		// Remove lint output
		const lintOutput = join(pkgDir, ".lint-output");
		await rm(lintOutput, { force: true }).catch(() => {});

		// Remove donefile markers (various possible names)
		const donefilePatterns = [".donefile", "donefile", ".buildcomplete"];

		for (const pattern of donefilePatterns) {
			const donefilePath = join(pkgDir, pattern);
			await rm(donefilePath, { force: true }).catch(() => {});
		}

		// Remove tsbuildinfo files unless explicitly kept
		// These contain TypeScript incremental state with timestamps
		if (!options?.keepTsBuildInfo) {
			try {
				const { readdir } = await import("node:fs/promises");
				const files = await readdir(pkgDir);
				const tsbuildInfoFiles = files.filter((f) =>
					f.endsWith(".tsbuildinfo"),
				);
				for (const file of tsbuildInfoFiles) {
					await rm(join(pkgDir, file), { force: true }).catch(() => {});
				}
			} catch {
				// Ignore errors if directory doesn't exist
			}
		}
	}
}
