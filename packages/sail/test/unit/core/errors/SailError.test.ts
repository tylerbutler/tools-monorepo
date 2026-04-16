import { describe, expect, it } from "vitest";
import {
	ErrorCategory,
	type ErrorContext,
	SailError,
} from "../../../../src/core/errors/SailError.js";

describe("SailError", () => {
	describe("Construction", () => {
		it("should create a SailError with message, category, and context", () => {
			const error = new SailError("Test error", ErrorCategory.Build, {
				packageName: "test-package",
			});

			expect(error).toBeInstanceOf(SailError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("Test error");
			expect(error.category).toBe(ErrorCategory.Build);
			expect(error.context.packageName).toBe("test-package");
			expect(error.name).toBe("SailError");
		});

		it("should handle empty context", () => {
			const error = new SailError("Error", ErrorCategory.Configuration);

			expect(error.context).toEqual({});
		});

		it("should set isRetryable to false by default", () => {
			const error = new SailError("Error", ErrorCategory.Execution);

			expect(error.isRetryable).toBe(false);
		});

		it("should accept isRetryable option", () => {
			const error = new SailError(
				"Error",
				ErrorCategory.Execution,
				{},
				{ isRetryable: true },
			);

			expect(error.isRetryable).toBe(true);
		});

		it("should accept userMessage option", () => {
			const error = new SailError(
				"Technical error",
				ErrorCategory.Build,
				{},
				{ userMessage: "User-friendly message" },
			);

			expect(error.userMessage).toBe("User-friendly message");
		});

		it("should set constructor name as error name", () => {
			const error = new SailError("Error", ErrorCategory.Build);

			expect(error.name).toBe("SailError");
		});

		it("should capture stack trace", () => {
			const error = new SailError("Error", ErrorCategory.Build);

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("SailError");
		});
	});

	describe("Error Context", () => {
		it("should store package name in context", () => {
			const error = new SailError("Error", ErrorCategory.Build, {
				packageName: "my-package",
			});

			expect(error.context.packageName).toBe("my-package");
		});

		it("should store task name in context", () => {
			const error = new SailError("Error", ErrorCategory.Build, {
				taskName: "build",
			});

			expect(error.context.taskName).toBe("build");
		});

		it("should store file path in context", () => {
			const error = new SailError("Error", ErrorCategory.FileSystem, {
				filePath: "/path/to/file",
			});

			expect(error.context.filePath).toBe("/path/to/file");
		});

		it("should store multiple context fields", () => {
			const context: ErrorContext = {
				packageName: "pkg",
				taskName: "build",
				filePath: "/file",
			};
			const error = new SailError("Error", ErrorCategory.Build, context);

			expect(error.context).toEqual(context);
		});

		it("should store custom context fields", () => {
			const error = new SailError("Error", ErrorCategory.Build, {
				customField: "value",
			});

			expect(error.context.customField).toBe("value");
		});
	});

	describe("getFormattedMessage", () => {
		it("should return message without context when no package or task", () => {
			const error = new SailError("Test error", ErrorCategory.Build);

			expect(error.getFormattedMessage()).toBe("Test error");
		});

		it("should prepend package name when present", () => {
			const error = new SailError("Build failed", ErrorCategory.Build, {
				packageName: "my-package",
			});

			expect(error.getFormattedMessage()).toBe("my-package: Build failed");
		});

		it("should append task name when present", () => {
			const error = new SailError("Failed", ErrorCategory.Build, {
				taskName: "compile",
			});

			expect(error.getFormattedMessage()).toBe("Failed (task: compile)");
		});

		it("should include both package and task name when present", () => {
			const error = new SailError("Failed", ErrorCategory.Build, {
				packageName: "my-package",
				taskName: "build",
			});

			expect(error.getFormattedMessage()).toBe(
				"my-package: Failed (task: build)",
			);
		});

		it("should not include file path in formatted message", () => {
			const error = new SailError("Error", ErrorCategory.FileSystem, {
				filePath: "/path",
			});

			expect(error.getFormattedMessage()).toBe("Error");
		});
	});

	describe("getUserMessage", () => {
		it("should return userMessage when provided", () => {
			const error = new SailError(
				"Technical error",
				ErrorCategory.Build,
				{},
				{ userMessage: "User-friendly error" },
			);

			expect(error.getUserMessage()).toBe("User-friendly error");
		});

		it("should fall back to formatted message when no userMessage", () => {
			const error = new SailError("Error", ErrorCategory.Build, {
				packageName: "pkg",
			});

			expect(error.getUserMessage()).toBe("pkg: Error");
		});

		it("should prefer userMessage over formatted message", () => {
			const error = new SailError(
				"Technical error",
				ErrorCategory.Build,
				{ packageName: "pkg" },
				{ userMessage: "User error" },
			);

			expect(error.getUserMessage()).toBe("User error");
			expect(error.getUserMessage()).not.toContain("Technical error");
		});
	});

	describe("toJSON", () => {
		it("should serialize all error properties", () => {
			const error = new SailError(
				"Error message",
				ErrorCategory.Build,
				{ packageName: "pkg", taskName: "build" },
				{ userMessage: "User message", isRetryable: true },
			);

			const json = error.toJSON();

			expect(json.name).toBe("SailError");
			expect(json.message).toBe("Error message");
			expect(json.category).toBe(ErrorCategory.Build);
			expect(json.context.packageName).toBe("pkg");
			expect(json.context.taskName).toBe("build");
			expect(json.userMessage).toBe("User message");
			expect(json.isRetryable).toBe(true);
			expect(json.stack).toBeDefined();
		});

		it("should include stack trace", () => {
			const error = new SailError("Error", ErrorCategory.Build);
			const json = error.toJSON();

			expect(json.stack).toBeDefined();
			expect(json.stack).toContain("SailError");
		});

		it("should handle undefined userMessage", () => {
			const error = new SailError("Error", ErrorCategory.Build);
			const json = error.toJSON();

			expect(json.userMessage).toBeUndefined();
		});

		it("should handle empty context", () => {
			const error = new SailError("Error", ErrorCategory.Build);
			const json = error.toJSON();

			expect(json.context).toEqual({});
		});
	});

	describe("ErrorCategory Enum", () => {
		it("should define all expected error categories", () => {
			expect(ErrorCategory.Build).toBeDefined();
			expect(ErrorCategory.Configuration).toBeDefined();
			expect(ErrorCategory.Dependency).toBeDefined();
			expect(ErrorCategory.Execution).toBeDefined();
			expect(ErrorCategory.FileSystem).toBeDefined();
		});

		it("should use correct category values", () => {
			const buildError = new SailError("Error", ErrorCategory.Build);
			const configError = new SailError("Error", ErrorCategory.Configuration);
			const depError = new SailError("Error", ErrorCategory.Dependency);
			const execError = new SailError("Error", ErrorCategory.Execution);
			const fsError = new SailError("Error", ErrorCategory.FileSystem);

			expect(buildError.category).toBe(ErrorCategory.Build);
			expect(configError.category).toBe(ErrorCategory.Configuration);
			expect(depError.category).toBe(ErrorCategory.Dependency);
			expect(execError.category).toBe(ErrorCategory.Execution);
			expect(fsError.category).toBe(ErrorCategory.FileSystem);
		});
	});

	describe("Error Inheritance", () => {
		it("should be instance of Error", () => {
			const error = new SailError("Error", ErrorCategory.Build);

			expect(error instanceof Error).toBe(true);
		});

		it("should be catchable as Error", () => {
			let caught: Error | null = null;

			try {
				throw new SailError("Error", ErrorCategory.Build);
			} catch (e) {
				if (e instanceof Error) {
					caught = e;
				}
			}

			expect(caught).toBeInstanceOf(SailError);
			expect(caught?.message).toBe("Error");
		});

		it("should maintain proper prototype chain", () => {
			const error = new SailError("Error", ErrorCategory.Build);

			expect(Object.getPrototypeOf(error)).toBe(SailError.prototype);
			expect(Object.getPrototypeOf(SailError.prototype)).toBe(Error.prototype);
		});
	});

	describe("Stack Trace", () => {
		it("should include error name in stack", () => {
			const error = new SailError("Error", ErrorCategory.Build);

			expect(error.stack).toContain("SailError");
		});

		it("should include error message in stack", () => {
			const error = new SailError("Custom error message", ErrorCategory.Build);

			expect(error.stack).toContain("Custom error message");
		});

		it("should capture stack trace from construction point", () => {
			function createError() {
				return new SailError("Error", ErrorCategory.Build);
			}

			const error = createError();

			expect(error.stack).toContain("createError");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty error message", () => {
			const error = new SailError("", ErrorCategory.Build);

			expect(error.message).toBe("");
			expect(error.getFormattedMessage()).toBe("");
		});

		it("should handle very long error messages", () => {
			const longMessage = "Error ".repeat(1000);
			const error = new SailError(longMessage, ErrorCategory.Build);

			expect(error.message).toBe(longMessage);
		});

		it("should handle special characters in messages", () => {
			const error = new SailError(
				"Error with 'quotes' and \"double quotes\"",
				ErrorCategory.Build,
			);

			expect(error.message).toContain("'quotes'");
			expect(error.message).toContain('"double quotes"');
		});

		it("should handle Unicode characters", () => {
			const error = new SailError("Error: 错误 🚨", ErrorCategory.Build);

			expect(error.message).toContain("错误");
			expect(error.message).toContain("🚨");
		});

		it("should handle newlines in messages", () => {
			const error = new SailError(
				"Line 1\nLine 2\nLine 3",
				ErrorCategory.Build,
			);

			expect(error.message).toContain("\n");
			const lines = error.message.split("\n");
			expect(lines).toHaveLength(3);
		});

		it("should handle null prototype in context", () => {
			const context = Object.create(null);
			context.packageName = "pkg";
			const error = new SailError("Error", ErrorCategory.Build, context);

			expect(error.context.packageName).toBe("pkg");
		});
	});

	describe("Subclass Behavior", () => {
		// Test that subclasses work correctly
		class CustomSailError extends SailError {
			public readonly customField: string;

			public constructor(message: string, customField: string) {
				super(message, ErrorCategory.Build);
				this.customField = customField;
			}
		}

		it("should support subclassing", () => {
			const error = new CustomSailError("Error", "custom value");

			expect(error).toBeInstanceOf(CustomSailError);
			expect(error).toBeInstanceOf(SailError);
			expect(error).toBeInstanceOf(Error);
			expect(error.customField).toBe("custom value");
		});

		it("should use subclass name", () => {
			const error = new CustomSailError("Error", "value");

			expect(error.name).toBe("CustomSailError");
		});

		it("should capture correct stack trace for subclass", () => {
			const error = new CustomSailError("Error", "value");

			expect(error.stack).toContain("CustomSailError");
		});
	});
});
