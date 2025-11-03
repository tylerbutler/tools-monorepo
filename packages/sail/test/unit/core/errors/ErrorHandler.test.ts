import type { Logger } from "@tylerbu/cli-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ContextualErrorHandler,
	ErrorHandler,
	ErrorHandlingStrategy,
} from "../../../../src/core/errors/ErrorHandler.js";
import {
	ErrorCategory,
	SailError,
} from "../../../../src/core/errors/SailError.js";

describe("ErrorHandler", () => {
	let mockLogger: Logger;
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		mockLogger = {
			errorLog: vi.fn(),
			warning: vi.fn(),
			verbose: vi.fn(),
			info: vi.fn(),
		} as unknown as Logger;

		errorHandler = new ErrorHandler(mockLogger);
	});

	describe("Construction", () => {
		it("should create an ErrorHandler with a logger", () => {
			expect(errorHandler).toBeInstanceOf(ErrorHandler);
		});

		it("should initialize with empty error counts", () => {
			// Act
			const stats = errorHandler.getErrorStatistics();

			// Assert
			expect(stats.totalErrors).toBe(0);
			expect(stats.hasErrors).toBe(false);
		});

		it("should initialize with empty collected errors", () => {
			// Act
			const stats = errorHandler.getErrorStatistics();

			// Assert
			expect(stats.collectedErrors).toHaveLength(0);
		});
	});

	describe("handleError - ErrorHandlingStrategy.Log", () => {
		it("should log error and not throw", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Log,
			);

			// Assert
			expect(result.shouldThrow).toBe(false);
			expect(result.error).toBe(error);
			expect(mockLogger.errorLog).toHaveBeenCalledWith(
				expect.stringContaining("Test error"),
			);
		});

		it("should log stack trace verbosely if present", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);
			error.stack = "Stack trace line 1\nStack trace line 2";

			// Act
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Log);

			// Assert
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("Stack trace"),
			);
		});

		it("should use Log strategy as default", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);

			// Act
			const result = errorHandler.handleError(error);

			// Assert
			expect(result.shouldThrow).toBe(false);
			expect(mockLogger.errorLog).toHaveBeenCalled();
		});

		it("should convert non-SailError to SailError", () => {
			// Arrange
			const plainError = new Error("Plain error");

			// Act
			const result = errorHandler.handleError(
				plainError,
				{},
				ErrorHandlingStrategy.Log,
			);

			// Assert
			expect(result.error).toBeInstanceOf(SailError);
			expect(mockLogger.errorLog).toHaveBeenCalled();
		});
	});

	describe("handleError - ErrorHandlingStrategy.Warn", () => {
		it("should log warning and not throw", () => {
			// Arrange
			const error = new SailError("Test warning", ErrorCategory.Configuration);

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Warn,
			);

			// Assert
			expect(result.shouldThrow).toBe(false);
			expect(result.error).toBe(error);
			expect(mockLogger.warning).toHaveBeenCalledWith(
				expect.stringContaining("Test warning"),
			);
		});

		it("should not log stack trace for warnings", () => {
			// Arrange
			const error = new SailError("Test warning", ErrorCategory.Configuration);
			error.stack = "Stack trace";

			// Act
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Warn);

			// Assert
			expect(mockLogger.verbose).not.toHaveBeenCalled();
			expect(mockLogger.errorLog).not.toHaveBeenCalled();
		});
	});

	describe("handleError - ErrorHandlingStrategy.Collect", () => {
		it("should collect error without logging", () => {
			// Arrange
			const error = new SailError("Collected error", ErrorCategory.Dependency);

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Collect,
			);

			// Assert
			expect(result.shouldThrow).toBe(false);
			expect(result.error).toBe(error);
			expect(mockLogger.errorLog).not.toHaveBeenCalled();
			expect(mockLogger.warning).not.toHaveBeenCalled();
		});

		it("should add error to collected errors list", () => {
			// Arrange
			const error1 = new SailError("Error 1", ErrorCategory.Build);
			const error2 = new SailError("Error 2", ErrorCategory.Configuration);

			// Act
			errorHandler.handleError(error1, {}, ErrorHandlingStrategy.Collect);
			errorHandler.handleError(error2, {}, ErrorHandlingStrategy.Collect);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.collectedErrors).toHaveLength(2);
			expect(stats.collectedErrors[0]).toBe(error1);
			expect(stats.collectedErrors[1]).toBe(error2);
		});

		it("should log verbose message about collection", () => {
			// Arrange
			const error = new SailError("Collected error", ErrorCategory.Dependency);

			// Act
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Collect);

			// Assert
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("Error collected"),
			);
		});
	});

	describe("handleError - ErrorHandlingStrategy.Fatal", () => {
		it("should log fatal error and indicate should throw", () => {
			// Arrange
			const error = new SailError("Fatal error", ErrorCategory.FileSystem);

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Fatal,
			);

			// Assert
			expect(result.shouldThrow).toBe(true);
			expect(result.error).toBe(error);
			expect(mockLogger.errorLog).toHaveBeenCalledWith(
				expect.stringContaining("Fatal error"),
			);
		});

		it("should log stack trace for fatal errors", () => {
			// Arrange
			const error = new SailError("Fatal error", ErrorCategory.FileSystem);
			error.stack = "Fatal stack trace";

			// Act
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Fatal);

			// Assert
			expect(mockLogger.errorLog).toHaveBeenCalledWith(
				expect.stringContaining("Stack trace"),
			);
		});
	});

	describe("handleError - ErrorHandlingStrategy.Retry", () => {
		it("should log retryable error as warning when error is retryable", () => {
			// Arrange
			const error = new SailError(
				"Retryable error",
				ErrorCategory.Execution,
				{},
				{
					isRetryable: true,
				},
			);

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Retry,
			);

			// Assert
			expect(result.shouldThrow).toBe(false);
			expect(mockLogger.warning).toHaveBeenCalledWith(
				expect.stringContaining("Retryable error"),
			);
		});

		it("should log non-retryable error normally", () => {
			// Arrange
			const error = new SailError(
				"Non-retryable error",
				ErrorCategory.Execution,
				{},
				{
					isRetryable: false,
				},
			);

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Retry,
			);

			// Assert
			expect(result.shouldThrow).toBe(false);
			expect(mockLogger.errorLog).toHaveBeenCalled();
			expect(mockLogger.warning).not.toHaveBeenCalled();
		});
	});

	describe("Error Context Merging", () => {
		it("should merge additional context with error context", () => {
			// Arrange
			const error = new SailError("Error", ErrorCategory.Build, {
				originalKey: "original",
			});
			const additionalContext = { additionalKey: "additional" };

			// Act
			const result = errorHandler.handleError(
				error,
				additionalContext,
				ErrorHandlingStrategy.Log,
			);

			// Assert
			expect(result.error.context).toEqual({
				originalKey: "original",
				additionalKey: "additional",
			});
		});

		it("should allow additional context to override error context", () => {
			// Arrange
			const error = new SailError("Error", ErrorCategory.Build, {
				sharedKey: "original",
			});
			const additionalContext = { sharedKey: "overridden" };

			// Act
			const result = errorHandler.handleError(
				error,
				additionalContext,
				ErrorHandlingStrategy.Log,
			);

			// Assert
			expect(result.error.context.sharedKey).toBe("overridden");
		});

		it("should not modify error when context is empty", () => {
			// Arrange
			const error = new SailError("Error", ErrorCategory.Build, {
				key: "value",
			});

			// Act
			const result = errorHandler.handleError(
				error,
				{},
				ErrorHandlingStrategy.Log,
			);

			// Assert
			expect(result.error).toBe(error);
		});
	});

	describe("Error Statistics and Counting", () => {
		it("should track error counts by category", () => {
			// Arrange
			const buildError1 = new SailError("Build error 1", ErrorCategory.Build);
			const buildError2 = new SailError("Build error 2", ErrorCategory.Build);
			const configError = new SailError(
				"Config error",
				ErrorCategory.Configuration,
			);

			// Act
			errorHandler.handleError(buildError1, {}, ErrorHandlingStrategy.Log);
			errorHandler.handleError(buildError2, {}, ErrorHandlingStrategy.Log);
			errorHandler.handleError(configError, {}, ErrorHandlingStrategy.Log);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(3);
			expect(stats.categoryCounts[ErrorCategory.Build]).toBe(2);
			expect(stats.categoryCounts[ErrorCategory.Configuration]).toBe(1);
		});

		it("should increment count for repeated errors in same category", () => {
			// Arrange
			const error1 = new SailError("Error 1", ErrorCategory.Dependency);
			const error2 = new SailError("Error 2", ErrorCategory.Dependency);
			const error3 = new SailError("Error 3", ErrorCategory.Dependency);

			// Act
			errorHandler.handleError(error1, {}, ErrorHandlingStrategy.Log);
			errorHandler.handleError(error2, {}, ErrorHandlingStrategy.Log);
			errorHandler.handleError(error3, {}, ErrorHandlingStrategy.Log);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.categoryCounts[ErrorCategory.Dependency]).toBe(3);
		});

		it("should return hasErrors true when errors exist", () => {
			// Arrange
			const error = new SailError("Error", ErrorCategory.Build);

			// Act
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Log);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.hasErrors).toBe(true);
		});

		it("should return hasErrors false when no errors", () => {
			// Act
			const stats = errorHandler.getErrorStatistics();

			// Assert
			expect(stats.hasErrors).toBe(false);
		});
	});

	describe("handleAsync", () => {
		it("should return operation result on success", async () => {
			// Arrange
			const operation = vi.fn().mockResolvedValue(42);

			// Act
			const result = await errorHandler.handleAsync(operation);

			// Assert
			expect(result).toBe(42);
			expect(operation).toHaveBeenCalled();
		});

		it("should handle error and return null on failure (Log strategy)", async () => {
			// Arrange
			const error = new Error("Async error");
			const operation = vi.fn().mockRejectedValue(error);

			// Act
			const result = await errorHandler.handleAsync(
				operation,
				{},
				ErrorHandlingStrategy.Log,
			);

			// Assert
			expect(result).toBeNull();
			expect(mockLogger.errorLog).toHaveBeenCalled();
		});

		it("should throw error on failure with Fatal strategy", async () => {
			// Arrange
			const error = new SailError("Fatal async error", ErrorCategory.Execution);
			const operation = vi.fn().mockRejectedValue(error);

			// Act & Assert
			await expect(
				errorHandler.handleAsync(operation, {}, ErrorHandlingStrategy.Fatal),
			).rejects.toThrow();
		});

		it("should merge context for async errors", async () => {
			// Arrange
			const error = new SailError("Async error", ErrorCategory.Execution);
			const operation = vi.fn().mockRejectedValue(error);
			const context = { asyncOperation: "test" };

			// Act
			await errorHandler.handleAsync(
				operation,
				context,
				ErrorHandlingStrategy.Log,
			);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(1);
		});
	});

	describe("safeExecute", () => {
		it("should return operation result on success", () => {
			// Arrange
			const operation = vi.fn().mockReturnValue(42);
			const fallback = 0;

			// Act
			const result = errorHandler.safeExecute(operation, fallback);

			// Assert
			expect(result).toBe(42);
			expect(operation).toHaveBeenCalled();
		});

		it("should return fallback value on error", () => {
			// Arrange
			const error = new Error("Operation failed");
			const operation = vi.fn().mockImplementation(() => {
				throw error;
			});
			const fallback = "fallback-value";

			// Act
			const result = errorHandler.safeExecute(operation, fallback);

			// Assert
			expect(result).toBe("fallback-value");
			expect(mockLogger.warning).toHaveBeenCalled();
		});

		it("should use Warn strategy for safe execute errors", () => {
			// Arrange
			const error = new SailError("Safe execute error", ErrorCategory.Build);
			const operation = vi.fn().mockImplementation(() => {
				throw error;
			});
			const fallback = null;

			// Act
			errorHandler.safeExecute(operation, fallback);

			// Assert
			expect(mockLogger.warning).toHaveBeenCalled();
			expect(mockLogger.errorLog).not.toHaveBeenCalled();
		});

		it("should merge context for safe execute errors", () => {
			// Arrange
			const error = new Error("Error");
			const operation = vi.fn().mockImplementation(() => {
				throw error;
			});
			const context = { safeOperation: "test" };

			// Act
			errorHandler.safeExecute(operation, "fallback", context);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(1);
		});
	});

	describe("getErrorSummary", () => {
		it("should return no errors message when no errors collected", () => {
			// Act
			const summary = errorHandler.getErrorSummary();

			// Assert
			expect(summary).toBe("No errors collected.");
		});

		it("should return summary with error count", () => {
			// Arrange
			const error1 = new SailError("Error 1", ErrorCategory.Build);
			const error2 = new SailError("Error 2", ErrorCategory.Configuration);
			errorHandler.handleError(error1, {}, ErrorHandlingStrategy.Collect);
			errorHandler.handleError(error2, {}, ErrorHandlingStrategy.Collect);

			// Act
			const summary = errorHandler.getErrorSummary();

			// Assert
			expect(summary).toContain("2 error(s) collected");
		});

		it("should include category counts in summary", () => {
			// Arrange
			const buildError = new SailError("Build error", ErrorCategory.Build);
			const configError = new SailError(
				"Config error",
				ErrorCategory.Configuration,
			);
			errorHandler.handleError(buildError, {}, ErrorHandlingStrategy.Collect);
			errorHandler.handleError(configError, {}, ErrorHandlingStrategy.Collect);

			// Act
			const summary = errorHandler.getErrorSummary();

			// Assert
			expect(summary).toContain(ErrorCategory.Build);
			expect(summary).toContain(ErrorCategory.Configuration);
		});

		it("should list all collected error messages", () => {
			// Arrange
			const error1 = new SailError("First error", ErrorCategory.Build);
			const error2 = new SailError("Second error", ErrorCategory.Dependency);
			errorHandler.handleError(error1, {}, ErrorHandlingStrategy.Collect);
			errorHandler.handleError(error2, {}, ErrorHandlingStrategy.Collect);

			// Act
			const summary = errorHandler.getErrorSummary();

			// Assert
			expect(summary).toContain("First error");
			expect(summary).toContain("Second error");
			expect(summary).toContain("•"); // Bullet points
		});
	});

	describe("reset", () => {
		it("should clear error counts", () => {
			// Arrange
			const error = new SailError("Error", ErrorCategory.Build);
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Log);

			// Act
			errorHandler.reset();

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(0);
		});

		it("should clear collected errors", () => {
			// Arrange
			const error = new SailError("Error", ErrorCategory.Build);
			errorHandler.handleError(error, {}, ErrorHandlingStrategy.Collect);

			// Act
			errorHandler.reset();

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.collectedErrors).toHaveLength(0);
		});

		it("should allow new errors to be tracked after reset", () => {
			// Arrange
			const error1 = new SailError("Error 1", ErrorCategory.Build);
			errorHandler.handleError(error1, {}, ErrorHandlingStrategy.Log);
			errorHandler.reset();

			// Act
			const error2 = new SailError("Error 2", ErrorCategory.Configuration);
			errorHandler.handleError(error2, {}, ErrorHandlingStrategy.Log);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(1);
			expect(stats.categoryCounts[ErrorCategory.Build]).toBeUndefined();
			expect(stats.categoryCounts[ErrorCategory.Configuration]).toBe(1);
		});
	});

	describe("createContextualHandler", () => {
		it("should create a ContextualErrorHandler", () => {
			// Act
			const contextualHandler = errorHandler.createContextualHandler({
				package: "test-package",
			});

			// Assert
			expect(contextualHandler).toBeInstanceOf(ContextualErrorHandler);
		});

		it("should create handler with base context", () => {
			// Arrange
			const baseContext = { package: "test-package", task: "build" };

			// Act
			const contextualHandler =
				errorHandler.createContextualHandler(baseContext);
			const error = new SailError("Test error", ErrorCategory.Build);
			const result = contextualHandler.handleError(error);

			// Assert
			expect(result.error.context.package).toBe("test-package");
			expect(result.error.context.task).toBe("build");
		});
	});
});

describe("ContextualErrorHandler", () => {
	let mockLogger: Logger;
	let errorHandler: ErrorHandler;
	let contextualHandler: ContextualErrorHandler;
	const baseContext = { package: "test-package", version: "1.0.0" };

	beforeEach(() => {
		mockLogger = {
			errorLog: vi.fn(),
			warning: vi.fn(),
			verbose: vi.fn(),
			info: vi.fn(),
		} as unknown as Logger;

		errorHandler = new ErrorHandler(mockLogger);
		contextualHandler = errorHandler.createContextualHandler(baseContext);
	});

	describe("handleError", () => {
		it("should merge base context with error", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);

			// Act
			const result = contextualHandler.handleError(error);

			// Assert
			expect(result.error.context.package).toBe("test-package");
			expect(result.error.context.version).toBe("1.0.0");
		});

		it("should merge additional context with base context", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);
			const additionalContext = { task: "compile" };

			// Act
			const result = contextualHandler.handleError(error, additionalContext);

			// Assert
			expect(result.error.context.package).toBe("test-package");
			expect(result.error.context.version).toBe("1.0.0");
			expect(result.error.context.task).toBe("compile");
		});

		it("should allow additional context to override base context", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);
			const additionalContext = { package: "overridden-package" };

			// Act
			const result = contextualHandler.handleError(error, additionalContext);

			// Assert
			expect(result.error.context.package).toBe("overridden-package");
		});

		it("should delegate to parent ErrorHandler", () => {
			// Arrange
			const error = new SailError("Test error", ErrorCategory.Build);

			// Act
			contextualHandler.handleError(error, {}, ErrorHandlingStrategy.Log);

			// Assert
			expect(mockLogger.errorLog).toHaveBeenCalled();
		});
	});

	describe("handleAsync", () => {
		it("should merge contexts for async operations", async () => {
			// Arrange
			const error = new SailError("Async error", ErrorCategory.Execution);
			const operation = vi.fn().mockRejectedValue(error);
			const additionalContext = { operation: "async-task" };

			// Act
			await contextualHandler.handleAsync(
				operation,
				additionalContext,
				ErrorHandlingStrategy.Log,
			);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(1);
		});
	});

	describe("safeExecute", () => {
		it("should merge contexts for safe execute", () => {
			// Arrange
			const error = new Error("Safe execute error");
			const operation = vi.fn().mockImplementation(() => {
				throw error;
			});
			const additionalContext = { operation: "safe-task" };

			// Act
			contextualHandler.safeExecute(operation, "fallback", additionalContext);

			// Assert
			const stats = errorHandler.getErrorStatistics();
			expect(stats.totalErrors).toBe(1);
		});
	});
});

describe("ErrorHandlingStrategy", () => {
	it("should define all expected strategies", () => {
		expect(ErrorHandlingStrategy.Log).toBe("Log");
		expect(ErrorHandlingStrategy.Warn).toBe("Warn");
		expect(ErrorHandlingStrategy.Collect).toBe("Collect");
		expect(ErrorHandlingStrategy.Fatal).toBe("Fatal");
		expect(ErrorHandlingStrategy.Retry).toBe("Retry");
	});
});
