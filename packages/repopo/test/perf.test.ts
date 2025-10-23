import { run } from "effection";
import { describe, expect, it } from "vitest";
import { type PolicyHandlerPerfStats, runWithPerf } from "../src/perf.js";

describe("Performance Utilities", () => {
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
