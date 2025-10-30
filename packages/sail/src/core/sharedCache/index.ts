/*!
 * Shared cache exports for Sail build system.
 */

// Main cache manager
export { SharedCacheManager } from "./sharedCacheManager.js";

// Initialization
export { initializeSharedCache } from "./init.js";

// Core types
export type {
	CacheKeyInputs,
	CacheManifest,
	CacheEntry,
	TaskOutputs,
	RestoreResult,
	StoreResult,
	CacheStatistics,
	GlobalCacheKeyComponents,
	SharedCacheOptions,
} from "./types.js";

// Utilities
export {
	computeCacheKey,
	hashContent,
	verifyCacheKey,
	shortCacheKey,
} from "./cacheKey.js";

export { readManifest, writeManifest, createManifest } from "./manifest.js";

export { getCacheEntryPath } from "./cacheDirectory.js";
