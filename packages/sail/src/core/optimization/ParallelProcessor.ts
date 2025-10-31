/**
 * Utilities for parallel processing and batching operations
 */
export class ParallelProcessor {
	/**
	 * Process items in parallel with concurrency control
	 */
	public static async processInParallel<T, R>(
		items: T[],
		processor: (item: T) => Promise<R>,
		concurrency = 10,
	): Promise<R[]> {
		const results: R[] = [];
		const semaphore = new Semaphore(concurrency);

		const promises = items.map(async (item, index) => {
			await semaphore.acquire();
			try {
				const result = await processor(item);
				results[index] = result;
				return result;
			} finally {
				semaphore.release();
			}
		});

		await Promise.all(promises);
		return results;
	}

	/**
	 * Process items in batches
	 */
	public static async processInBatches<T, R>(
		items: T[],
		processor: (batch: T[]) => Promise<R[]>,
		batchSize = 50,
	): Promise<R[]> {
		const results: R[] = [];

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchResults = await processor(batch);
			results.push(...batchResults);
		}

		return results;
	}

	/**
	 * Process items with early termination
	 */
	public static async processWithEarlyTermination<T>(
		items: T[],
		processor: (item: T) => Promise<boolean>,
		concurrency = 10,
	): Promise<boolean> {
		const semaphore = new Semaphore(concurrency);
		let shouldStop = false;

		const promises = items.map(async (item) => {
			if (shouldStop) {
				return true;
			}

			await semaphore.acquire();
			try {
				if (shouldStop) {
					return true;
				}

				const result = await processor(item);
				if (!result) {
					shouldStop = true;
				}
				return result;
			} finally {
				semaphore.release();
			}
		});

		const results = await Promise.all(promises);
		return results.every((result) => result);
	}

	/**
	 * Map operation with parallel processing
	 */
	public static async mapParallel<T, R>(
		items: T[],
		mapper: (item: T, index: number) => Promise<R>,
		concurrency = 10,
	): Promise<R[]> {
		return ParallelProcessor.processInParallel(
			items.map((item, index) => ({ item, index })),
			async ({ item, index }) => mapper(item, index),
			concurrency,
		);
	}

	/**
	 * Filter operation with parallel processing
	 */
	public static async filterParallel<T>(
		items: T[],
		predicate: (item: T) => Promise<boolean>,
		concurrency = 10,
	): Promise<T[]> {
		const results = await ParallelProcessor.mapParallel(
			items,
			async (item) => ({ item, keep: await predicate(item) }),
			concurrency,
		);

		return results.filter((result) => result.keep).map((result) => result.item);
	}

	/**
	 * Partition items into groups for optimal parallel processing
	 */
	public static partitionForProcessing<T>(
		items: T[],
		targetPartitions: number,
	): T[][] {
		if (items.length === 0) {
			return [];
		}

		const partitionSize = Math.ceil(items.length / targetPartitions);
		const partitions: T[][] = [];

		for (let i = 0; i < items.length; i += partitionSize) {
			partitions.push(items.slice(i, i + partitionSize));
		}

		return partitions;
	}
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
	private available: number;
	private waiters: Array<() => void> = [];

	public constructor(capacity: number) {
		this.available = capacity;
	}

	async acquire(): Promise<void> {
		if (this.available > 0) {
			this.available--;
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => {
			this.waiters.push(resolve);
		});
	}

	release(): void {
		if (this.waiters.length > 0) {
			const waiter = this.waiters.shift()!;
			waiter();
		} else {
			this.available++;
		}
	}
}

/**
 * Utilities for memory-efficient operations
 */
export class MemoryOptimizer {
	/**
	 * Process large arrays without keeping all results in memory
	 */
	public static async processStream<T, R>(
		items: T[],
		processor: (item: T) => Promise<R>,
		onResult: (result: R, index: number) => void,
		batchSize = 100,
	): Promise<void> {
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);

			const promises = batch.map(async (item, batchIndex) => {
				const result = await processor(item);
				onResult(result, i + batchIndex);
			});

			await Promise.all(promises);

			// Allow garbage collection between batches
			if (global.gc) {
				global.gc();
			}
		}
	}

	/**
	 * Create a memory-efficient map that can handle large datasets
	 */
	public static createLRUMap<K, V>(maxSize: number): LRUMap<K, V> {
		return new LRUMap<K, V>(maxSize);
	}

	/**
	 * Chunk array processing to reduce memory pressure
	 */
	public static chunkProcess<T, R>(
		items: T[],
		processor: (chunk: T[]) => R[],
		chunkSize = 1000,
	): R[] {
		const results: R[] = [];

		for (let i = 0; i < items.length; i += chunkSize) {
			const chunk = items.slice(i, i + chunkSize);
			const chunkResults = processor(chunk);
			results.push(...chunkResults);
		}

		return results;
	}
}

/**
 * Simple LRU Map implementation
 */
class LRUMap<K, V> {
	private cache = new Map<K, V>();
	private accessOrder: K[] = [];
	private maxSize: number;

	public constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			this.updateAccessOrder(key);
		}
		return value;
	}

	set(key: K, value: V): void {
		if (this.cache.has(key)) {
			this.cache.set(key, value);
			this.updateAccessOrder(key);
		} else {
			if (this.cache.size >= this.maxSize) {
				this.evictLeastRecentlyUsed();
			}
			this.cache.set(key, value);
			this.accessOrder.push(key);
		}
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	size(): number {
		return this.cache.size;
	}

	clear(): void {
		this.cache.clear();
		this.accessOrder = [];
	}

	private updateAccessOrder(key: K): void {
		const index = this.accessOrder.indexOf(key);
		if (index > -1) {
			this.accessOrder.splice(index, 1);
		}
		this.accessOrder.push(key);
	}

	private evictLeastRecentlyUsed(): void {
		if (this.accessOrder.length > 0) {
			const lruKey = this.accessOrder.shift()!;
			this.cache.delete(lruKey);
		}
	}
}
