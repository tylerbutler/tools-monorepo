import type { BaseSailCommand } from "../baseCommand.js";
import type { SharedCacheManager } from "../core/sharedCache/index.js";

/**
 * Display cache statistics in a formatted way.
 */
export async function displayCacheStatistics(
	command: BaseSailCommand<any>,
	sharedCache: SharedCacheManager | null,
): Promise<void> {
	if (!sharedCache) {
		return;
	}

	const stats = await sharedCache.getStatistics();

	command.log("\n=== Cache Statistics ===");
	command.log(`Total Entries: ${stats.totalEntries}`);
	command.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
	command.log(`Cache Hits: ${stats.hitCount}`);
	command.log(`Cache Misses: ${stats.missCount}`);

	if (stats.hitCount > 0 || stats.missCount > 0) {
		const total = stats.hitCount + stats.missCount;
		const hitRate = ((stats.hitCount / total) * 100).toFixed(1);
		command.log(`Hit Rate: ${hitRate}%`);
	}

	if (stats.hitCount > 0) {
		command.log(`Avg Restore Time: ${stats.avgRestoreTime.toFixed(1)}ms`);

		const timeSavedSec = stats.timeSavedMs / 1000;
		if (timeSavedSec > 60) {
			const minutes = Math.floor(timeSavedSec / 60);
			const seconds = (timeSavedSec % 60).toFixed(1);
			command.log(`Time Saved: ${minutes}m ${seconds}s`);
		} else {
			command.log(`Time Saved: ${timeSavedSec.toFixed(1)}s`);
		}
	}

	command.log("========================\n");
}

/**
 * Display minimal cache statistics (just entries and size).
 */
export async function displayMinimalCacheStatistics(
	command: BaseSailCommand<any>,
	sharedCache: SharedCacheManager | null,
): Promise<void> {
	if (!sharedCache) {
		return;
	}

	const stats = await sharedCache.getStatistics();

	command.log("\n=== Cache Statistics ===");
	command.log(`Total Entries: ${stats.totalEntries}`);
	command.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
	command.log("========================\n");
}

/**
 * Validate that a cache directory is specified.
 */
export function validateCacheDir(
	command: BaseSailCommand<any>,
	cacheDir: string | undefined,
): asserts cacheDir is string {
	if (!cacheDir) {
		command.error(
			"No cache directory specified. Use --cache-dir or set SAIL_CACHE_DIR environment variable.",
			{ exit: 1 },
		);
	}
}

/**
 * Initialize the shared cache and handle errors.
 */
export async function initializeCacheOrFail(
	command: BaseSailCommand<any>,
	cacheDir: string,
	skipCacheWrite = true,
	verifyCacheIntegrity = false,
): Promise<SharedCacheManager> {
	const { initializeSharedCache } = await import(
		"../core/sharedCache/index.js"
	);

	const sharedCache = await initializeSharedCache(
		cacheDir,
		process.cwd(),
		skipCacheWrite,
		verifyCacheIntegrity,
	);

	if (!sharedCache) {
		command.error("Failed to initialize cache.", { exit: 1 });
	}

	return sharedCache;
}
