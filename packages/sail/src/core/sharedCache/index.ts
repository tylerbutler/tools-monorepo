/*!
 * Shared cache exports for Sail build system.
 */

export { getCacheEntryPath } from "./cacheDirectory.js";
// Utilities
export {
	computeCacheKey,
	hashContent,
	shortCacheKey,
	verifyCacheKey,
} from "./cacheKey.js";
// Initialization
export { initializeSharedCache } from "./init.js";
export { createManifest, readManifest, writeManifest } from "./manifest.js";
// Main cache manager
export { SharedCacheManager } from "./sharedCacheManager.js";
// Core types
export type {
	CacheEntry,
	CacheKeyInputs,
	CacheManifest,
	CacheStatistics,
	GlobalCacheKeyComponents,
	RestoreResult,
	SharedCacheOptions,
	StoreResult,
	TaskOutputs,
} from "./types.js";
