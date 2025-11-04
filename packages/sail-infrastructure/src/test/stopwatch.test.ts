import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Stopwatch } from "../stopwatch.js";

describe("Stopwatch", () => {
	let mockLogFunc: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockLogFunc = vi.fn();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("constructor", () => {
		it("should create stopwatch with enabled=true", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);
			expect(stopwatch).toBeInstanceOf(Stopwatch);
		});

		it("should create stopwatch with enabled=false", () => {
			const stopwatch = new Stopwatch(false, mockLogFunc);
			expect(stopwatch).toBeInstanceOf(Stopwatch);
		});

		it("should use custom log function", () => {
			const customLog = vi.fn();
			const stopwatch = new Stopwatch(true, customLog);
			stopwatch.log("test", true);
			expect(customLog).toHaveBeenCalled();
		});
	});

	describe("log method", () => {
		describe("when enabled", () => {
			it("should log message with milliseconds for time < 100ms", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				// Advance time by 50ms
				vi.advanceTimersByTime(50);
				stopwatch.log("test message");

				expect(mockLogFunc).toHaveBeenCalledWith("test message - 50ms");
			});

			it("should log message with seconds for time >= 100ms", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				// Advance time by 1500ms
				vi.advanceTimersByTime(1500);
				stopwatch.log("test message");

				expect(mockLogFunc).toHaveBeenCalledWith("test message - 1.500s");
			});

			it("should format seconds with 3 decimal places", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				// Advance time by 1234ms
				vi.advanceTimersByTime(1234);
				stopwatch.log("test");

				expect(mockLogFunc).toHaveBeenCalledWith("test - 1.234s");
			});

			it("should not log when message is undefined", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				vi.advanceTimersByTime(100);
				stopwatch.log(undefined);

				expect(mockLogFunc).not.toHaveBeenCalled();
			});
		});

		describe("when disabled", () => {
			it("should not log message by default", () => {
				const stopwatch = new Stopwatch(false, mockLogFunc);

				vi.advanceTimersByTime(100);
				stopwatch.log("test message");

				expect(mockLogFunc).not.toHaveBeenCalled();
			});

			it("should log message when print=true", () => {
				const stopwatch = new Stopwatch(false, mockLogFunc);

				vi.advanceTimersByTime(100);
				stopwatch.log("test message", true);

				expect(mockLogFunc).toHaveBeenCalledWith("test message");
			});

			it("should log message without timestamp when print=true", () => {
				const stopwatch = new Stopwatch(false, mockLogFunc);

				vi.advanceTimersByTime(1500);
				stopwatch.log("test message", true);

				// Should not include timing info when disabled
				expect(mockLogFunc).toHaveBeenCalledWith("test message");
				expect(mockLogFunc).not.toHaveBeenCalledWith(
					expect.stringContaining("1.500s"),
				);
			});

			it("should not log when message is undefined even with print=true", () => {
				const stopwatch = new Stopwatch(false, mockLogFunc);

				vi.advanceTimersByTime(100);
				stopwatch.log(undefined, true);

				expect(mockLogFunc).not.toHaveBeenCalled();
			});
		});

		describe("return value", () => {
			it("should return time in seconds", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				vi.advanceTimersByTime(2500);
				const result = stopwatch.log("test");

				expect(result).toBe(2.5);
			});

			it("should return time in seconds for small durations", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				vi.advanceTimersByTime(50);
				const result = stopwatch.log("test");

				expect(result).toBe(0.05);
			});
		});

		describe("time tracking between calls", () => {
			it("should track time between successive log calls", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				vi.advanceTimersByTime(150);
				stopwatch.log("first");
				// First call should show 0.150s
				expect(mockLogFunc.mock.calls[0][0]).toContain("first");
				expect(mockLogFunc.mock.calls[0][0]).toMatch(/0\.\d{3}s/);

				vi.advanceTimersByTime(200);
				stopwatch.log("second");
				// Second call should show 0.200s
				expect(mockLogFunc.mock.calls[1][0]).toContain("second");
				expect(mockLogFunc.mock.calls[1][0]).toMatch(/0\.\d{3}s/);

				vi.advanceTimersByTime(50);
				stopwatch.log("third");
				// Third call should show 50ms
				expect(mockLogFunc.mock.calls[2][0]).toContain("third");
				expect(mockLogFunc.mock.calls[2][0]).toMatch(/\d+ms/);
			});

			it("should reset time tracking after each log call", () => {
				const stopwatch = new Stopwatch(true, mockLogFunc);

				// First interval
				vi.advanceTimersByTime(300);
				stopwatch.log("first");

				// Second interval should start from the first log call
				vi.advanceTimersByTime(150);
				stopwatch.log("second");

				expect(mockLogFunc.mock.calls[1][0]).toBe("second - 0.150s");
			});
		});
	});

	describe("getTotalTime method", () => {
		it("should return 0 initially", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);
			expect(stopwatch.getTotalTime()).toBe(0);
		});

		it("should accumulate time across log calls", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			vi.advanceTimersByTime(100);
			stopwatch.log("first");

			vi.advanceTimersByTime(200);
			stopwatch.log("second");

			vi.advanceTimersByTime(300);
			stopwatch.log("third");

			expect(stopwatch.getTotalTime()).toBe(600);
		});

		it("should track time even when logging is disabled", () => {
			const stopwatch = new Stopwatch(false, mockLogFunc);

			vi.advanceTimersByTime(100);
			stopwatch.log("test");

			expect(stopwatch.getTotalTime()).toBe(100);
		});

		it("should track time even when message is undefined", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			vi.advanceTimersByTime(100);
			stopwatch.log(undefined);

			vi.advanceTimersByTime(200);
			stopwatch.log(undefined);

			expect(stopwatch.getTotalTime()).toBe(300);
		});

		it("should continue accumulating after getTotalTime is called", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			vi.advanceTimersByTime(100);
			stopwatch.log("first");
			expect(stopwatch.getTotalTime()).toBe(100);

			vi.advanceTimersByTime(200);
			stopwatch.log("second");
			expect(stopwatch.getTotalTime()).toBe(300);
		});
	});

	describe("edge cases", () => {
		it("should handle rapid successive calls", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			vi.advanceTimersByTime(1);
			stopwatch.log("first");

			vi.advanceTimersByTime(1);
			stopwatch.log("second");

			vi.advanceTimersByTime(1);
			stopwatch.log("third");

			expect(mockLogFunc).toHaveBeenCalledTimes(3);
			expect(stopwatch.getTotalTime()).toBe(3);
		});

		it("should handle zero time elapsed", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			// Don't advance time
			const result = stopwatch.log("test");

			expect(result).toBe(0);
			expect(mockLogFunc).toHaveBeenCalledWith("test - 0ms");
		});

		it("should handle exactly 100ms boundary", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			vi.advanceTimersByTime(100);
			stopwatch.log("test");

			// 100ms should use seconds format (0.100s)
			const call = mockLogFunc.mock.calls[0][0];
			expect(call).toContain("test");
			expect(call).toContain("0.100s");
		});

		it("should handle exactly 99ms", () => {
			const stopwatch = new Stopwatch(true, mockLogFunc);

			vi.advanceTimersByTime(99);
			stopwatch.log("test");

			// 99ms should use milliseconds format
			expect(mockLogFunc).toHaveBeenCalledWith("test - 99ms");
		});
	});
});
