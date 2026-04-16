import { describe, expect, it } from "vitest";
import { BuildError } from "../../../../src/core/errors/BuildError.js";
import { ConfigurationError } from "../../../../src/core/errors/ConfigurationError.js";
import { DependencyError } from "../../../../src/core/errors/DependencyError.js";
import { ExecutionError } from "../../../../src/core/errors/ExecutionError.js";
import {
	getErrorCategory,
	isSailError,
	toSailError,
} from "../../../../src/core/errors/errorUtils.js";
import { FileSystemError } from "../../../../src/core/errors/FileSystemError.js";
import {
	ErrorCategory,
	SailError,
} from "../../../../src/core/errors/SailError.js";

describe("errorUtils", () => {
	describe("isSailError", () => {
		it("should return true for SailError instances", () => {
			const error = new SailError("Test error", ErrorCategory.Internal);
			const result = isSailError(error);
			expect(result).toBe(true);
		});

		it("should return true for BuildError (subclass of SailError)", () => {
			const error = BuildError.taskFailed("test task", {
				packageName: "test",
			});
			const result = isSailError(error);
			expect(result).toBe(true);
		});

		it("should return true for ConfigurationError (subclass of SailError)", () => {
			const error = new ConfigurationError("Invalid config", {
				packageName: "test",
			});
			const result = isSailError(error);
			expect(result).toBe(true);
		});

		it("should return true for DependencyError (subclass of SailError)", () => {
			const error = DependencyError.circularPackageDependency(
				["pkg1", "pkg2", "pkg1"],
				"pkg1",
			);
			const result = isSailError(error);
			expect(result).toBe(true);
		});

		it("should return true for ExecutionError (subclass of SailError)", () => {
			const error = ExecutionError.commandFailed("tsc", 1, "", "", {
				packageName: "test",
			});
			const result = isSailError(error);
			expect(result).toBe(true);
		});

		it("should return true for FileSystemError (subclass of SailError)", () => {
			const error = FileSystemError.fileNotFound("/path/to/file", "reading", {
				packageName: "test",
			});
			const result = isSailError(error);
			expect(result).toBe(true);
		});

		it("should return false for regular Error", () => {
			const error = new Error("Regular error");
			const result = isSailError(error);
			expect(result).toBe(false);
		});

		it("should return false for TypeError", () => {
			const error = new TypeError("Type error");
			const result = isSailError(error);
			expect(result).toBe(false);
		});

		it("should return false for string", () => {
			const result = isSailError("error message");
			expect(result).toBe(false);
		});

		it("should return false for null", () => {
			const result = isSailError(null);
			expect(result).toBe(false);
		});

		it("should return false for undefined", () => {
			const result = isSailError(undefined);
			expect(result).toBe(false);
		});

		it("should return false for object literal", () => {
			const result = isSailError({ message: "error" });
			expect(result).toBe(false);
		});

		it("should return false for number", () => {
			const result = isSailError(42);
			expect(result).toBe(false);
		});
	});

	describe("getErrorCategory", () => {
		it("should return category from SailError", () => {
			const error = new SailError("Test", ErrorCategory.Build);
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.Build);
		});

		it("should return category from BuildError", () => {
			const error = BuildError.taskFailed("test", { packageName: "pkg" });
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.Build);
		});

		it("should return category from ConfigurationError", () => {
			const error = new ConfigurationError("Invalid config", {
				packageName: "pkg",
			});
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.Configuration);
		});

		it("should return category from DependencyError", () => {
			const error = DependencyError.circularPackageDependency(
				["a", "b"],
				"pkg",
			);
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.Dependency);
		});

		it("should return category from ExecutionError", () => {
			const error = ExecutionError.commandFailed("cmd", 1, "", "", {
				packageName: "pkg",
			});
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.Execution);
		});

		it("should return category from FileSystemError", () => {
			const error = FileSystemError.fileNotFound("/path", "reading", {
				packageName: "pkg",
			});
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.FileSystem);
		});

		it("should return Internal category for regular Error", () => {
			const error = new Error("Regular error");
			const category = getErrorCategory(error);
			expect(category).toBe(ErrorCategory.Internal);
		});

		it("should return Internal category for string", () => {
			const category = getErrorCategory("error message");
			expect(category).toBe(ErrorCategory.Internal);
		});

		it("should return Internal category for null", () => {
			const category = getErrorCategory(null);
			expect(category).toBe(ErrorCategory.Internal);
		});

		it("should return Internal category for undefined", () => {
			const category = getErrorCategory(undefined);
			expect(category).toBe(ErrorCategory.Internal);
		});

		it("should return Internal category for object literal", () => {
			const category = getErrorCategory({ message: "error" });
			expect(category).toBe(ErrorCategory.Internal);
		});

		it("should return Internal category for number", () => {
			const category = getErrorCategory(42);
			expect(category).toBe(ErrorCategory.Internal);
		});
	});

	describe("toSailError", () => {
		it("should return same SailError instance", () => {
			const error = new SailError("Test", ErrorCategory.Build);
			const result = toSailError(error);
			expect(result).toBe(error);
		});

		it("should return same BuildError instance", () => {
			const error = BuildError.taskFailed("test", { packageName: "pkg" });
			const result = toSailError(error);
			expect(result).toBe(error);
		});

		it("should convert Error to SailError with default category", () => {
			const error = new Error("Regular error");
			const result = toSailError(error);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Regular error");
			expect(result.category).toBe(ErrorCategory.Internal);
		});

		it("should convert Error to SailError with custom category", () => {
			const error = new Error("Build failed");
			const result = toSailError(error, ErrorCategory.Build);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Build failed");
			expect(result.category).toBe(ErrorCategory.Build);
		});

		it("should convert TypeError to SailError", () => {
			const error = new TypeError("Type mismatch");
			const result = toSailError(error);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Type mismatch");
		});

		it("should convert string to SailError", () => {
			const result = toSailError("error message");

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("error message");
			expect(result.category).toBe(ErrorCategory.Internal);
		});

		it("should convert string to SailError with custom category", () => {
			const result = toSailError("config invalid", ErrorCategory.Configuration);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("config invalid");
			expect(result.category).toBe(ErrorCategory.Configuration);
		});

		it("should convert null to SailError with default message", () => {
			const result = toSailError(null);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Unknown error occurred");
			expect(result.category).toBe(ErrorCategory.Internal);
		});

		it("should convert undefined to SailError with default message", () => {
			const result = toSailError(undefined);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Unknown error occurred");
			expect(result.category).toBe(ErrorCategory.Internal);
		});

		it("should convert number to SailError with default message", () => {
			const result = toSailError(42);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Unknown error occurred");
		});

		it("should convert object literal to SailError with default message", () => {
			const result = toSailError({ data: "value" });

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("Unknown error occurred");
		});

		it("should preserve error message for Error subclasses", () => {
			const error = new RangeError("Range exceeded");
			const result = toSailError(error);

			expect(result.message).toBe("Range exceeded");
		});

		it("should handle empty string", () => {
			const result = toSailError("");

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("");
		});

		it("should handle Error with empty message", () => {
			const error = new Error("empty error message");
			const result = toSailError(error);

			expect(isSailError(result)).toBe(true);
			expect(result.message).toBe("empty error message");
		});

		it("should preserve category for BuildError passed through", () => {
			const error = BuildError.compilationFailed("pkg", "compile", ["error 1"]);
			const result = toSailError(error);

			expect(result).toBe(error);
			expect(result.category).toBe(ErrorCategory.Build);
		});

		it("should handle ConfigurationError", () => {
			const error = new ConfigurationError("Config issue", {
				packageName: "pkg",
			});
			const result = toSailError(error);

			expect(result).toBe(error);
			expect(result.category).toBe(ErrorCategory.Configuration);
		});

		it("should handle DependencyError", () => {
			const error = DependencyError.missingPackageDependency("missing-pkg", {
				packageName: "pkg",
			});
			const result = toSailError(error);

			expect(result).toBe(error);
			expect(result.category).toBe(ErrorCategory.Dependency);
		});

		it("should use provided default category over error's category", () => {
			const sailError = new SailError("Test", ErrorCategory.Build);
			const result = toSailError(sailError, ErrorCategory.Configuration);

			// Should return the original SailError unchanged
			expect(result).toBe(sailError);
			expect(result.category).toBe(ErrorCategory.Build);
		});
	});

	describe("error conversion edge cases", () => {
		it("should handle SailError in toSailError", () => {
			const original = new SailError("Test", ErrorCategory.Build);
			const result = toSailError(original);

			expect(result).toBe(original);
		});

		it("should handle Error with special characters in message", () => {
			const error = new Error("Error: /path\\to\\file not found");
			const result = toSailError(error);

			expect(result.message).toBe("Error: /path\\to\\file not found");
		});

		it("should handle Error with very long message", () => {
			const longMessage = "x".repeat(10000);
			const error = new Error(longMessage);
			const result = toSailError(error);

			expect(result.message).toBe(longMessage);
		});

		it("should handle multiline error messages", () => {
			const error = new Error("Line 1\nLine 2\nLine 3");
			const result = toSailError(error);

			expect(result.message).toContain("Line 1");
			expect(result.message).toContain("Line 2");
		});
	});
});
