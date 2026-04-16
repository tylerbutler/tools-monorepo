import { run } from "effection";
import { describe, expect, it, vi } from "vitest";
import {
	logStats,
	newPerfStats,
	type PolicyHandlerPerfStats,
	runWithPerf,
} from "../src/perf.js";

describe("Performance Utilities", () => {
	describe("newPerfStats", () => {
		it("should create an empty stats object", () => {
			const stats = newPerfStats();

			expect(stats.count).toBe(0);
			expect(stats.processed).toBe(0);
			expect(stats.data).toBeInstanceOf(Map);
			expect(stats.data.size).toBe(0);
		});

		it("should create independent stats objects", () => {
			const stats1 = newPerfStats();
			const stats2 = newPerfStats();

			stats1.count = 5;
			stats1.data.set("handle", new Map([["TestPolicy", 100]]));

			expect(stats2.count).toBe(0);
			expect(stats2.data.size).toBe(0);
		});
	});

	describe("logStats", () => {
		function createMockLogger() {
			const mockLog = vi.fn();
			return {
				log: mockLog,
				success: vi.fn(),
				info: vi.fn(),
				warning: vi.fn(),
				error: vi.fn(),
				verbose: vi.fn(),
			};
		}

		it("should log statistics summary", () => {
			const logger = createMockLogger();

			const stats: PolicyHandlerPerfStats = {
				count: 10,
				processed: 7,
				data: new Map(),
			};

			logStats(stats, logger);

			expect(logger.log).toHaveBeenCalledWith(
				"Statistics: 7 files processed, 3 excluded, 10 total",
			);
		});

		it("should log performance data for each action and handler", () => {
			const logger = createMockLogger();

			const handleMap = new Map<string, number>([
				["Policy1", 150],
				["Policy2", 200],
			]);
			const resolveMap = new Map<string, number>([["Policy1", 50]]);

			const stats: PolicyHandlerPerfStats = {
				count: 5,
				processed: 5,
				data: new Map([
					["handle", handleMap],
					["resolve", resolveMap],
				]),
			};

			logStats(stats, logger);

			// Summary
			expect(logger.log).toHaveBeenCalledWith(
				"Statistics: 5 files processed, 0 excluded, 5 total",
			);

			// Handle action header and entries
			expect(logger.log).toHaveBeenCalledWith('Performance for "handle":');
			expect(logger.log).toHaveBeenCalledWith("    Policy1: 150ms");
			expect(logger.log).toHaveBeenCalledWith("    Policy2: 200ms");

			// Resolve action header and entries
			expect(logger.log).toHaveBeenCalledWith('Performance for "resolve":');
			expect(logger.log).toHaveBeenCalledWith("    Policy1: 50ms");
		});

		it("should handle empty performance data", () => {
			const logger = createMockLogger();

			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			logStats(stats, logger);

			expect(logger.log).toHaveBeenCalledTimes(1);
			expect(logger.log).toHaveBeenCalledWith(
				"Statistics: 0 files processed, 0 excluded, 0 total",
			);
		});
	});

	describe("runWithPerf", () => {
		it("should track execution time for handle action", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			const result = await run(() =>
				runWithPerf("TestPolicy", "handle", stats, function* () {
					// Simulate some work
					yield* (function* () {
						// Small delay simulation
					})();
					return "test-result";
				}),
			);

			expect(result).toBe("test-result");
			expect(stats.data.has("handle")).toBe(true);

			const handleMap = stats.data.get("handle");
			expect(handleMap?.has("TestPolicy")).toBe(true);

			const duration = handleMap?.get("TestPolicy");
			expect(duration).toBeGreaterThanOrEqual(0);
		});

		it("should track execution time for resolve action", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			const result = await run(() =>
				runWithPerf("TestPolicy", "resolve", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "resolved";
				}),
			);

			expect(result).toBe("resolved");
			expect(stats.data.has("resolve")).toBe(true);

			const resolveMap = stats.data.get("resolve");
			expect(resolveMap?.has("TestPolicy")).toBe(true);
		});

		it("should accumulate time for multiple invocations", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			// First invocation
			await run(() =>
				runWithPerf("TestPolicy", "handle", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "result1";
				}),
			);

			const firstDuration = stats.data.get("handle")?.get("TestPolicy") ?? 0;
			expect(firstDuration).toBeGreaterThanOrEqual(0);

			// Second invocation
			await run(() =>
				runWithPerf("TestPolicy", "handle", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "result2";
				}),
			);

			const secondDuration = stats.data.get("handle")?.get("TestPolicy") ?? 0;
			expect(secondDuration).toBeGreaterThanOrEqual(firstDuration);
		});

		it("should track different policies separately", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			await run(() =>
				runWithPerf("Policy1", "handle", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "result1";
				}),
			);

			await run(() =>
				runWithPerf("Policy2", "handle", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "result2";
				}),
			);

			const handleMap = stats.data.get("handle");
			expect(handleMap?.has("Policy1")).toBe(true);
			expect(handleMap?.has("Policy2")).toBe(true);
			expect(handleMap?.get("Policy1")).toBeGreaterThanOrEqual(0);
			expect(handleMap?.get("Policy2")).toBeGreaterThanOrEqual(0);
		});

		it("should track handle and resolve actions separately", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			await run(() =>
				runWithPerf("TestPolicy", "handle", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "handled";
				}),
			);

			await run(() =>
				runWithPerf("TestPolicy", "resolve", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return "resolved";
				}),
			);

			expect(stats.data.has("handle")).toBe(true);
			expect(stats.data.has("resolve")).toBe(true);

			const handleMap = stats.data.get("handle");
			const resolveMap = stats.data.get("resolve");

			expect(handleMap?.has("TestPolicy")).toBe(true);
			expect(resolveMap?.has("TestPolicy")).toBe(true);
		});

		it("should propagate errors from the operation", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			await expect(
				run(() =>
					runWithPerf("TestPolicy", "handle", stats, function* () {
						yield* (function* () {
							// Minimal yield to satisfy generator requirements
						})();
						throw new Error("Test error");
					}),
				),
			).rejects.toThrow("Test error");

			// Note: When an error is thrown before the operation completes,
			// the performance tracking may not be finalized. This is expected behavior.
			// The important part is that the error propagates correctly.
		});

		it("should return complex objects from the operation", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			const complexResult = {
				name: "TestPolicy",
				file: "test.ts",
				resolved: true,
				errorMessage: "Fixed",
			};

			const result = await run(() =>
				runWithPerf("TestPolicy", "handle", stats, function* () {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					return complexResult;
				}),
			);

			expect(result).toEqual(complexResult);
		});

		it("should work with nested generator operations", async () => {
			const stats: PolicyHandlerPerfStats = {
				count: 0,
				processed: 0,
				data: new Map(),
			};

			const result = await run(() =>
				runWithPerf("TestPolicy", "handle", stats, function* () {
					const intermediate = yield* (function* () {
						yield* (function* () {
							// Minimal yield to satisfy generator requirements
						})();
						return "intermediate";
					})();

					const final = yield* (function* () {
						yield* (function* () {
							// Minimal yield to satisfy generator requirements
						})();
						return `${intermediate}-final`;
					})();

					return final;
				}),
			);

			expect(result).toBe("intermediate-final");
			expect(stats.data.get("handle")?.has("TestPolicy")).toBe(true);
		});
	});
});
