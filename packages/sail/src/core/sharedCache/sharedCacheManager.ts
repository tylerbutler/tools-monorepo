/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import type { Logger } from "@tylerbu/cli-api";
import registerDebug from "debug";
import {
	cacheEntryExists,
	getCacheEntryPath,
	initializeCacheDirectory,
} from "./cacheDirectory.js";
import { computeCacheKey } from "./cacheKey.js";
import {
	copyFileWithDirs,
	hashFilesWithSize,
	verifyFilesIntegrity,
} from "./fileOperations.js";
import {
	createManifest,
	readManifest,
	updateManifestAccessTime,
} from "./manifest.js";
import { loadStatistics, saveStatistics } from "./statistics.js";
import type {
	CacheEntry,
	CacheKeyInputs,
	CacheStatistics,
	GlobalCacheKeyComponents,
	RestoreResult,
	SharedCacheOptions,
	StoreResult,
	TaskOutputs,
} from "./types.js";

// Debug traces for cache operations
const traceInit = registerDebug("sail:cache:init");
const traceLookup = registerDebug("sail:cache:lookup");
const traceStore = registerDebug("sail:cache:store");
const traceRestore = registerDebug("sail:cache:restore");
const traceStats = registerDebug("sail:cache:stats");
const traceError = registerDebug("sail:cache:error");

/**
 * Main orchestrator for shared cache operations.
 *
 * The SharedCacheManager provides:
 * - Cache lookup: Check if a task's outputs are already cached
 * - Cache storage: Store a task's outputs for future reuse
 * - Cache restoration: Restore cached outputs to the workspace
 *
 * It handles all the complexity of cache keys, manifests, file operations,
 * and error recovery, providing a simple interface for the build system.
 *
 * @beta
 */
export class SharedCacheManager {
	public readonly options: SharedCacheOptions;
	private readonly logger: Logger;
	private readonly statistics: CacheStatistics;
	private initialized = false;
	private initializationPromise: Promise<void> | undefined;
	private pendingAccessTimeUpdates = new Set<Promise<void>>();

	/**
	 * Create a new SharedCacheManager.
	 *
	 * @param options - Configuration options for the cache
	 */
	public constructor(options: SharedCacheOptions) {
		this.options = options;
		this.logger = options.logger;
		// Statistics will be loaded from disk during initialization
		this.statistics = {
			totalEntries: 0,
			totalSize: 0,
			hitCount: 0,
			missCount: 0,
			avgRestoreTime: 0,
			avgStoreTime: 0,
			timeSavedMs: 0,
		};
	}

	/**
	 * Initialize the cache directory structure.
	 *
	 * This is called lazily on first use to avoid overhead if cache is not accessed.
	 * Also loads persisted statistics from disk.
	 *
	 * IMPORTANT: This method is safe to call concurrently. If multiple tasks call it
	 * simultaneously, only one will perform the initialization while others wait.
	 *
	 * @returns Promise that resolves when initialization is complete
	 * @throws Error if cache directory cannot be initialized
	 */
	public async initialize(): Promise<void> {
		// If already initialized, return immediately
		if (this.initialized) {
			return;
		}

		// If initialization is in progress, wait for it to complete
		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		// Create the initialization promise to prevent concurrent initialization
		this.initializationPromise = (async () => {
			traceInit(`Initializing cache at ${this.options.cacheDir}`);
			const startTime = Date.now();

			try {
				await initializeCacheDirectory(this.options.cacheDir);
				traceInit("Cache directory structure initialized");

				// Load persisted statistics
				const persistedStats = await loadStatistics(this.options.cacheDir);
				// Merge with current in-memory stats (preserving session-specific counts)
				this.statistics.totalEntries = persistedStats.totalEntries;
				this.statistics.totalSize = persistedStats.totalSize;
				this.statistics.lastPruned = persistedStats.lastPruned;

				const elapsed = Date.now() - startTime;
				traceInit(
					`Cache initialized in ${elapsed}ms (${this.statistics.totalEntries} entries, ${(this.statistics.totalSize / 1024 / 1024).toFixed(2)} MB)`,
				);
				traceStats(
					`Stats: ${this.statistics.totalEntries} entries, ${(this.statistics.totalSize / 1024 / 1024).toFixed(2)} MB`,
				);

				this.initialized = true;
			} catch (error) {
				// Graceful degradation: log error but don't fail the build
				traceError(`Failed to initialize cache: ${error}`);
				throw error;
			}
		})();

		// Wait for initialization to complete
		await this.initializationPromise;
	}

	/**
	 * Get the global cache key components.
	 *
	 * These are the components that apply to all tasks and are computed once at startup.
	 *
	 * @returns The global cache key components
	 */
	public getGlobalKeyComponents(): GlobalCacheKeyComponents {
		return this.options.globalKeyComponents;
	}

	/**
	 * Look up a cache entry for the given inputs.
	 *
	 * This checks if a task with identical inputs has been executed before
	 * and returns the cache entry if found.
	 *
	 * @param inputs - The task inputs to look up
	 * @returns The cache entry if found and valid, undefined otherwise
	 */
	public async lookup(inputs: CacheKeyInputs): Promise<CacheEntry | undefined> {
		const startTime = Date.now();
		try {
			await this.initialize();

			// Compute cache key from inputs
			const cacheKey = computeCacheKey(inputs);
			const shortKey = cacheKey.substring(0, 12);
			traceLookup(
				`Looking up cache entry for key ${shortKey}... (task: ${inputs.taskName})`,
			);

			// Check if entry exists
			const entryPath = getCacheEntryPath(this.options.cacheDir, cacheKey);
			const exists = await cacheEntryExists(this.options.cacheDir, cacheKey);
			traceLookup(
				`Cache lookup for ${inputs.packageName}#${inputs.taskName} (key: ${shortKey}): ${exists ? "FOUND" : "MISS"}`,
			);
			if (!exists) {
				const elapsed = Date.now() - startTime;
				traceLookup(`MISS: Entry not found for ${shortKey} (${elapsed}ms)`);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			// Read and validate manifest
			const manifestPath = path.join(entryPath, "manifest.json");
			const manifest = await readManifest(manifestPath);

			// Check if manifest exists and is valid
			if (!manifest) {
				const elapsed = Date.now() - startTime;
				traceLookup(`MISS: Invalid manifest for ${shortKey} (${elapsed}ms)`);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			// Verify global cache key components match
			// We only restore caches when all global components are identical
			if (
				manifest.cacheSchemaVersion !==
				this.options.globalKeyComponents.cacheSchemaVersion
			) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: Cache schema version mismatch for ${shortKey} (cached: ${manifest.cacheSchemaVersion}, current: ${this.options.globalKeyComponents.cacheSchemaVersion}) (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			if (
				manifest.nodeVersion !== this.options.globalKeyComponents.nodeVersion
			) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: Node version mismatch for ${shortKey} (cached: ${manifest.nodeVersion}, current: ${this.options.globalKeyComponents.nodeVersion}) (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			if (manifest.arch !== this.options.globalKeyComponents.arch) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: Architecture mismatch for ${shortKey} (cached: ${manifest.arch}, current: ${this.options.globalKeyComponents.arch}) (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			if (manifest.platform !== this.options.globalKeyComponents.platform) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: Platform mismatch for ${shortKey} (cached: ${manifest.platform}, current: ${this.options.globalKeyComponents.platform}) (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			if (
				manifest.lockfileHash !== this.options.globalKeyComponents.lockfileHash
			) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: Lockfile hash mismatch for ${shortKey} (dependencies changed) (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			if (manifest.nodeEnv !== this.options.globalKeyComponents.nodeEnv) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: NODE_ENV mismatch for ${shortKey} (cached: ${manifest.nodeEnv ?? "undefined"}, current: ${this.options.globalKeyComponents.nodeEnv ?? "undefined"}) (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			if (
				JSON.stringify(manifest.cacheBustVars) !==
				JSON.stringify(this.options.globalKeyComponents.cacheBustVars)
			) {
				const elapsed = Date.now() - startTime;
				traceLookup(
					`MISS: Cache bust variables mismatch for ${shortKey} (${elapsed}ms)`,
				);
				this.statistics.missCount++;
				traceStats(
					`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses`,
				);
				return undefined;
			}

			// Update access time for LRU tracking (non-blocking, errors ignored)
			// This is done asynchronously to avoid blocking the lookup and to prevent
			// race conditions where concurrent lookups might try to update the same file
			// Track the promise to ensure it completes before process exit
			const updatePromise = updateManifestAccessTime(manifestPath)
				.catch((error) => {
					// Silently ignore access time update failures - they're not critical
					// The manifest will still be valid, just with a slightly stale access time
					traceError(
						`Failed to update manifest access time for ${shortKey}: ${error}`,
					);
				})
				.finally(() => {
					// Remove from tracking set when complete
					this.pendingAccessTimeUpdates.delete(updatePromise);
				});

			this.pendingAccessTimeUpdates.add(updatePromise);

			// Cache hit!
			const elapsed = Date.now() - startTime;
			this.statistics.hitCount++;
			this.statistics.timeSavedMs += manifest.executionTimeMs;
			traceLookup(
				`HIT: Found valid cache entry ${shortKey} with ${manifest.outputFiles.length} files (${elapsed}ms)`,
			);
			traceStats(
				`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses, ${this.statistics.timeSavedMs}ms saved`,
			);

			return {
				cacheKey,
				entryPath,
				manifest,
			};
		} catch (error) {
			// Graceful degradation: treat lookup errors as cache misses
			const elapsed = Date.now() - startTime;
			traceError(`Cache lookup error: ${error} (${elapsed}ms)`);
			this.statistics.missCount++;
			return undefined;
		}
	}

	/**
	 * Store task outputs in the cache.
	 *
	 * This creates a new cache entry with the task's outputs and metadata,
	 * making it available for future cache hits.
	 *
	 * @param inputs - The task inputs (for computing cache key)
	 * @param outputs - The task outputs to store
	 * @param packageRoot - Absolute path to the package root (currently unused, reserved for future use)
	 * @param lookupWasPerformed - Whether a cache lookup was performed before this store (default: true)
	 * @returns Promise that resolves with the result of the storage operation
	 */
	public async store(
		inputs: CacheKeyInputs,
		outputs: TaskOutputs,
		_packageRoot: string, // eslint-disable-line @typescript-eslint/no-unused-vars
		lookupWasPerformed = true,
	): Promise<StoreResult> {
		// If no lookup was performed, count this as a miss
		// (task executed but we didn't check cache first)
		if (!lookupWasPerformed) {
			this.statistics.missCount++;
			traceStats(
				`Cache stats: ${this.statistics.hitCount} hits, ${this.statistics.missCount} misses (no lookup performed)`,
			);
		}

		// Skip if cache writes are disabled
		if (this.options.skipCacheWrite) {
			const reason = "--skip-cache-write enabled";
			traceStore("Skipping cache write (disabled by --skip-cache-write)");
			return { success: false, reason };
		}

		// Only cache successful executions
		if (outputs.exitCode !== 0) {
			const reason = `task failed (exit code ${outputs.exitCode})`;
			traceStore(
				`Skipping cache write for failed task (exit code ${outputs.exitCode})`,
			);
			return { success: false, reason };
		}

		const storeStartTime = Date.now();

		try {
			await this.initialize();

			// Compute cache key
			const cacheKey = computeCacheKey(inputs);
			const shortKey = cacheKey.substring(0, 12);
			traceStore(
				`Storing cache entry ${shortKey} for ${inputs.packageName}#${inputs.taskName} (${outputs.files.length} files)`,
			);

			// Get cache entry path
			const entryPath = getCacheEntryPath(this.options.cacheDir, cacheKey);

			// Check if manifest already exists (avoid redundant work)
			// IMPORTANT: Check for manifest.json specifically, not just the directory,
			// to avoid race conditions where parallel tasks might create the directory
			// but not yet write the manifest
			const manifestPath = path.join(entryPath, "manifest.json");
			if (existsSync(manifestPath)) {
				if (!this.options.overwriteCache) {
					const reason = "cache entry already exists";
					this.logger.warning(
						`${inputs.packageName}#${inputs.taskName}: Cache entry ${shortKey} already exists when trying to store. ` +
							"This indicates the task executed despite cache hit, or a race condition between parallel tasks. " +
							`Manifest path: ${manifestPath}`,
					);
					traceStore(`Cache entry ${shortKey} already exists, skipping store`);
					return { success: false, reason };
				}
				// --overwrite-cache enabled: delete existing entry and proceed with store
				traceStore(
					`Cache entry ${shortKey} already exists, but --overwrite-cache is enabled. Removing existing entry.`,
				);
				const { rm } = await import("node:fs/promises");
				await rm(entryPath, { recursive: true, force: true });
			}

			// Hash all output files for integrity verification
			// NOTE: hashFilesWithSize now throws if any file doesn't exist or is a directory
			// This ensures tasks accurately declare their outputs
			const hashStartTime = Date.now();
			const outputFilesWithHashes = await hashFilesWithSize(
				outputs.files.map((f) => f.sourcePath),
			);
			const hashTime = Date.now() - hashStartTime;

			// Create parallel array with file metadata and hashes
			const existingFiles: Array<{
				file: { sourcePath: string; relativePath: string; hash?: string };
				hash: string;
				size: number;
			}> = [];
			for (let i = 0; i < outputFilesWithHashes.length; i++) {
				const hashResult = outputFilesWithHashes[i];
				existingFiles.push({
					file: outputs.files[i],
					hash: hashResult.hash,
					size: hashResult.size,
				});
			}

			traceStore(
				`Hashed ${existingFiles.length} output files in ${hashTime}ms`,
			);

			// Create manifest
			const manifest = createManifest({
				cacheKey,
				packageName: inputs.packageName,
				taskName: inputs.taskName,
				executable: inputs.executable,
				command: inputs.command,
				exitCode: 0,
				executionTimeMs: outputs.executionTimeMs,
				cacheSchemaVersion: this.options.globalKeyComponents.cacheSchemaVersion,
				nodeVersion: this.options.globalKeyComponents.nodeVersion,
				arch: this.options.globalKeyComponents.arch,
				platform: this.options.globalKeyComponents.platform,
				lockfileHash: this.options.globalKeyComponents.lockfileHash,
				nodeEnv: this.options.globalKeyComponents.nodeEnv,
				cacheBustVars: this.options.globalKeyComponents.cacheBustVars,
				inputFiles: inputs.inputHashes.map((input) => ({
					path: input.path,
					hash: input.hash,
				})),
				outputFiles: existingFiles.map((f) => ({
					path: f.file.relativePath,
					hash: f.hash,
					size: f.size,
				})),
				stdout: outputs.stdout,
				stderr: outputs.stderr,
			});

			// Copy output files to cache directory (only existing files)
			const copyStartTime = Date.now();
			for (const { file } of existingFiles) {
				const sourcePath = file.sourcePath;
				const destPath = path.join(entryPath, "outputs", file.relativePath);
				await copyFileWithDirs(sourcePath, destPath);
			}
			const copyTime = Date.now() - copyStartTime;
			traceStore(
				`Copied ${existingFiles.length} files to cache in ${copyTime}ms`,
			);

			// Write manifest (atomically)
			const { writeManifest } = await import("./manifest.js");
			await writeManifest(manifestPath, manifest);

			// VERIFY: Manifest file exists immediately after write
			const manifestExists = existsSync(manifestPath);
			traceStore(
				`POST-WRITE VERIFY: ${shortKey} manifest at ${manifestPath} - ${manifestExists ? "EXISTS ✓" : "NOT FOUND ✗"}`,
			);
			if (!manifestExists) {
				traceStore(
					`WARNING: Manifest ${shortKey} was written but does not exist on disk!`,
				);
			}

			// Update statistics
			const storeTime = Date.now() - storeStartTime;
			const entrySize = existingFiles.reduce((sum, f) => sum + f.size, 0);

			this.statistics.totalEntries++;
			this.statistics.totalSize += entrySize;

			// Update average store time
			const previousStores = this.statistics.totalEntries - 1;
			if (previousStores === 0) {
				this.statistics.avgStoreTime = storeTime;
			} else {
				this.statistics.avgStoreTime =
					(this.statistics.avgStoreTime * previousStores + storeTime) /
					this.statistics.totalEntries;
			}

			traceStore(
				`Stored cache entry ${shortKey} successfully (${(entrySize / 1024).toFixed(2)} KB, ${storeTime}ms total)`,
			);
			traceStats(
				`Cache stats: ${this.statistics.totalEntries} entries, ${(this.statistics.totalSize / 1024 / 1024).toFixed(2)} MB total`,
			);

			// Persist statistics to disk
			await this.persistStatistics();

			return {
				success: true,
				filesStored: existingFiles.length,
				bytesStored: entrySize,
			};
		} catch (error) {
			// Graceful degradation: log error but don't fail the build
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorCode = (error as NodeJS.ErrnoException).code;

			// Provide more specific error messages
			let reason = errorMessage;
			if (errorCode === "ENOSPC") {
				reason = "disk full";
			} else if (errorCode === "EACCES" || errorCode === "EPERM") {
				reason = "permission denied";
			} else if (errorCode === "ENOENT") {
				reason = "output file missing";
			} else if (errorMessage.includes("EISDIR")) {
				reason = "invalid file type";
			}

			traceError(`Failed to store cache entry: ${error}`);
			return { success: false, reason };
		}
	}

	/**
	 * Restore cached outputs to the workspace.
	 *
	 * This copies files from a cache entry back to the workspace,
	 * optionally verifying file integrity.
	 *
	 * @param entry - The cache entry to restore
	 * @param packageRoot - Absolute path to the package root
	 * @returns Result of the restoration operation
	 */
	public async restore(
		entry: CacheEntry,
		packageRoot: string,
	): Promise<RestoreResult> {
		const restoreStartTime = Date.now();
		const shortKey = entry.cacheKey.substring(0, 12);

		traceRestore(
			`Restoring cache entry ${shortKey} (${entry.manifest.outputFiles.length} files)`,
		);

		try {
			// Verify source files exist and have correct hashes (if integrity check enabled)
			if (this.options.verifyIntegrity) {
				const verifyStartTime = Date.now();
				const filesToVerify = entry.manifest.outputFiles.map((output) => ({
					path: path.join(entry.entryPath, "outputs", output.path),
					hash: output.hash,
				}));

				const verification = await verifyFilesIntegrity(filesToVerify);
				const verifyTime = Date.now() - verifyStartTime;

				if (!verification.success) {
					traceRestore(
						`Integrity verification failed for ${shortKey}: ${verification.failedFiles.join(", ")} (${verifyTime}ms)`,
					);
					traceError(
						`Cache integrity check failed for ${shortKey}: ${verification.failedFiles.length} files failed`,
					);
					return {
						success: false,
						filesRestored: 0,
						bytesRestored: 0,
						restoreTimeMs: Date.now() - restoreStartTime,
						error: `Integrity verification failed: ${verification.failedFiles.join(", ")}`,
						isUnexpectedFailure: true,
					};
				}
				traceRestore(
					`Integrity verified for ${entry.manifest.outputFiles.length} files (${verifyTime}ms)`,
				);
			}

			// Copy files from cache to workspace
			const copyStartTime = Date.now();
			for (const output of entry.manifest.outputFiles) {
				const sourcePath = path.join(entry.entryPath, "outputs", output.path);
				const destPath = path.join(packageRoot, output.path);
				await copyFileWithDirs(sourcePath, destPath);
			}
			const copyTime = Date.now() - copyStartTime;
			traceRestore(
				`Copied ${entry.manifest.outputFiles.length} files in ${copyTime}ms`,
			);

			// Calculate statistics
			const totalBytes = entry.manifest.outputFiles.reduce(
				(sum, f) => sum + f.size,
				0,
			);
			const restoreTime = Date.now() - restoreStartTime;

			// Update average restore time
			this.statistics.avgRestoreTime =
				(this.statistics.avgRestoreTime * (this.statistics.hitCount - 1) +
					restoreTime) /
				this.statistics.hitCount;

			traceRestore(
				`Successfully restored cache entry ${shortKey} (${(totalBytes / 1024).toFixed(2)} KB, ${restoreTime}ms total)`,
			);
			traceStats(
				`Avg restore time: ${this.statistics.avgRestoreTime.toFixed(1)}ms`,
			);

			return {
				success: true,
				filesRestored: entry.manifest.outputFiles.length,
				bytesRestored: totalBytes,
				restoreTimeMs: restoreTime,
				stdout: entry.manifest.stdout,
				stderr: entry.manifest.stderr,
			};
		} catch (error) {
			traceError(`Failed to restore cache entry ${shortKey}: ${error}`);
			return {
				success: false,
				filesRestored: 0,
				bytesRestored: 0,
				restoreTimeMs: Date.now() - restoreStartTime,
				error: error instanceof Error ? error.message : String(error),
				isUnexpectedFailure: true,
			};
		}
	}

	/**
	 * Get current cache statistics.
	 *
	 * @returns Current statistics snapshot
	 */
	public getStatistics(): Readonly<CacheStatistics> {
		return { ...this.statistics };
	}

	/**
	 * Reset statistics counters.
	 *
	 * Useful for measuring cache performance over specific build runs.
	 */
	public resetStatistics(): void {
		this.statistics.hitCount = 0;
		this.statistics.missCount = 0;
		this.statistics.avgRestoreTime = 0;
		this.statistics.avgStoreTime = 0;
	}

	/**
	 * Wait for all pending background operations to complete.
	 *
	 * This should be called before process exit to ensure all
	 * async operations (like access time updates) complete properly.
	 *
	 * @returns Promise that resolves when all pending operations complete
	 */
	public async waitForPendingOperations(): Promise<void> {
		if (this.pendingAccessTimeUpdates.size > 0) {
			await Promise.all(this.pendingAccessTimeUpdates);
		}
	}

	/**
	 * Persist current statistics to disk.
	 *
	 * This should be called periodically and at the end of a build
	 * to ensure statistics are not lost.
	 *
	 * @returns Promise that resolves when save is complete
	 */
	public async persistStatistics(): Promise<void> {
		if (!this.initialized) {
			return;
		}

		await saveStatistics(this.options.cacheDir, this.statistics);
	}

	/**
	 * Display cache statistics to console.
	 *
	 * Shows current statistics including hit/miss counts, cache size,
	 * and average operation times.
	 */
	public async displayStatistics(): Promise<void> {
		await this.initialize();

		const _hitRate =
			this.statistics.hitCount + this.statistics.missCount > 0
				? (
						(this.statistics.hitCount /
							(this.statistics.hitCount + this.statistics.missCount)) *
						100
					).toFixed(1)
				: "0.0";

		if (this.statistics.lastPruned) {
			const _prunedDate = new Date(this.statistics.lastPruned).toLocaleString();
		}
	}

	/**
	 * Clean all cache entries.
	 *
	 * Removes all cached data but preserves the cache directory structure.
	 * Statistics are reset to zero.
	 *
	 * @returns Promise that resolves when cleaning is complete
	 */
	public async cleanCache(): Promise<void> {
		await this.initialize();

		const { rm } = await import("node:fs/promises");
		const { getCacheEntriesDirectory } = await import("./cacheDirectory.js");

		const entriesDir = getCacheEntriesDirectory(this.options.cacheDir);
		// Remove all entries
		await rm(entriesDir, { recursive: true, force: true });

		// Recreate entries directory
		const { mkdir } = await import("node:fs/promises");
		await mkdir(entriesDir, { recursive: true });

		// Reset statistics
		this.statistics.totalEntries = 0;
		this.statistics.totalSize = 0;

		// Save updated statistics
		await this.persistStatistics();
	}

	/**
	 * Prune old cache entries based on LRU policy.
	 *
	 * Removes least recently used entries until the cache is under the
	 * specified size limit or age threshold.
	 *
	 * @param maxSizeMB - Maximum cache size in megabytes (default: 5000 MB = 5 GB)
	 * @param maxAgeDays - Maximum age of entries in days (default: 30 days)
	 * @returns Number of entries pruned
	 */
	public async pruneCache(maxSizeMB = 5000, maxAgeDays = 30): Promise<number> {
		await this.initialize();

		const { readdir, stat, rm } = await import("node:fs/promises");
		const { getCacheEntriesDirectory } = await import("./cacheDirectory.js");
		const { updateCacheSizeStats } = await import("./statistics.js");

		const entriesDir = getCacheEntriesDirectory(this.options.cacheDir);
		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
		const now = Date.now();
		// Get all cache entries with their access times
		const entries = await readdir(entriesDir, { withFileTypes: true });
		const entryInfos: Array<{
			name: string;
			accessTime: number;
			size: number;
		}> = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const entryPath = path.join(entriesDir, entry.name);
			const manifestPath = path.join(entryPath, "manifest.json");

			try {
				await stat(manifestPath);
				const outputsDir = path.join(entryPath, "outputs");

				// Read manifest to get access time
				const manifest = await readManifest(entryPath);

				if (!manifest) {
					continue;
				}

				// Calculate entry size
				let entrySize = 0;
				try {
					const outputEntries = await readdir(outputsDir, {
						recursive: true,
					});
					for (const outputFile of outputEntries) {
						const filePath = path.join(outputsDir, outputFile);
						try {
							const fileStat = await stat(filePath);
							if (fileStat.isFile()) {
								entrySize += fileStat.size;
							}
						} catch {
							// Skip files that can't be accessed
						}
					}
				} catch {
					// Skip if outputs directory doesn't exist
				}

				entryInfos.push({
					name: entry.name,
					accessTime: new Date(manifest.lastAccessedAt).getTime(),
					size: entrySize,
				});
			} catch {
				// Skip entries with missing or invalid manifests
			}
		}

		// Sort by access time (oldest first)
		entryInfos.sort((a, b) => a.accessTime - b.accessTime);

		let pruned = 0;
		let currentSize = entryInfos.reduce((sum, e) => sum + e.size, 0);

		// Prune entries that are too old or exceed size limit
		for (const entry of entryInfos) {
			const age = now - entry.accessTime;
			const shouldPruneAge = age > maxAgeMs;
			const shouldPruneSize = currentSize > maxSizeBytes;

			if (shouldPruneAge || shouldPruneSize) {
				const entryPath = path.join(entriesDir, entry.name);
				await rm(entryPath, { recursive: true, force: true });
				pruned++;
				currentSize -= entry.size;
			}

			// Stop if we're under the size limit
			if (currentSize <= maxSizeBytes) {
				break;
			}
		}

		// Update statistics
		await updateCacheSizeStats(this.options.cacheDir, this.statistics);
		this.statistics.lastPruned = new Date().toISOString();
		await this.persistStatistics();

		return pruned;
	}

	/**
	 * Verify integrity of all cache entries.
	 *
	 * Checks that all cached files exist and have correct hashes.
	 * Reports any corrupted entries.
	 *
	 * @param fix - If true, remove corrupted entries (default: false)
	 * @returns Object containing verification results
	 */
	public async verifyCache(fix = false): Promise<{
		total: number;
		valid: number;
		corrupted: number;
		fixed: number;
	}> {
		await this.initialize();

		const { readdir, rm } = await import("node:fs/promises");
		const { getCacheEntriesDirectory } = await import("./cacheDirectory.js");
		const { updateCacheSizeStats } = await import("./statistics.js");

		const entriesDir = getCacheEntriesDirectory(this.options.cacheDir);

		let total = 0;
		let valid = 0;
		let corrupted = 0;
		let fixed = 0;
		const entries = await readdir(entriesDir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			total++;
			const entryPath = path.join(entriesDir, entry.name);

			try {
				// Read manifest
				const manifest = await readManifest(entryPath);

				if (!manifest) {
					corrupted++;
					if (fix) {
						await rm(entryPath, { recursive: true, force: true });
						fixed++;
					}
					continue;
				}

				// Verify all output files
				const filesToVerify = manifest.outputFiles.map((output) => ({
					path: path.join(entryPath, "outputs", output.path),
					hash: output.hash,
				}));

				const verification = await verifyFilesIntegrity(filesToVerify);

				if (verification.success) {
					valid++;
				} else {
					corrupted++;
					if (fix) {
						await rm(entryPath, { recursive: true, force: true });
						fixed++;
					}
				}
			} catch (_error) {
				corrupted++;
				if (fix) {
					try {
						await rm(entryPath, { recursive: true, force: true });
						fixed++;
					} catch {
						// Ignore errors when removing corrupted entries
					}
				}
			}
		}

		// Update statistics if we fixed entries
		if (fix && fixed > 0) {
			await updateCacheSizeStats(this.options.cacheDir, this.statistics);
			await this.persistStatistics();
		}

		return { total, valid, corrupted, fixed };
	}
}
