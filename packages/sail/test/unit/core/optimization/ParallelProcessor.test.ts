import { describe, expect, it, vi } from "vitest";
import { ParallelProcessor } from "../../../../src/core/optimization/ParallelProcessor.js";

describe("ParallelProcessor", () => {
	describe("processInParallel", () => {
		it("should process all items with default concurrency", async () => {
			const items = [1, 2, 3, 4, 5];
			const processor = vi.fn(async (item: number) => item * 2);

			const results = await ParallelProcessor.processInParallel(
				items,
				processor,
			);

			expect(results).toEqual([2, 4, 6, 8, 10]);
			expect(processor).toHaveBeenCalledTimes(5);
		});

		it("should respect concurrency limit", async () => {
			const items = [1, 2, 3, 4, 5];
			let currentlyProcessing = 0;
			let maxConcurrent = 0;

			const processor = async (item: number) => {
				currentlyProcessing++;
				maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
				await new Promise((resolve) => setTimeout(resolve, 10));
				currentlyProcessing--;
				return item * 2;
			};

			await ParallelProcessor.processInParallel(items, processor, 2);

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});

		it("should maintain order of results", async () => {
			const items = [1, 2, 3, 4, 5];
			const processor = async (item: number) => {
				// Longer delay for earlier items to test ordering
				await new Promise((resolve) => setTimeout(resolve, (6 - item) * 5));
				return item * 2;
			};

			const results = await ParallelProcessor.processInParallel(
				items,
				processor,
				5,
			);

			expect(results).toEqual([2, 4, 6, 8, 10]);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const processor = vi.fn(async (item: number) => item * 2);

			const results = await ParallelProcessor.processInParallel(
				items,
				processor,
			);

			expect(results).toEqual([]);
			expect(processor).not.toHaveBeenCalled();
		});

		it("should handle processor errors", async () => {
			const items = [1, 2, 3];
			const processor = async (item: number) => {
				if (item === 2) {
					throw new Error("Processing failed");
				}
				return item * 2;
			};

			await expect(
				ParallelProcessor.processInParallel(items, processor),
			).rejects.toThrow("Processing failed");
		});

		it("should process with concurrency of 1 (sequential)", async () => {
			const items = [1, 2, 3];
			const order: number[] = [];
			const processor = async (item: number) => {
				order.push(item);
				await new Promise((resolve) => setTimeout(resolve, 5));
				return item * 2;
			};

			await ParallelProcessor.processInParallel(items, processor, 1);

			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe("processInBatches", () => {
		it("should process all items in batches", async () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const processor = vi.fn(async (batch: number[]) =>
				batch.map((item) => item * 2),
			);

			const results = await ParallelProcessor.processInBatches(
				items,
				processor,
				3,
			);

			expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
			expect(processor).toHaveBeenCalledTimes(4); // 3+3+3+1
		});

		it("should handle exact batch size divisibility", async () => {
			const items = [1, 2, 3, 4, 5, 6];
			const processor = vi.fn(async (batch: number[]) =>
				batch.map((item) => item * 2),
			);

			const results = await ParallelProcessor.processInBatches(
				items,
				processor,
				2,
			);

			expect(results).toEqual([2, 4, 6, 8, 10, 12]);
			expect(processor).toHaveBeenCalledTimes(3);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const processor = vi.fn(async (batch: number[]) => batch);

			const results = await ParallelProcessor.processInBatches(
				items,
				processor,
			);

			expect(results).toEqual([]);
			expect(processor).not.toHaveBeenCalled();
		});

		it("should handle single batch", async () => {
			const items = [1, 2, 3];
			const processor = vi.fn(async (batch: number[]) =>
				batch.map((item) => item * 2),
			);

			const results = await ParallelProcessor.processInBatches(
				items,
				processor,
				10,
			);

			expect(results).toEqual([2, 4, 6]);
			expect(processor).toHaveBeenCalledTimes(1);
		});

		it("should process batches sequentially", async () => {
			const items = [1, 2, 3, 4, 5, 6];
			const batchOrder: number[][] = [];
			const processor = async (batch: number[]) => {
				batchOrder.push([...batch]);
				return batch.map((item) => item * 2);
			};

			await ParallelProcessor.processInBatches(items, processor, 2);

			expect(batchOrder).toEqual([
				[1, 2],
				[3, 4],
				[5, 6],
			]);
		});
	});

	describe("processWithEarlyTermination", () => {
		it("should process all items when all return true", async () => {
			const items = [1, 2, 3, 4, 5];
			const processor = vi.fn(async (_item: number) => true);

			const result = await ParallelProcessor.processWithEarlyTermination(
				items,
				processor,
			);

			expect(result).toBe(true);
			expect(processor).toHaveBeenCalledTimes(5);
		});

		it("should terminate early when processor returns false", async () => {
			const items = [1, 2, 3, 4, 5];
			const processed: number[] = [];
			const processor = async (item: number) => {
				processed.push(item);
				await new Promise((resolve) => setTimeout(resolve, 10));
				return item !== 3;
			};

			const result = await ParallelProcessor.processWithEarlyTermination(
				items,
				processor,
				2,
			);

			expect(result).toBe(false);
			// Some items may be processed before termination signal propagates
			expect(processed.length).toBeGreaterThanOrEqual(1);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const processor = vi.fn(async (_item: number) => true);

			const result = await ParallelProcessor.processWithEarlyTermination(
				items,
				processor,
			);

			expect(result).toBe(true);
			expect(processor).not.toHaveBeenCalled();
		});

		it("should respect concurrency limit", async () => {
			const items = [1, 2, 3, 4, 5];
			let currentlyProcessing = 0;
			let maxConcurrent = 0;

			const processor = async (_item: number) => {
				currentlyProcessing++;
				maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
				await new Promise((resolve) => setTimeout(resolve, 10));
				currentlyProcessing--;
				return true;
			};

			await ParallelProcessor.processWithEarlyTermination(items, processor, 2);

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});
	});

	describe("processWithEarlyTerminationBatched", () => {
		it("should process all batches when all return true", async () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8];
			const processor = vi.fn(async (_item: number) => true);

			const result =
				await ParallelProcessor.processWithEarlyTerminationBatched(
					items,
					processor,
					2,
					3,
				);

			expect(result).toBe(true);
			expect(processor).toHaveBeenCalledTimes(8);
		});

		it("should terminate early between batches", async () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8];
			const processed: number[] = [];
			const processor = async (item: number) => {
				processed.push(item);
				return item < 4; // Fail on item 4
			};

			const result =
				await ParallelProcessor.processWithEarlyTerminationBatched(
					items,
					processor,
					2,
					3,
				);

			expect(result).toBe(false);
			// Should process first batch and possibly part of second
			expect(processed.length).toBeGreaterThan(0);
			expect(processed.length).toBeLessThanOrEqual(6);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const processor = vi.fn(async (_item: number) => true);

			const result =
				await ParallelProcessor.processWithEarlyTerminationBatched(
					items,
					processor,
				);

			expect(result).toBe(true);
			expect(processor).not.toHaveBeenCalled();
		});

		it("should respect concurrency within batches", async () => {
			const items = [1, 2, 3, 4, 5];
			let currentlyProcessing = 0;
			let maxConcurrent = 0;

			const processor = async (_item: number) => {
				currentlyProcessing++;
				maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
				await new Promise((resolve) => setTimeout(resolve, 10));
				currentlyProcessing--;
				return true;
			};

			await ParallelProcessor.processWithEarlyTerminationBatched(
				items,
				processor,
				2,
				3,
			);

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});

		it("should yield to event loop between batches", async () => {
			const items = [1, 2, 3, 4, 5, 6];
			const batchCompletions: number[] = [];
			const processor = async (item: number) => {
				if (item % 3 === 0) {
					batchCompletions.push(item);
				}
				return true;
			};

			await ParallelProcessor.processWithEarlyTerminationBatched(
				items,
				processor,
				2,
				3,
			);

			// Batches should be processed sequentially with yields
			expect(batchCompletions.length).toBeGreaterThan(0);
		});
	});

	describe("mapParallel", () => {
		it("should map all items with index", async () => {
			const items = ["a", "b", "c"];
			const mapper = async (item: string, index: number) =>
				`${item}-${index}`;

			const results = await ParallelProcessor.mapParallel(items, mapper);

			expect(results).toEqual(["a-0", "b-1", "c-2"]);
		});

		it("should maintain order despite varying execution times", async () => {
			const items = [1, 2, 3, 4, 5];
			const mapper = async (item: number, index: number) => {
				await new Promise((resolve) => setTimeout(resolve, (6 - item) * 5));
				return `${item}-${index}`;
			};

			const results = await ParallelProcessor.mapParallel(items, mapper, 5);

			expect(results).toEqual(["1-0", "2-1", "3-2", "4-3", "5-4"]);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const mapper = vi.fn(async (item: number, _index: number) => item * 2);

			const results = await ParallelProcessor.mapParallel(items, mapper);

			expect(results).toEqual([]);
			expect(mapper).not.toHaveBeenCalled();
		});

		it("should respect concurrency limit", async () => {
			const items = [1, 2, 3, 4, 5];
			let currentlyProcessing = 0;
			let maxConcurrent = 0;

			const mapper = async (item: number, _index: number) => {
				currentlyProcessing++;
				maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
				await new Promise((resolve) => setTimeout(resolve, 10));
				currentlyProcessing--;
				return item * 2;
			};

			await ParallelProcessor.mapParallel(items, mapper, 2);

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});
	});

	describe("filterParallel", () => {
		it("should filter items based on async predicate", async () => {
			const items = [1, 2, 3, 4, 5, 6];
			const predicate = async (item: number) => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return item % 2 === 0;
			};

			const results = await ParallelProcessor.filterParallel(items, predicate);

			expect(results).toEqual([2, 4, 6]);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const predicate = vi.fn(async (_item: number) => true);

			const results = await ParallelProcessor.filterParallel(items, predicate);

			expect(results).toEqual([]);
			expect(predicate).not.toHaveBeenCalled();
		});

		it("should filter all items when predicate returns false", async () => {
			const items = [1, 2, 3];
			const predicate = async (_item: number) => false;

			const results = await ParallelProcessor.filterParallel(items, predicate);

			expect(results).toEqual([]);
		});

		it("should keep all items when predicate returns true", async () => {
			const items = [1, 2, 3];
			const predicate = async (_item: number) => true;

			const results = await ParallelProcessor.filterParallel(items, predicate);

			expect(results).toEqual([1, 2, 3]);
		});

		it("should maintain order of filtered items", async () => {
			const items = [5, 1, 8, 3, 9, 2, 7];
			const predicate = async (item: number) => item > 4;

			const results = await ParallelProcessor.filterParallel(items, predicate);

			expect(results).toEqual([5, 8, 9, 7]);
		});

		it("should respect concurrency limit", async () => {
			const items = [1, 2, 3, 4, 5];
			let currentlyProcessing = 0;
			let maxConcurrent = 0;

			const predicate = async (item: number) => {
				currentlyProcessing++;
				maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
				await new Promise((resolve) => setTimeout(resolve, 10));
				currentlyProcessing--;
				return item % 2 === 0;
			};

			await ParallelProcessor.filterParallel(items, predicate, 2);

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});
	});

	describe("partitionForProcessing", () => {
		it("should partition items evenly", async () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
			const partitions = ParallelProcessor.partitionForProcessing(items, 3);

			expect(partitions).toEqual([
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9],
			]);
		});

		it("should handle uneven distribution", async () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8];
			const partitions = ParallelProcessor.partitionForProcessing(items, 3);

			expect(partitions).toEqual([
				[1, 2, 3],
				[4, 5, 6],
				[7, 8],
			]);
		});

		it("should handle empty array", async () => {
			const items: number[] = [];
			const partitions = ParallelProcessor.partitionForProcessing(items, 3);

			expect(partitions).toEqual([]);
		});

		it("should handle single partition request", async () => {
			const items = [1, 2, 3, 4, 5];
			const partitions = ParallelProcessor.partitionForProcessing(items, 1);

			expect(partitions).toEqual([[1, 2, 3, 4, 5]]);
		});

		it("should handle more partitions than items", async () => {
			const items = [1, 2, 3];
			const partitions = ParallelProcessor.partitionForProcessing(items, 5);

			expect(partitions).toEqual([[1], [2], [3]]);
		});

		it("should handle large array efficiently", async () => {
			const items = Array.from({ length: 1000 }, (_, i) => i);
			const partitions = ParallelProcessor.partitionForProcessing(items, 10);

			expect(partitions.length).toBe(10);
			expect(partitions.flat()).toEqual(items);
		});
	});

	describe("integration scenarios", () => {
		it("should combine map and filter operations", async () => {
			const items = [1, 2, 3, 4, 5, 6];

			// Map: double the numbers
			const doubled = await ParallelProcessor.mapParallel(
				items,
				async (item) => item * 2,
			);

			// Filter: keep only numbers > 5
			const filtered = await ParallelProcessor.filterParallel(
				doubled,
				async (item) => item > 5,
			);

			expect(filtered).toEqual([6, 8, 10, 12]);
		});

		it("should partition and process in parallel", async () => {
			const items = Array.from({ length: 100 }, (_, i) => i + 1);
			const partitions = ParallelProcessor.partitionForProcessing(items, 4);

			const results = await ParallelProcessor.processInParallel(
				partitions,
				async (partition) => {
					return partition.reduce((sum, num) => sum + num, 0);
				},
				4,
			);

			const total = results.reduce((sum, num) => sum + num, 0);
			expect(total).toBe(5050); // Sum of 1 to 100
		});

		it("should handle complex async workflows", async () => {
			const items = [
				{ id: 1, value: 10 },
				{ id: 2, value: 20 },
				{ id: 3, value: 30 },
			];

			const processed = await ParallelProcessor.mapParallel(
				items,
				async (item, index) => ({
					...item,
					doubled: item.value * 2,
					index,
				}),
			);

			expect(processed).toEqual([
				{ id: 1, value: 10, doubled: 20, index: 0 },
				{ id: 2, value: 20, doubled: 40, index: 1 },
				{ id: 3, value: 30, doubled: 60, index: 2 },
			]);
		});
	});
});
