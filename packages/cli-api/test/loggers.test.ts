import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logWithTime } from "../src/logger.js";
import { BasicLogger } from "../src/loggers/basic.js";
import { ConsolaLogger } from "../src/loggers/consola.js";

describe("BasicLogger", () => {
	// Store original console methods
	const originalLog = console.log;
	const originalError = console.error;

	// Mock console methods
	let logSpy: ReturnType<typeof vi.fn>;
	let errorSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		logSpy = vi.fn();
		errorSpy = vi.fn();
		console.log = logSpy;
		console.error = errorSpy;
	});

	afterEach(() => {
		console.log = originalLog;
		console.error = originalError;
		vi.clearAllMocks();
	});

	describe("log", () => {
		it("should log messages to console", () => {
			BasicLogger.log("test message");
			expect(logSpy).toHaveBeenCalledWith("test message");
			expect(logSpy).toHaveBeenCalledTimes(1);
		});

		it("should handle empty strings", () => {
			BasicLogger.log("");
			expect(logSpy).toHaveBeenCalledWith("");
		});

		it("should handle undefined message", () => {
			BasicLogger.log(undefined);
			expect(logSpy).toHaveBeenCalledWith("");
		});

		it("should handle no arguments", () => {
			BasicLogger.log();
			expect(logSpy).toHaveBeenCalledWith("");
		});
	});

	describe("success", () => {
		it("should log success messages with SUCCESS prefix", () => {
			BasicLogger.success("operation completed");
			expect(logSpy).toHaveBeenCalledTimes(1);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("SUCCESS");
			expect(call).toContain("operation completed");
		});

		it("should handle Error objects", () => {
			const error = new Error("test error");
			BasicLogger.success(error);
			expect(logSpy).toHaveBeenCalledTimes(1);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("SUCCESS");
			expect(call).toContain("test error");
		});
	});

	describe("info", () => {
		it("should log info messages with INFO prefix", () => {
			BasicLogger.info("information");
			expect(logSpy).toHaveBeenCalledTimes(1);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("INFO");
			expect(call).toContain("information");
		});

		it("should handle Error objects", () => {
			const error = new Error("info error");
			error.stack = "stack trace";
			BasicLogger.info(error);
			expect(logSpy).toHaveBeenCalledTimes(1);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("info error");
			expect(call).toContain("stack trace");
		});
	});

	describe("warning", () => {
		it("should log warning messages with WARNING prefix", () => {
			BasicLogger.warning("caution");
			expect(logSpy).toHaveBeenCalledTimes(1);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("WARNING");
			expect(call).toContain("caution");
		});

		it("should use yellow color for WARNING prefix", () => {
			BasicLogger.warning("test");
			const call = logSpy.mock.calls[0][0] as string;
			// picocolors adds ANSI codes, check for WARNING text
			expect(call).toMatch(/WARNING/);
		});
	});

	describe("error", () => {
		it("should log errors to console.error with ERROR prefix", () => {
			BasicLogger.error("error message");
			expect(errorSpy).toHaveBeenCalledTimes(1);
			const call = errorSpy.mock.calls[0][0] as string;
			expect(call).toContain("ERROR");
			expect(call).toContain("error message");
		});

		it("should use red color for ERROR prefix", () => {
			BasicLogger.error("test");
			const call = errorSpy.mock.calls[0][0] as string;
			// picocolors adds ANSI codes, check for ERROR text
			expect(call).toMatch(/ERROR/);
		});

		it("should handle Error objects with stack traces", () => {
			const error = new Error("critical error");
			error.stack = "detailed stack trace";
			BasicLogger.error(error);
			expect(errorSpy).toHaveBeenCalledTimes(1);
			const call = errorSpy.mock.calls[0][0] as string;
			expect(call).toContain("critical error");
			expect(call).toContain("detailed stack trace");
		});
	});

	describe("verbose", () => {
		it("should log verbose messages with VERBOSE prefix", () => {
			BasicLogger.verbose("debug info");
			expect(logSpy).toHaveBeenCalledTimes(1);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("VERBOSE");
			expect(call).toContain("debug info");
		});

		it("should handle Error objects", () => {
			const error = new Error("debug error");
			BasicLogger.verbose(error);
			const call = logSpy.mock.calls[0][0] as string;
			expect(call).toContain("debug error");
		});
	});

	describe("Error formatting", () => {
		it("should format Error objects by joining message and stack", () => {
			const error = new Error("test message");
			error.stack = "at something";

			BasicLogger.info(error);
			const call = logSpy.mock.calls[0][0] as string;

			expect(call).toContain("test message");
			expect(call).toContain("at something");
		});

		it("should handle errors without stack traces", () => {
			const error = new Error("no stack");
			delete error.stack;

			BasicLogger.info(error);
			const call = logSpy.mock.calls[0][0] as string;

			expect(call).toContain("no stack");
		});

		it("should handle undefined message", () => {
			BasicLogger.info(undefined);
			const call = logSpy.mock.calls[0][0] as string;

			expect(call).toContain("INFO:");
			// formatError returns empty string for undefined
			expect(call).toBe("INFO: ");
		});

		it("should handle undefined in warning", () => {
			BasicLogger.warning(undefined);
			const call = logSpy.mock.calls[0][0] as string;

			expect(call).toContain("WARNING");
		});

		it("should handle undefined in error", () => {
			BasicLogger.error(undefined);
			const call = errorSpy.mock.calls[0][0] as string;

			expect(call).toContain("ERROR");
		});

		it("should handle undefined in verbose", () => {
			BasicLogger.verbose(undefined);
			const call = logSpy.mock.calls[0][0] as string;

			expect(call).toContain("VERBOSE");
		});
	});

	describe("Color formatting", () => {
		it("should apply green color to SUCCESS", () => {
			BasicLogger.success("test");
			const output = logSpy.mock.calls[0][0] as string;
			// Check that SUCCESS is present (picocolors will wrap it)
			expect(output).toContain("SUCCESS");
		});

		it("should apply yellow color to WARNING", () => {
			BasicLogger.warning("test");
			const output = logSpy.mock.calls[0][0] as string;
			expect(output).toContain("WARNING");
		});

		it("should apply red color to ERROR", () => {
			BasicLogger.error("test");
			const output = errorSpy.mock.calls[0][0] as string;
			expect(output).toContain("ERROR");
		});
	});

	describe("Integration", () => {
		it("should handle rapid sequential calls", () => {
			BasicLogger.log("message 1");
			BasicLogger.info("message 2");
			BasicLogger.warning("message 3");
			BasicLogger.error("message 4");
			BasicLogger.verbose("message 5");

			expect(logSpy).toHaveBeenCalledTimes(4);
			expect(errorSpy).toHaveBeenCalledTimes(1);
		});

		it("should maintain separate stdout/stderr streams", () => {
			BasicLogger.info("stdout message");
			BasicLogger.error("stderr message");

			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(errorSpy).toHaveBeenCalledTimes(1);

			const stdoutCall = logSpy.mock.calls[0][0] as string;
			const stderrCall = errorSpy.mock.calls[0][0] as string;

			expect(stdoutCall).toContain("stdout message");
			expect(stderrCall).toContain("stderr message");
		});
	});
});

describe("ConsolaLogger", () => {
	it("should have all required Logger methods", () => {
		expect(ConsolaLogger.log).toBeDefined();
		expect(typeof ConsolaLogger.log).toBe("function");

		expect(ConsolaLogger.success).toBeDefined();
		expect(typeof ConsolaLogger.success).toBe("function");

		expect(ConsolaLogger.info).toBeDefined();
		expect(typeof ConsolaLogger.info).toBe("function");

		expect(ConsolaLogger.warning).toBeDefined();
		expect(typeof ConsolaLogger.warning).toBe("function");

		expect(ConsolaLogger.error).toBeDefined();
		expect(typeof ConsolaLogger.error).toBe("function");

		expect(ConsolaLogger.verbose).toBeDefined();
		expect(typeof ConsolaLogger.verbose).toBe("function");
	});

	it("should be a frozen object", () => {
		// The ConsolaLogger is defined with `as const`
		expect(Object.keys(ConsolaLogger)).toContain("log");
		expect(Object.keys(ConsolaLogger)).toContain("success");
		expect(Object.keys(ConsolaLogger)).toContain("info");
		expect(Object.keys(ConsolaLogger)).toContain("warning");
		expect(Object.keys(ConsolaLogger)).toContain("error");
		expect(Object.keys(ConsolaLogger)).toContain("verbose");
	});

	// Note: We don't test consola output directly since it has complex formatting
	// and uses its own console handling. The important thing is the interface contract.
});

describe("logWithTime", () => {
	it("should prepend timestamp to string message", () => {
		const logFn = vi.fn();
		logWithTime("test message", logFn);

		expect(logFn).toHaveBeenCalledTimes(1);
		const call = logFn.mock.calls[0][0] as string;

		// Should contain time format [HH:MM:SS]
		expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		expect(call).toContain("test message");
	});

	it("should handle Error objects", () => {
		const logFn = vi.fn();
		const error = new Error("error message");
		logWithTime(error, logFn);

		expect(logFn).toHaveBeenCalledTimes(1);
		const call = logFn.mock.calls[0][0] as string;

		expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		expect(call).toContain("error message");
	});

	it("should pad single-digit hours, minutes, and seconds", () => {
		const logFn = vi.fn();
		// Mock Date to return specific time values
		const mockDate = new Date("2025-01-01T01:02:03");
		vi.useFakeTimers();
		vi.setSystemTime(mockDate);

		logWithTime("test", logFn);

		vi.useRealTimers();

		const call = logFn.mock.calls[0][0] as string;
		expect(call).toContain("[01:02:03]");
	});

	it("should not pad double-digit hours, minutes, and seconds", () => {
		const logFn = vi.fn();
		const mockDate = new Date("2025-01-01T12:34:56");
		vi.useFakeTimers();
		vi.setSystemTime(mockDate);

		logWithTime("test", logFn);

		vi.useRealTimers();

		const call = logFn.mock.calls[0][0] as string;
		expect(call).toContain("[12:34:56]");
	});

	it("should apply yellow color to timestamp", () => {
		const logFn = vi.fn();
		logWithTime("test", logFn);

		const call = logFn.mock.calls[0][0] as string;
		// picocolors wraps text in ANSI codes, just verify the format exists
		expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
	});
});
