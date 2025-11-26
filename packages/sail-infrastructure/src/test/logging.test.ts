import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
	ErrorLoggingFunction,
	Logger,
	LoggingFunction,
} from "../logging.js";
import { defaultLogger } from "../logging.js";

describe("logging", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe("defaultLogger", () => {
		it("should have all required methods", () => {
			expect(defaultLogger).toHaveProperty("log");
			expect(defaultLogger).toHaveProperty("info");
			expect(defaultLogger).toHaveProperty("warning");
			expect(defaultLogger).toHaveProperty("error");
			expect(defaultLogger).toHaveProperty("verbose");
		});

		it("should implement Logger interface", () => {
			const logger: Logger = defaultLogger;
			expect(logger).toBeDefined();
		});
	});

	describe("log method", () => {
		it("should log a message with timestamp", () => {
			defaultLogger.log("test message");

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("test message");
			// Check for timestamp format [HH:MM:SS]
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});

		it("should handle undefined message", () => {
			defaultLogger.log(undefined);

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});
	});

	describe("info method", () => {
		it("should log info message with INFO prefix", () => {
			defaultLogger.info("info message");

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("INFO: info message");
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});

		it("should handle Error objects", () => {
			const error = new Error("test error");
			defaultLogger.info(error);

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("INFO:");
			expect(call).toContain("Error: test error");
		});

		it("should handle undefined message", () => {
			defaultLogger.info(undefined);

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("INFO: undefined");
		});
	});

	describe("warning method", () => {
		it("should log warning message with WARNING prefix", () => {
			defaultLogger.warning("warning message");

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("WARNING");
			expect(call).toContain("warning message");
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});

		it("should handle Error objects", () => {
			const error = new Error("warning error");
			defaultLogger.warning(error);

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("WARNING");
			expect(call).toContain("Error: warning error");
		});
	});

	describe("error method", () => {
		it("should log error message with ERROR prefix to stderr", () => {
			defaultLogger.error("error message");

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0][0];
			expect(call).toContain("ERROR");
			expect(call).toContain("error message");
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});

		it("should handle Error objects", () => {
			const error = new Error("critical error");
			defaultLogger.error(error);

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0][0];
			expect(call).toContain("ERROR");
			expect(call).toContain("Error: critical error");
		});

		it("should use console.error instead of console.log", () => {
			defaultLogger.error("error");

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});
	});

	describe("verbose method", () => {
		it("should log verbose message with VERBOSE prefix", () => {
			defaultLogger.verbose("verbose message");

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("VERBOSE: verbose message");
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});

		it("should handle Error objects", () => {
			const error = new Error("verbose error");
			defaultLogger.verbose(error);

			expect(consoleLogSpy).toHaveBeenCalledOnce();
			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("VERBOSE:");
			expect(call).toContain("Error: verbose error");
		});
	});

	describe("timestamp formatting", () => {
		it("should include timestamp in expected format", () => {
			defaultLogger.log("test");

			const call = consoleLogSpy.mock.calls[0][0];
			// Check for timestamp format [HH:MM:SS] with any digits
			expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
			expect(call).toContain("test");
		});

		it("should format timestamps consistently", () => {
			defaultLogger.log("message1");
			defaultLogger.log("message2");

			const call1 = consoleLogSpy.mock.calls[0][0];
			const call2 = consoleLogSpy.mock.calls[1][0];

			// Both should have timestamp format
			expect(call1).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
			expect(call2).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
		});
	});

	describe("type definitions", () => {
		it("ErrorLoggingFunction should accept string, Error, or undefined", () => {
			const func: ErrorLoggingFunction = (msg, ..._args) => {
				// Type check - should compile
				const _str: string | Error | undefined = msg;
			};
			expect(func).toBeDefined();
		});

		it("LoggingFunction should accept optional string", () => {
			const func: LoggingFunction = (message, ..._args) => {
				// Type check - should compile
				const _str: string | undefined = message;
			};
			expect(func).toBeDefined();
		});
	});
});
