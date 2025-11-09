import type { Logger } from "@tylerbu/cli-api";
import type { SharedCacheManager } from "../core/sharedCache/index.js";

/**
 * Logger interface with error method for CLI commands.
 */
export interface LoggerWithError extends Logger {
	error(message: string, options: { exit: number }): never;
}

/**
 * Display cache statistics in a formatted way.
 */
export async function displayCacheStatistics(
	logger: Logger,
	sharedCache: SharedCacheManager | null,
): Promise<void> {
	if (!sharedCache) {
		return;
	}

	const stats = await sharedCache.getStatistics();

	logger.log("\n=== Cache Statistics ===");
	logger.log(`Total Entries: ${stats.totalEntries}`);
	logger.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
	logger.log(`Cache Hits: ${stats.hitCount}`);
	logger.log(`Cache Misses: ${stats.missCount}`);

	if (stats.hitCount > 0 || stats.missCount > 0) {
		const total = stats.hitCount + stats.missCount;
		const hitRate = ((stats.hitCount / total) * 100).toFixed(1);
		logger.log(`Hit Rate: ${hitRate}%`);
	}

	if (stats.hitCount > 0) {
		logger.log(`Avg Restore Time: ${stats.avgRestoreTime.toFixed(1)}ms`);

		const timeSavedSec = stats.timeSavedMs / 1000;
		if (timeSavedSec > 60) {
			const minutes = Math.floor(timeSavedSec / 60);
			const seconds = (timeSavedSec % 60).toFixed(1);
			logger.log(`Time Saved: ${minutes}m ${seconds}s`);
		} else {
			logger.log(`Time Saved: ${timeSavedSec.toFixed(1)}s`);
		}
	}

	logger.log("========================\n");
}

/**
 * Display minimal cache statistics (just entries and size).
 */
export async function displayMinimalCacheStatistics(
	logger: Logger,
	sharedCache: SharedCacheManager | null,
): Promise<void> {
	if (!sharedCache) {
		return;
	}

	const stats = await sharedCache.getStatistics();

	logger.log("\n=== Cache Statistics ===");
	logger.log(`Total Entries: ${stats.totalEntries}`);
	logger.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
	logger.log("========================\n");
}

/**
 * Validate that a cache directory is specified.
 */
export function validateCacheDir(
	logger: LoggerWithError,
	cacheDir: string | undefined,
): asserts cacheDir is string {
	if (!cacheDir) {
		logger.error(
			"No cache directory specified. Use --cache-dir or set SAIL_CACHE_DIR environment variable.",
			{ exit: 1 },
		);
	}
}

/**
 * Initialize the shared cache and handle errors.
 */
export async function initializeCacheOrFail(
	logger: LoggerWithError,
	cacheDir: string,
	skipCacheWrite = true,
	verifyCacheIntegrity = false,
	overwriteCache = false,
): Promise<SharedCacheManager> {
	const { initializeSharedCache } = await import(
		"../core/sharedCache/index.js"
	);

	const sharedCache = await initializeSharedCache(
		cacheDir,
		process.cwd(),
		skipCacheWrite,
		verifyCacheIntegrity,
		logger,
		overwriteCache,
	);

	if (!sharedCache) {
		logger.error("Failed to initialize cache.", { exit: 1 });
	}

	return sharedCache;
}
