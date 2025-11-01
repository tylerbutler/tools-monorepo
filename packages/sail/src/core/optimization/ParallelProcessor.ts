/**
 * Process items in parallel with concurrency control
 */
async function processInParallel<T, R>(
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
async function processInBatches<T, R>(
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
async function processWithEarlyTermination<T>(
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
 * Process items with early termination using memory-aware batching.
 * This reduces peak memory usage by processing items in smaller batches,
 * allowing garbage collection between batches.
 */
async function processWithEarlyTerminationBatched<T>(
	items: T[],
	processor: (item: T) => Promise<boolean>,
	concurrency = 10,
	batchSize = 20,
): Promise<boolean> {
	let shouldStop = false;

	for (let i = 0; i < items.length; i += batchSize) {
		if (shouldStop) {
			break;
		}

		const batch = items.slice(i, i + batchSize);
		const semaphore = new Semaphore(concurrency);

		const batchPromises = batch.map(async (item) => {
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

		const batchResults = await Promise.all(batchPromises);

		if (!batchResults.every((result) => result)) {
			return false;
		}

		// Force GC between batches if available to free memory immediately
		if (global.gc) {
			global.gc();
		}

		// Allow GC between batches by yielding to event loop
		await new Promise((resolve) => setImmediate(resolve));
	}

	return true;
}

/**
 * Map operation with parallel processing
 */
async function mapParallel<T, R>(
	items: T[],
	mapper: (item: T, index: number) => Promise<R>,
	concurrency = 10,
): Promise<R[]> {
	return processInParallel(
		items.map((item, index) => ({ item, index })),
		async ({ item, index }) => mapper(item, index),
		concurrency,
	);
}

/**
 * Filter operation with parallel processing
 */
async function filterParallel<T>(
	items: T[],
	predicate: (item: T) => Promise<boolean>,
	concurrency = 10,
): Promise<T[]> {
	const results = await mapParallel(
		items,
		async (item) => ({ item, keep: await predicate(item) }),
		concurrency,
	);

	return results.filter((result) => result.keep).map((result) => result.item);
}

/**
 * Partition items into groups for optimal parallel processing
 */
function partitionForProcessing<T>(
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

/**
 * Utilities for parallel processing and batching operations
 */
export const ParallelProcessor = {
	processInParallel,
	processInBatches,
	processWithEarlyTermination,
	processWithEarlyTerminationBatched,
	mapParallel,
	filterParallel,
	partitionForProcessing,
} as const;

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
	private available: number;
	private waiters: Array<() => void> = [];

	public constructor(capacity: number) {
		this.available = capacity;
	}

	public async acquire(): Promise<void> {
		if (this.available > 0) {
			this.available--;
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => {
			this.waiters.push(resolve);
		});
	}

	public release(): void {
		if (this.waiters.length > 0) {
			const waiter = this.waiters.shift();
			if (waiter) {
				waiter();
			}
		} else {
			this.available++;
		}
	}
}
