import crypto from "node:crypto";
import type { SailPackageJson } from "../../common/npmPackage.js";
import type { TaskDefinitions } from "../taskDefinitions.js";

/**
 * Cache for task definitions to avoid repeated computation
 */
export class TaskDefinitionCache {
	private readonly cache = new Map<string, TaskDefinitions>();
	private readonly accessTimes = new Map<string, number>();
	private readonly maxCacheSize: number;

	public constructor(maxCacheSize = 500) {
		this.maxCacheSize = maxCacheSize;
	}

	/**
	 * Get cached task definitions or compute if not cached
	 */
	public getTaskDefinitions(
		json: SailPackageJson,
		globalTaskDefinitions: TaskDefinitions,
		options: { isReleaseGroupRoot: boolean },
		computeFn: () => TaskDefinitions,
	): TaskDefinitions {
		const cacheKey = this.createCacheKey(json, globalTaskDefinitions, options);
		console.log(`[TASK DEF CACHE] ${json.name}: Looking up cache with key=${cacheKey}`);
		console.log(`[TASK DEF CACHE] ${json.name}: json.scripts=`, json.scripts);
		console.log(`[TASK DEF CACHE] ${json.name}: Cache has key? ${this.cache.has(cacheKey)}`);

		if (this.cache.has(cacheKey)) {
			this.accessTimes.set(cacheKey, Date.now());
			const cached = this.cache.get(cacheKey);
			if (cached !== undefined) {
				console.log(`[TASK DEF CACHE] ${json.name}: CACHE HIT - returning`, cached);
				return cached;
			}
		}

		// Compute new result
		console.log(`[TASK DEF CACHE] ${json.name}: CACHE MISS - computing`);
		const result = computeFn();
		console.log(`[TASK DEF CACHE] ${json.name}: Computed result=`, result);

		// Add to cache with eviction if needed
		this.addToCache(cacheKey, result);

		return result;
	}

	/**
	 * Check if task definitions are cached
	 */
	public has(
		json: SailPackageJson,
		globalTaskDefinitions: TaskDefinitions,
		options: { isReleaseGroupRoot: boolean },
	): boolean {
		const cacheKey = this.createCacheKey(json, globalTaskDefinitions, options);
		return this.cache.has(cacheKey);
	}

	/**
	 * Get cache statistics
	 */
	public getStats(): TaskDefinitionCacheStats {
		return {
			size: this.cache.size,
			maxSize: this.maxCacheSize,
			hitRate: this.calculateHitRate(),
		};
	}

	/**
	 * Clear the cache
	 */
	public clear(): void {
		this.cache.clear();
		this.accessTimes.clear();
	}

	/**
	 * Remove stale entries (older than specified time)
	 */
	public cleanup(maxAge: number = 5 * 60 * 1000): number {
		const cutoffTime = Date.now() - maxAge;
		let removedCount = 0;

		for (const [key, accessTime] of this.accessTimes) {
			if (accessTime < cutoffTime) {
				this.cache.delete(key);
				this.accessTimes.delete(key);
				removedCount++;
			}
		}

		return removedCount;
	}

	private createCacheKey(
		json: SailPackageJson,
		globalTaskDefinitions: TaskDefinitions,
		options: { isReleaseGroupRoot: boolean },
	): string {
		// Create a stable hash of the inputs
		// IMPORTANT: Don't use ?? operator here - we need to distinguish between
		// undefined scripts and empty scripts object for correct cache key generation
		const hashInput = {
			scripts: json.scripts,
			sailTasks: json.sail?.tasks,
			fluidBuildTasks: json.fluidBuild?.tasks,
			globalTasks: this.simplifyGlobalTasks(globalTaskDefinitions),
			isReleaseGroupRoot: options.isReleaseGroupRoot,
		};

		const hashString = JSON.stringify(hashInput, Object.keys(hashInput).sort());
		return crypto
			.createHash("sha256")
			.update(hashString)
			.digest("hex")
			.substring(0, 16);
	}

	private simplifyGlobalTasks(
		globalTasks: TaskDefinitions,
	): Record<string, string> {
		// Create a simplified representation of global tasks for hashing
		const simplified: Record<string, string> = {};
		for (const [name, def] of Object.entries(globalTasks)) {
			simplified[name] = JSON.stringify({
				script: def.script,
				dependsOn: def.dependsOn,
				before: def.before,
				after: def.after,
			});
		}
		return simplified;
	}

	private addToCache(key: string, value: TaskDefinitions): void {
		// Evict least recently used if cache is full
		if (this.cache.size >= this.maxCacheSize) {
			this.evictLeastRecentlyUsed();
		}

		this.cache.set(key, value);
		this.accessTimes.set(key, Date.now());
	}

	private evictLeastRecentlyUsed(): void {
		let oldestKey: string | undefined;
		let oldestTime = Number.MAX_SAFE_INTEGER;

		for (const [key, accessTime] of this.accessTimes) {
			if (accessTime < oldestTime) {
				oldestTime = accessTime;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.accessTimes.delete(oldestKey);
		}
	}

	private calculateHitRate(): number {
		// This is a simplified hit rate calculation
		// In a real implementation, you'd track hits vs misses
		return this.cache.size > 0 ? 0.8 : 0; // Placeholder
	}
}

/**
 * Configuration cache for parsed package configurations
 */
export class ConfigurationCache {
	private readonly cache = new Map<string, unknown>();
	private readonly accessTimes = new Map<string, number>();
	private readonly maxCacheSize: number;

	public constructor(maxCacheSize = 1000) {
		this.maxCacheSize = maxCacheSize;
	}

	/**
	 * Get cached configuration or compute if not cached
	 */
	public get<T>(key: string, computeFn: () => T): T {
		if (this.cache.has(key)) {
			this.accessTimes.set(key, Date.now());
			return this.cache.get(key) as T;
		}

		const result = computeFn();
		this.addToCache(key, result);
		return result;
	}

	/**
	 * Create cache key from package.json configuration
	 */
	public createPackageConfigKey(json: SailPackageJson): string {
		const configData = {
			scripts: json.scripts,
			sailTasks: json.sail?.tasks,
			fluidBuildTasks: json.fluidBuild?.tasks,
			sailConfig: json.sail,
			fluidBuildConfig: json.fluidBuild,
		};

		return crypto
			.createHash("sha256")
			.update(JSON.stringify(configData))
			.digest("hex")
			.substring(0, 16);
	}

	/**
	 * Clear the cache
	 */
	public clear(): void {
		this.cache.clear();
		this.accessTimes.clear();
	}

	/**
	 * Get cache size
	 */
	public size(): number {
		return this.cache.size;
	}

	private addToCache(key: string, value: unknown): void {
		if (this.cache.size >= this.maxCacheSize) {
			this.evictLeastRecentlyUsed();
		}

		this.cache.set(key, value);
		this.accessTimes.set(key, Date.now());
	}

	private evictLeastRecentlyUsed(): void {
		let oldestKey: string | undefined;
		let oldestTime = Number.MAX_SAFE_INTEGER;

		for (const [key, accessTime] of this.accessTimes) {
			if (accessTime < oldestTime) {
				oldestTime = accessTime;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.accessTimes.delete(oldestKey);
		}
	}
}

/**
 * Statistics for task definition cache
 */
export interface TaskDefinitionCacheStats {
	size: number;
	maxSize: number;
	hitRate: number;
}
