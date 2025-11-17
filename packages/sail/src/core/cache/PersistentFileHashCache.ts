import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "pathe";
import { FileHashCache, type hashFn, sha256 } from "../fileHashCache.js";

/**
 * Persistent file hash cache that stores hash results between build runs
 */
export class PersistentFileHashCache extends FileHashCache {
	private readonly cacheDir: string;
	private readonly cacheFile: string;
	private persistentCache = new Map<string, PersistentHashEntry>();
	private cacheLoaded = false;
	private cacheDirty = false;

	public constructor(cacheDir?: string) {
		super();
		this.cacheDir = cacheDir ?? path.join(process.cwd(), ".sail", "cache");
		this.cacheFile = path.join(this.cacheDir, "file-hashes.json");
	}

	/**
	 * Get file hash with persistent caching
	 */
	public override async getFileHash(
		filePath: string,
		hash: hashFn = sha256,
	): Promise<string> {
		await this.ensureCacheLoaded();

		try {
			// Check if we have a persistent cache entry
			const entry = this.persistentCache.get(filePath);
			if (entry) {
				const stats = await stat(filePath);
				// If file hasn't changed, return cached hash
				if (stats.mtimeMs === entry.mtime && stats.size === entry.size) {
					return entry.hash;
				}
			}
		} catch {
			// File doesn't exist or stat failed, fall through to compute hash
		}

		// File changed or not cached, compute new hash
		const newHash = await super.getFileHash(filePath, hash);

		// Update persistent cache
		try {
			const stats = await stat(filePath);
			this.persistentCache.set(filePath, {
				hash: newHash,
				mtime: stats.mtimeMs,
				size: stats.size,
				lastAccessed: Date.now(),
			});
			this.cacheDirty = true;
		} catch {
			// Ignore stat errors for cache updates
		}

		return newHash;
	}

	/**
	 * Get multiple file hashes in parallel with efficient batching
	 */
	public async getFileHashesBatch(
		filePaths: string[],
		hash: hashFn = sha256,
	): Promise<Map<string, string>> {
		await this.ensureCacheLoaded();

		const results = new Map<string, string>();
		const uncachedFiles: string[] = [];

		// First pass: check persistent cache
		for (const filePath of filePaths) {
			const entry = this.persistentCache.get(filePath);
			if (entry) {
				try {
					const stats = await stat(filePath);
					if (stats.mtimeMs === entry.mtime && stats.size === entry.size) {
						results.set(filePath, entry.hash);
						continue;
					}
				} catch {
					// File doesn't exist, remove from cache
					this.persistentCache.delete(filePath);
					this.cacheDirty = true;
					continue;
				}
			}
			uncachedFiles.push(filePath);
		}

		// Second pass: compute hashes for uncached files in parallel
		if (uncachedFiles.length > 0) {
			const hashPromises = uncachedFiles.map(async (filePath) => {
				try {
					const fileHash = await super.getFileHash(filePath, hash);
					const stats = await stat(filePath);

					// Update cache
					this.persistentCache.set(filePath, {
						hash: fileHash,
						mtime: stats.mtimeMs,
						size: stats.size,
						lastAccessed: Date.now(),
					});
					this.cacheDirty = true;

					return { filePath, hash: fileHash };
				} catch (error) {
					throw new Error(`Failed to hash file ${filePath}: ${error}`);
				}
			});

			const hashResults = await Promise.all(hashPromises);
			for (const { filePath, hash: fileHash } of hashResults) {
				results.set(filePath, fileHash);
			}
		}

		return results;
	}

	/**
	 * Save cache to disk
	 */
	public async saveCache(): Promise<void> {
		if (!this.cacheDirty || this.persistentCache.size === 0) {
			return;
		}

		try {
			await this.ensureCacheDir();

			// Clean up old entries (older than 7 days)
			const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
			for (const [filePath, entry] of this.persistentCache) {
				if (entry.lastAccessed < cutoffTime) {
					this.persistentCache.delete(filePath);
				}
			}

			const cacheData: PersistentCacheData = {
				version: CACHE_VERSION,
				entries: Object.fromEntries(this.persistentCache),
				lastSaved: Date.now(),
			};

			await writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
			this.cacheDirty = false;
		} catch (_error) {
			// Silently ignore cache write errors
		}
	}

	/**
	 * Load cache from disk
	 */
	public async loadCache(): Promise<void> {
		if (this.cacheLoaded) {
			return;
		}

		try {
			if (existsSync(this.cacheFile)) {
				const cacheData = JSON.parse(
					await readFile(this.cacheFile, "utf-8"),
				) as PersistentCacheData;

				// Check cache version compatibility
				if (cacheData.version === CACHE_VERSION) {
					this.persistentCache = new Map(Object.entries(cacheData.entries));
				} else {
					// Incompatible cache version, start fresh
					this.persistentCache.clear();
				}
			}
		} catch (_error) {
			this.persistentCache.clear();
		}

		this.cacheLoaded = true;
	}

	/**
	 * Clear all caches
	 */
	public override clear(): void {
		super.clear();
		this.persistentCache.clear();
		this.cacheDirty = true;
	}

	/**
	 * Get cache statistics
	 */
	public getCacheStats(): CacheStats {
		return {
			persistentEntries: this.persistentCache.size,
			memoryEntries: this.fileHashCaches.size,
			cacheFile: this.cacheFile,
			lastSaved: this.getLastSavedTime(),
		};
	}

	/**
	 * Cleanup cache by removing stale entries
	 */
	public async cleanupCache(
		maxAge: number = 7 * 24 * 60 * 60 * 1000,
	): Promise<number> {
		await this.ensureCacheLoaded();

		const cutoffTime = Date.now() - maxAge;
		let removedCount = 0;

		for (const [filePath, entry] of this.persistentCache) {
			if (entry.lastAccessed < cutoffTime) {
				this.persistentCache.delete(filePath);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			this.cacheDirty = true;
		}

		return removedCount;
	}

	private async ensureCacheLoaded(): Promise<void> {
		if (!this.cacheLoaded) {
			await this.loadCache();
		}
	}

	private async ensureCacheDir(): Promise<void> {
		if (!existsSync(this.cacheDir)) {
			await mkdir(this.cacheDir, { recursive: true });
		}
	}

	private getLastSavedTime(): number | undefined {
		try {
			if (existsSync(this.cacheFile)) {
				const stats = statSync(this.cacheFile);
				return stats.mtimeMs;
			}
		} catch {
			// Ignore errors
		}
		return undefined;
	}
}

/**
 * Cache entry with metadata
 */
interface PersistentHashEntry {
	hash: string;
	mtime: number;
	size: number;
	lastAccessed: number;
}

/**
 * Cache file format
 */
interface PersistentCacheData {
	version: number;
	entries: Record<string, PersistentHashEntry>;
	lastSaved: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
	persistentEntries: number;
	memoryEntries: number;
	cacheFile: string;
	lastSaved?: number;
}

const CACHE_VERSION = 1;
