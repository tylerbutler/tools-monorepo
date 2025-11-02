import { describe, it, expect } from "vitest";
import { BuildError } from "../../../../src/core/errors/BuildError.js";
import { BuildPhase } from "../../../../src/core/errors/BuildError.js";
import { ErrorCategory } from "../../../../src/core/errors/SailError.js";

describe("BuildError", () => {
	describe("Construction", () => {
		it("should create a BuildError with message and context", () => {
			const error = new BuildError("Build failed", {
				packageName: "test-package",
				taskName: "build",
			});

			expect(error).toBeInstanceOf(BuildError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("Build failed");
			expect(error.category).toBe(ErrorCategory.Build);
			expect(error.context.packageName).toBe("test-package");
			expect(error.context.taskName).toBe("build");
			expect(error.name).toBe("BuildError");
		});

		it("should create a BuildError with phase option", () => {
			const error = new BuildError(
				"Build failed",
				{ packageName: "test-package" },
				{ phase: BuildPhase.Compilation },
			);

			expect(error.phase).toBe(BuildPhase.Compilation);
		});

		it("should extract taskName from context", () => {
			const error = new BuildError("Build failed", {
				taskName: "compile",
			});

			expect(error.taskName).toBe("compile");
		});

		it("should handle empty context", () => {
			const error = new BuildError("Build failed");

			expect(error.context).toEqual({});
			expect(error.taskName).toBeUndefined();
			expect(error.phase).toBeUndefined();
		});
	});

	describe("Static Factory Methods", () => {
		describe("taskFailed", () => {
			it("should create error for task failure with reason", () => {
				const error = BuildError.taskFailed("compile", "TypeScript errors", {
					packageName: "my-package",
				});

				expect(error.message).toBe("Task 'compile' failed: TypeScript errors");
				expect(error.context.taskName).toBe("compile");
				expect(error.context.packageName).toBe("my-package");
				expect(error.phase).toBe(BuildPhase.Execution);
				expect(error.userMessage).toContain("compile");
				expect(error.userMessage).toContain("TypeScript errors");
			});

			it("should create error for task failure without reason", () => {
				const error = BuildError.taskFailed("build");

				expect(error.message).toBe("Task 'build' failed");
				expect(error.context.taskName).toBe("build");
				expect(error.userMessage).toContain("Check the task output for details");
			});

			it("should handle empty context", () => {
				const error = BuildError.taskFailed("test");

				expect(error.context.taskName).toBe("test");
				expect(error.phase).toBe(BuildPhase.Execution);
			});
		});

		describe("compilationFailed", () => {
			it("should create error for compilation failure with single error", () => {
				const errors = ["Type error on line 42"];
				const error = BuildError.compilationFailed(
					"my-package",
					"compile",
					errors,
				);

				expect(error.message).toBe(
					"Compilation failed in my-package (1 error)",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.taskName).toBe("compile");
				expect(error.phase).toBe(BuildPhase.Compilation);
				expect(error.userMessage).toContain("1 error");
			});

			it("should create error for compilation failure with multiple errors", () => {
				const errors = ["Error 1", "Error 2", "Error 3"];
				const error = BuildError.compilationFailed(
					"my-package",
					"compile",
					errors,
				);

				expect(error.message).toBe(
					"Compilation failed in my-package (3 errors)",
				);
				expect(error.userMessage).toContain("3 errors");
			});

			it("should handle context parameter", () => {
				const error = BuildError.compilationFailed(
					"pkg",
					"build",
					["error"],
					{ filePath: "/path/to/file" },
				);

				expect(error.context.filePath).toBe("/path/to/file");
				expect(error.context.packageName).toBe("pkg");
			});
		});

		describe("dependencyBuildFailed", () => {
			it("should create error for dependency build failure", () => {
				const error = BuildError.dependencyBuildFailed(
					"dep-package",
					"build",
					{ packageName: "my-package" },
				);

				expect(error.message).toBe("Dependency 'dep-package' failed to build");
				expect(error.context.taskName).toBe("build");
				expect(error.context.packageName).toBe("my-package");
				expect(error.phase).toBe(BuildPhase.Dependencies);
				expect(error.userMessage).toContain("dep-package");
			});

			it("should handle empty context", () => {
				const error = BuildError.dependencyBuildFailed("dep", "compile");

				expect(error.context.taskName).toBe("compile");
				expect(error.phase).toBe(BuildPhase.Dependencies);
			});
		});

		describe("buildTimeout", () => {
			it("should create error for build timeout with task name", () => {
				const error = BuildError.buildTimeout(30000, "compile", {
					packageName: "test-pkg",
				});

				expect(error.message).toBe("Build timed out after 30000ms");
				expect(error.context.taskName).toBe("compile");
				expect(error.context.packageName).toBe("test-pkg");
				expect(error.phase).toBe(BuildPhase.Execution);
				expect(error.isRetryable).toBe(true);
				expect(error.userMessage).toContain("30 seconds");
			});

			it("should create error for build timeout without task name", () => {
				const error = BuildError.buildTimeout(5000);

				expect(error.message).toBe("Build timed out after 5000ms");
				expect(error.context.taskName).toBeUndefined();
				expect(error.isRetryable).toBe(true);
			});
		});

		describe("packageLoadFailed", () => {
			it("should create error for package load failure", () => {
				const originalError = new Error("Cannot read package.json");
				const error = BuildError.packageLoadFailed(
					"my-package",
					"/path/to/package",
					originalError,
				);

				expect(error.message).toContain("/path/to/package");
				expect(error.message).toContain("Cannot read package.json");
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.filePath).toBe("/path/to/package");
				expect(error.phase).toBe(BuildPhase.Initialization);
				expect(error.userMessage).toContain("my-package");
			});

			it("should handle context parameter", () => {
				const originalError = new Error("Parse error");
				const error = BuildError.packageLoadFailed(
					"pkg",
					"/dir",
					originalError,
					{ taskName: "init" },
				);

				expect(error.context.taskName).toBe("init");
			});
		});

		describe("upToDateCheckFailed", () => {
			it("should create error for up-to-date check failure", () => {
				const error = BuildError.upToDateCheckFailed("my-package");

				expect(error.message).toBe(
					"Failed to check if package 'my-package' is up to date",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.phase).toBe(BuildPhase.Analysis);
				expect(error.isRetryable).toBe(true);
				expect(error.userMessage).toContain("my-package");
			});

			it("should handle context parameter", () => {
				const error = BuildError.upToDateCheckFailed("pkg", {
					taskName: "build",
				});

				expect(error.context.taskName).toBe("build");
				expect(error.context.packageName).toBe("pkg");
			});
		});

		describe("noBuildTargets", () => {
			it("should create error for no build targets with single task", () => {
				const error = BuildError.noBuildTargets(["build"]);

				expect(error.message).toBe("No build targets found for tasks: build");
				expect(error.phase).toBe(BuildPhase.Planning);
				expect(error.userMessage).toContain("build");
			});

			it("should create error for no build targets with multiple tasks", () => {
				const error = BuildError.noBuildTargets(["build", "test", "lint"]);

				expect(error.message).toBe(
					"No build targets found for tasks: build, test, lint",
				);
				expect(error.userMessage).toContain("build, test, lint");
			});

			it("should handle context parameter", () => {
				const error = BuildError.noBuildTargets(["task"], {
					packageName: "root",
				});

				expect(error.context.packageName).toBe("root");
			});
		});
	});

	describe("toJSON", () => {
		it("should serialize BuildError to JSON", () => {
			const error = new BuildError(
				"Build failed",
				{ packageName: "test-pkg", taskName: "build" },
				{ phase: BuildPhase.Execution, userMessage: "User message" },
			);

			const json = error.toJSON();

			expect(json.name).toBe("BuildError");
			expect(json.message).toBe("Build failed");
			expect(json.category).toBe(ErrorCategory.Build);
			expect(json.context.packageName).toBe("test-pkg");
			expect(json.context.taskName).toBe("build");
			expect(json.phase).toBe(BuildPhase.Execution);
			expect(json.userMessage).toBe("User message");
			expect(json.isRetryable).toBe(false);
		});

		it("should include phase when present", () => {
			const error = new BuildError("Test", {}, { phase: BuildPhase.Analysis });
			const json = error.toJSON();

			expect(json.phase).toBe(BuildPhase.Analysis);
		});

		it("should handle undefined phase", () => {
			const error = new BuildError("Test");
			const json = error.toJSON();

			expect(json.phase).toBeUndefined();
		});
	});

	describe("BuildPhase Enum", () => {
		it("should define all expected build phases", () => {
			expect(BuildPhase.Initialization).toBeDefined();
			expect(BuildPhase.Planning).toBeDefined();
			expect(BuildPhase.Analysis).toBeDefined();
			expect(BuildPhase.Dependencies).toBeDefined();
			expect(BuildPhase.Compilation).toBeDefined();
			expect(BuildPhase.Execution).toBeDefined();
		});
	});

	describe("Error Inheritance", () => {
		it("should be catchable as Error", () => {
			const error = BuildError.taskFailed("test");

			expect(error instanceof Error).toBe(true);
			expect(error instanceof BuildError).toBe(true);
		});

		it("should preserve stack trace", () => {
			const error = new BuildError("Test error");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("BuildError");
		});

		it("should have correct error name", () => {
			const error = BuildError.compilationFailed("pkg", "compile", []);

			expect(error.name).toBe("BuildError");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty error array in compilationFailed", () => {
			const error = BuildError.compilationFailed("pkg", "compile", []);

			expect(error.message).toContain("0 errors");
		});

		it("should handle empty task array in noBuildTargets", () => {
			const error = BuildError.noBuildTargets([]);

			expect(error.message).toContain("No build targets found for tasks:");
		});

		it("should handle very long timeout values", () => {
			const error = BuildError.buildTimeout(3600000); // 1 hour

			expect(error.message).toContain("3600000ms");
			expect(error.userMessage).toContain("3600 seconds");
		});
	});
});
