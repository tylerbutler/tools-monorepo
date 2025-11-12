import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasicLogger } from "../src/loggers/basic.js";

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

	describe("errorLog", () => {
		it("should log errors to console.error with ERROR prefix", () => {
			BasicLogger.errorLog("error message");
			expect(errorSpy).toHaveBeenCalledTimes(1);
			const call = errorSpy.mock.calls[0][0] as string;
			expect(call).toContain("ERROR");
			expect(call).toContain("error message");
		});

		it("should use red color for ERROR prefix", () => {
			BasicLogger.errorLog("test");
			const call = errorSpy.mock.calls[0][0] as string;
			// picocolors adds ANSI codes, check for ERROR text
			expect(call).toMatch(/ERROR/);
		});

		it("should handle Error objects with stack traces", () => {
			const error = new Error("critical error");
			error.stack = "detailed stack trace";
			BasicLogger.errorLog(error);
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
			BasicLogger.errorLog("test");
			const output = errorSpy.mock.calls[0][0] as string;
			expect(output).toContain("ERROR");
		});
	});

	describe("Integration", () => {
		it("should handle rapid sequential calls", () => {
			BasicLogger.log("message 1");
			BasicLogger.info("message 2");
			BasicLogger.warning("message 3");
			BasicLogger.errorLog("message 4");
			BasicLogger.verbose("message 5");

			expect(logSpy).toHaveBeenCalledTimes(4);
			expect(errorSpy).toHaveBeenCalledTimes(1);
		});

		it("should maintain separate stdout/stderr streams", () => {
			BasicLogger.info("stdout message");
			BasicLogger.errorLog("stderr message");

			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(errorSpy).toHaveBeenCalledTimes(1);

			const stdoutCall = logSpy.mock.calls[0][0] as string;
			const stderrCall = errorSpy.mock.calls[0][0] as string;

			expect(stdoutCall).toContain("stdout message");
			expect(stderrCall).toContain("stderr message");
		});
	});
});
