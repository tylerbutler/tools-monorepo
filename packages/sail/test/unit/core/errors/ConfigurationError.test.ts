import { describe, it, expect } from "vitest";
import { ConfigurationError } from "../../../../src/core/errors/ConfigurationError.js";
import { ErrorCategory } from "../../../../src/core/errors/SailError.js";

describe("ConfigurationError", () => {
	describe("Construction", () => {
		it("should create a ConfigurationError with message and context", () => {
			const error = new ConfigurationError("Invalid configuration", {
				packageName: "test-package",
				taskName: "build",
			});

			expect(error).toBeInstanceOf(ConfigurationError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("Invalid configuration");
			expect(error.category).toBe(ErrorCategory.Configuration);
			expect(error.context.packageName).toBe("test-package");
			expect(error.context.taskName).toBe("build");
			expect(error.name).toBe("ConfigurationError");
		});

		it("should handle empty context", () => {
			const error = new ConfigurationError("Config error");

			expect(error.context).toEqual({});
		});

		it("should accept options parameter", () => {
			const error = new ConfigurationError(
				"Config error",
				{},
				{
					userMessage: "User-friendly message",
					isRetryable: true,
				},
			);

			expect(error.userMessage).toBe("User-friendly message");
			expect(error.isRetryable).toBe(true);
		});
	});

	describe("Static Factory Methods", () => {
		describe("missingScript", () => {
			it("should create error for missing script with package name", () => {
				const error = ConfigurationError.missingScript("build", "my-package");

				expect(error.message).toBe(
					"Script not found for task definition 'build'",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.taskName).toBe("build");
				expect(error.userMessage).toContain("build");
				expect(error.userMessage).toContain("package.json");
			});

			it("should create error for missing script without package name", () => {
				const error = ConfigurationError.missingScript("test");

				expect(error.message).toBe(
					"Script not found for task definition 'test'",
				);
				expect(error.context.packageName).toBeUndefined();
				expect(error.context.taskName).toBe("test");
			});
		});

		describe("invalidTaskDefinition", () => {
			it("should create error for invalid task definition with package name", () => {
				const error = ConfigurationError.invalidTaskDefinition(
					"build",
					"missing dependsOn field",
					"my-package",
				);

				expect(error.message).toBe(
					"Invalid task definition 'build': missing dependsOn field",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.taskName).toBe("build");
				expect(error.userMessage).toContain("build");
				expect(error.userMessage).toContain("missing dependsOn field");
			});

			it("should create error for invalid task definition without package name", () => {
				const error = ConfigurationError.invalidTaskDefinition(
					"compile",
					"circular dependency",
				);

				expect(error.message).toContain("compile");
				expect(error.message).toContain("circular dependency");
				expect(error.context.packageName).toBeUndefined();
				expect(error.context.taskName).toBe("compile");
			});
		});

		describe("invalidDependency", () => {
			it("should create error for invalid dependency with package name", () => {
				const error = ConfigurationError.invalidDependency(
					"^build",
					"compile",
					"invalid syntax",
					"my-package",
				);

				expect(error.message).toBe(
					"Invalid dependency '^build' in task 'compile': invalid syntax",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.taskName).toBe("compile");
				expect(error.userMessage).toContain("^build");
				expect(error.userMessage).toContain("compile");
				expect(error.userMessage).toContain("invalid syntax");
			});

			it("should create error for invalid dependency without package name", () => {
				const error = ConfigurationError.invalidDependency(
					"dep",
					"task",
					"reason",
				);

				expect(error.message).toContain("dep");
				expect(error.message).toContain("task");
				expect(error.message).toContain("reason");
				expect(error.context.packageName).toBeUndefined();
			});
		});

		describe("noTasksFound", () => {
			it("should create error for no tasks found with single task", () => {
				const error = ConfigurationError.noTasksFound(["build"]);

				expect(error.message).toBe("No task(s) found for 'build'");
				expect(error.userMessage).toContain("build");
				expect(error.userMessage).toContain("were found");
			});

			it("should create error for no tasks found with multiple tasks", () => {
				const error = ConfigurationError.noTasksFound(["build", "test", "lint"]);

				expect(error.message).toBe("No task(s) found for 'build, test, lint'");
				expect(error.userMessage).toContain("build, test, lint");
			});

			it("should handle empty task array", () => {
				const error = ConfigurationError.noTasksFound([]);

				expect(error.message).toBe("No task(s) found for ''");
			});
		});
	});

	describe("Error Properties", () => {
		it("should have correct category", () => {
			const error = new ConfigurationError("Test");

			expect(error.category).toBe(ErrorCategory.Configuration);
		});

		it("should preserve stack trace", () => {
			const error = new ConfigurationError("Test error");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("ConfigurationError");
		});

		it("should have correct error name", () => {
			const error = ConfigurationError.missingScript("test");

			expect(error.name).toBe("ConfigurationError");
		});
	});

	describe("Error Inheritance", () => {
		it("should be catchable as Error", () => {
			const error = ConfigurationError.missingScript("test");

			expect(error instanceof Error).toBe(true);
			expect(error instanceof ConfigurationError).toBe(true);
		});

		it("should inherit from SailError", () => {
			const error = new ConfigurationError("Test");

			expect(error.getFormattedMessage).toBeDefined();
			expect(error.getUserMessage).toBeDefined();
			expect(error.toJSON).toBeDefined();
		});
	});

	describe("Message Formatting", () => {
		it("should format message with package name", () => {
			const error = ConfigurationError.missingScript("build", "my-package");
			const formatted = error.getFormattedMessage();

			expect(formatted).toContain("my-package");
			expect(formatted).toContain("build");
		});

		it("should use user message when available", () => {
			const error = ConfigurationError.invalidTaskDefinition(
				"build",
				"test reason",
				"pkg",
			);

			const userMsg = error.getUserMessage();
			expect(userMsg).toContain("build");
			expect(userMsg).toContain("test reason");
		});
	});

	describe("JSON Serialization", () => {
		it("should serialize to JSON", () => {
			const error = new ConfigurationError(
				"Config error",
				{ packageName: "test", taskName: "build" },
				{ userMessage: "User message", isRetryable: false },
			);

			const json = error.toJSON();

			expect(json.name).toBe("ConfigurationError");
			expect(json.message).toBe("Config error");
			expect(json.category).toBe(ErrorCategory.Configuration);
			expect(json.context.packageName).toBe("test");
			expect(json.context.taskName).toBe("build");
			expect(json.userMessage).toBe("User message");
			expect(json.isRetryable).toBe(false);
		});
	});

	describe("Edge Cases", () => {
		it("should handle undefined package name in all factory methods", () => {
			const error1 = ConfigurationError.missingScript("task");
			const error2 = ConfigurationError.invalidTaskDefinition("task", "reason");
			const error3 = ConfigurationError.invalidDependency(
				"dep",
				"task",
				"reason",
			);

			expect(error1.context.packageName).toBeUndefined();
			expect(error2.context.packageName).toBeUndefined();
			expect(error3.context.packageName).toBeUndefined();
		});

		it("should handle special characters in task names", () => {
			const error = ConfigurationError.missingScript("build:prod");

			expect(error.message).toContain("build:prod");
			expect(error.context.taskName).toBe("build:prod");
		});

		it("should handle empty strings in factory methods", () => {
			const error1 = ConfigurationError.missingScript("");
			const error2 = ConfigurationError.invalidTaskDefinition("", "");
			const error3 = ConfigurationError.invalidDependency("", "", "");

			expect(error1.message).toBeDefined();
			expect(error2.message).toBeDefined();
			expect(error3.message).toBeDefined();
		});
	});
});
