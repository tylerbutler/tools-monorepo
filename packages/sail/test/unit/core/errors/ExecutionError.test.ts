import { describe, expect, it } from "vitest";
import { ExecutionError } from "../../../../src/core/errors/ExecutionError.js";
import { ErrorCategory } from "../../../../src/core/errors/SailError.js";

describe("ExecutionError", () => {
	describe("Construction", () => {
		it("should create an ExecutionError with message and context", () => {
			const error = new ExecutionError("Execution failed", {
				command: "npm run build",
			});

			expect(error).toBeInstanceOf(ExecutionError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("Execution failed");
			expect(error.category).toBe(ErrorCategory.Execution);
			expect(error.context.command).toBe("npm run build");
			expect(error.name).toBe("ExecutionError");
		});

		it("should handle execution-specific options", () => {
			const error = new ExecutionError(
				"Command failed",
				{},
				{
					exitCode: 1,
					stdout: "output text",
					stderr: "error text",
				},
			);

			expect(error.exitCode).toBe(1);
			expect(error.stdout).toBe("output text");
			expect(error.stderr).toBe("error text");
		});

		it("should handle empty context and options", () => {
			const error = new ExecutionError("Error");

			expect(error.context).toEqual({});
			expect(error.exitCode).toBeUndefined();
			expect(error.stdout).toBeUndefined();
			expect(error.stderr).toBeUndefined();
		});

		it("should accept all execution options", () => {
			const error = new ExecutionError(
				"Error",
				{},
				{
					exitCode: 127,
					stdout: "stdout",
					stderr: "stderr",
					userMessage: "User message",
					isRetryable: true,
				},
			);

			expect(error.exitCode).toBe(127);
			expect(error.stdout).toBe("stdout");
			expect(error.stderr).toBe("stderr");
			expect(error.userMessage).toBe("User message");
			expect(error.isRetryable).toBe(true);
		});
	});

	describe("Static Factory Methods", () => {
		describe("commandFailed", () => {
			it("should create error for command failure with all details", () => {
				const error = ExecutionError.commandFailed(
					"npm test",
					1,
					"stderr output",
					"stdout output",
					{ packageName: "my-package" },
				);

				expect(error.message).toBe("Command failed: npm test (exit code 1)");
				expect(error.context.command).toBe("npm test");
				expect(error.context.packageName).toBe("my-package");
				expect(error.exitCode).toBe(1);
				expect(error.stderr).toBe("stderr output");
				expect(error.stdout).toBe("stdout output");
				expect(error.userMessage).toContain("npm test");
				expect(error.userMessage).toContain("exit code 1");
			});

			it("should create error without exit code", () => {
				const error = ExecutionError.commandFailed("npm build");

				expect(error.message).toBe("Command failed: npm build");
				expect(error.exitCode).toBeUndefined();
				expect(error.userMessage).not.toContain("exit code");
			});

			it("should create error without stderr/stdout", () => {
				const error = ExecutionError.commandFailed("command", 2);

				expect(error.exitCode).toBe(2);
				expect(error.stderr).toBeUndefined();
				expect(error.stdout).toBeUndefined();
			});

			it("should mark non-zero/non-one exit codes as retryable", () => {
				const error0 = ExecutionError.commandFailed("cmd", 0);
				const error1 = ExecutionError.commandFailed("cmd", 1);
				const error2 = ExecutionError.commandFailed("cmd", 2);
				const error127 = ExecutionError.commandFailed("cmd", 127);

				expect(error0.isRetryable).toBe(false);
				expect(error1.isRetryable).toBe(false);
				expect(error2.isRetryable).toBe(true);
				expect(error127.isRetryable).toBe(true);
			});

			it("should handle empty context", () => {
				const error = ExecutionError.commandFailed("cmd", 1);

				expect(error.context.command).toBe("cmd");
			});
		});

		describe("timeout", () => {
			it("should create error for command timeout", () => {
				const error = ExecutionError.timeout("npm build", 30000, {
					packageName: "my-package",
				});

				expect(error.message).toBe(
					"Command timed out after 30000ms: npm build",
				);
				expect(error.context.command).toBe("npm build");
				expect(error.context.packageName).toBe("my-package");
				expect(error.isRetryable).toBe(true);
				expect(error.userMessage).toContain("npm build");
				expect(error.userMessage).toContain("30 seconds");
			});

			it("should convert milliseconds to seconds in user message", () => {
				const error1 = ExecutionError.timeout("cmd", 5000);
				const error2 = ExecutionError.timeout("cmd", 120000);

				expect(error1.userMessage).toContain("5 seconds");
				expect(error2.userMessage).toContain("120 seconds");
			});

			it("should handle empty context", () => {
				const error = ExecutionError.timeout("cmd", 1000);

				expect(error.context.command).toBe("cmd");
				expect(error.isRetryable).toBe(true);
			});
		});

		describe("invalidCommand", () => {
			it("should create error for invalid command", () => {
				const error = ExecutionError.invalidCommand(
					"npm runn build",
					"unknown command 'runn'",
					{ packageName: "my-package" },
				);

				expect(error.message).toBe(
					"Invalid command 'npm runn build': unknown command 'runn'",
				);
				expect(error.context.command).toBe("npm runn build");
				expect(error.context.packageName).toBe("my-package");
				expect(error.userMessage).toContain("npm runn build");
				expect(error.userMessage).toContain("unknown command 'runn'");
			});

			it("should not be retryable by default", () => {
				const error = ExecutionError.invalidCommand("cmd", "reason");

				expect(error.isRetryable).toBe(false);
			});

			it("should handle empty context", () => {
				const error = ExecutionError.invalidCommand("cmd", "reason");

				expect(error.context.command).toBe("cmd");
			});
		});

		describe("workerFailed", () => {
			it("should create error for worker failure", () => {
				const originalError = new Error("Worker crashed");
				const error = ExecutionError.workerFailed("tsc-worker", originalError, {
					packageName: "my-package",
				});

				expect(error.message).toBe(
					"Worker 'tsc-worker' failed: Worker crashed",
				);
				expect(error.context.workerId).toBe("tsc-worker");
				expect(error.context.packageName).toBe("my-package");
				expect(error.isRetryable).toBe(true);
				expect(error.userMessage).toContain("tsc-worker");
				expect(error.userMessage).toContain("retried on the main thread");
			});

			it("should handle empty context", () => {
				const originalError = new Error("Failed");
				const error = ExecutionError.workerFailed("worker", originalError);

				expect(error.context.workerId).toBe("worker");
				expect(error.isRetryable).toBe(true);
			});
		});
	});

	describe("getExecutionDetails", () => {
		it("should return all execution details when available", () => {
			const error = new ExecutionError(
				"Error",
				{ command: "npm test" },
				{
					exitCode: 1,
					stdout: "test output",
					stderr: "error output",
				},
			);

			const details = error.getExecutionDetails();

			expect(details).toContain("Command: npm test");
			expect(details).toContain("Exit Code: 1");
			expect(details).toContain("Stderr: error output");
			expect(details).toContain("Stdout: test output");
		});

		it("should omit missing details", () => {
			const error = new ExecutionError("Error", { command: "npm build" });

			const details = error.getExecutionDetails();

			expect(details).toContain("Command: npm build");
			expect(details).not.toContain("Exit Code:");
			expect(details).not.toContain("Stderr:");
			expect(details).not.toContain("Stdout:");
		});

		it("should return empty string when no details available", () => {
			const error = new ExecutionError("Error");

			const details = error.getExecutionDetails();

			expect(details).toBe("");
		});

		it("should format details with newlines", () => {
			const error = new ExecutionError(
				"Error",
				{ command: "cmd" },
				{ exitCode: 1, stderr: "err" },
			);

			const details = error.getExecutionDetails();
			const lines = details.split("\n");

			expect(lines.length).toBeGreaterThan(1);
			expect(lines).toContain("Command: cmd");
			expect(lines).toContain("Exit Code: 1");
		});
	});

	describe("toJSON", () => {
		it("should serialize ExecutionError to JSON with all fields", () => {
			const error = new ExecutionError(
				"Error",
				{ command: "npm test", packageName: "pkg" },
				{
					exitCode: 1,
					stdout: "output",
					stderr: "error",
					userMessage: "User message",
					isRetryable: true,
				},
			);

			const json = error.toJSON();

			expect(json.name).toBe("ExecutionError");
			expect(json.message).toBe("Error");
			expect(json.category).toBe(ErrorCategory.Execution);
			expect(json.context.command).toBe("npm test");
			expect(json.context.packageName).toBe("pkg");
			expect(json.exitCode).toBe(1);
			expect(json.stdout).toBe("output");
			expect(json.stderr).toBe("error");
			expect(json.userMessage).toBe("User message");
			expect(json.isRetryable).toBe(true);
		});

		it("should include undefined execution fields", () => {
			const error = new ExecutionError("Error");
			const json = error.toJSON();

			expect(json.exitCode).toBeUndefined();
			expect(json.stdout).toBeUndefined();
			expect(json.stderr).toBeUndefined();
		});
	});

	describe("Error Properties", () => {
		it("should have correct category", () => {
			const error = new ExecutionError("Test");

			expect(error.category).toBe(ErrorCategory.Execution);
		});

		it("should preserve stack trace", () => {
			const error = new ExecutionError("Test error");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("ExecutionError");
		});

		it("should have correct error name", () => {
			const error = ExecutionError.commandFailed("cmd");

			expect(error.name).toBe("ExecutionError");
		});
	});

	describe("Error Inheritance", () => {
		it("should be catchable as Error", () => {
			const error = ExecutionError.commandFailed("cmd");

			expect(error instanceof Error).toBe(true);
			expect(error instanceof ExecutionError).toBe(true);
		});

		it("should inherit from SailError", () => {
			const error = new ExecutionError("Test");

			expect(error.getFormattedMessage).toBeDefined();
			expect(error.getUserMessage).toBeDefined();
			expect(error.toJSON).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("should handle exit code 0", () => {
			const error = ExecutionError.commandFailed("cmd", 0);

			expect(error.exitCode).toBe(0);
			expect(error.message).toContain("exit code 0");
		});

		it("should handle negative exit codes", () => {
			const error = ExecutionError.commandFailed("cmd", -1);

			expect(error.exitCode).toBe(-1);
			expect(error.message).toContain("exit code -1");
		});

		it("should handle very large timeout values", () => {
			const error = ExecutionError.timeout("cmd", 3600000); // 1 hour

			expect(error.userMessage).toContain("3600 seconds");
		});

		it("should handle empty strings", () => {
			const error1 = ExecutionError.commandFailed("", 0, "", "");
			const error2 = ExecutionError.timeout("", 1000);
			const error3 = ExecutionError.invalidCommand("", "");

			expect(error1.message).toBeDefined();
			expect(error2.message).toBeDefined();
			expect(error3.message).toBeDefined();
		});

		it("should handle multiline stdout/stderr", () => {
			const error = ExecutionError.commandFailed(
				"cmd",
				1,
				"line1\nline2\nline3",
				"out1\nout2",
			);

			expect(error.stderr).toContain("\n");
			expect(error.stdout).toContain("\n");
			const details = error.getExecutionDetails();
			expect(details).toContain("line1\nline2\nline3");
		});
	});
});
