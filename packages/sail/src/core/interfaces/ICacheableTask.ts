/**
 * Interface for tasks that support shared caching.
 * Tasks implementing this interface can have their outputs stored in and restored from a shared cache.
 *
 * @public
 */
export interface ICacheableTask {
	/**
	 * Whether this task type supports shared caching.
	 * Return false for tasks that produce non-deterministic outputs or shouldn't be cached.
	 */
	readonly canUseCache: boolean;

	/**
	 * Get input files for cache key computation.
	 * The cache key is computed from the hashes of these files along with task metadata.
	 * Return an empty array if the task doesn't support caching yet.
	 *
	 * @returns Array of absolute paths to files that this task depends on.
	 */
	getCacheInputFiles(): Promise<string[]>;

	/**
	 * Get output files for cache storage/verification.
	 * These files will be stored in the cache and restored on cache hits.
	 * Return an empty array if the task doesn't support caching yet.
	 *
	 * @returns Array of absolute paths to files that this task generates.
	 */
	getCacheOutputFiles(): Promise<string[]>;
}
