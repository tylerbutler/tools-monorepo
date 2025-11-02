import { describe, it, expect } from "vitest";
import { DependencyError } from "../../../../src/core/errors/DependencyError.js";
import { ErrorCategory } from "../../../../src/core/errors/SailError.js";

describe("DependencyError", () => {
	describe("Construction", () => {
		it("should create a DependencyError with message and context", () => {
			const error = new DependencyError("Dependency error", {
				packageName: "test-package",
			});

			expect(error).toBeInstanceOf(DependencyError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("Dependency error");
			expect(error.category).toBe(ErrorCategory.Dependency);
			expect(error.context.packageName).toBe("test-package");
			expect(error.name).toBe("DependencyError");
		});

		it("should handle empty context", () => {
			const error = new DependencyError("Error");

			expect(error.context).toEqual({});
		});

		it("should accept options parameter", () => {
			const error = new DependencyError(
				"Error",
				{},
				{
					userMessage: "User message",
					isRetryable: true,
				},
			);

			expect(error.userMessage).toBe("User message");
			expect(error.isRetryable).toBe(true);
		});
	});

	describe("Static Factory Methods", () => {
		describe("circularPackageDependency", () => {
			it("should create error for circular package dependency with current package", () => {
				const chain = ["pkg-a", "pkg-b", "pkg-c", "pkg-a"];
				const error = DependencyError.circularPackageDependency(
					chain,
					"pkg-a",
				);

				expect(error.message).toBe(
					"Circular package dependency detected: pkg-a -> pkg-b -> pkg-c -> pkg-a",
				);
				expect(error.context.packageName).toBe("pkg-a");
				expect(error.context.dependencyChain).toEqual(chain);
				expect(error.userMessage).toContain("Circular dependency detected");
				expect(error.userMessage).toContain("pkg-a -> pkg-b -> pkg-c -> pkg-a");
			});

			it("should create error for circular package dependency without current package", () => {
				const chain = ["pkg-x", "pkg-y", "pkg-x"];
				const error = DependencyError.circularPackageDependency(chain);

				expect(error.message).toContain("pkg-x -> pkg-y -> pkg-x");
				expect(error.context.packageName).toBeUndefined();
				expect(error.context.dependencyChain).toEqual(chain);
			});

			it("should handle short circular chain", () => {
				const chain = ["pkg", "pkg"];
				const error = DependencyError.circularPackageDependency(chain);

				expect(error.message).toContain("pkg -> pkg");
			});
		});

		describe("circularTaskDependency", () => {
			it("should create error for circular task dependency with package name", () => {
				const chain = ["build", "compile", "prepare", "build"];
				const error = DependencyError.circularTaskDependency(
					chain,
					"my-package",
				);

				expect(error.message).toBe(
					"Circular dependency in dependent tasks: build -> compile -> prepare -> build",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.dependencyChain).toEqual(chain);
				expect(error.userMessage).toContain("Circular task dependency");
				expect(error.userMessage).toContain(
					"build -> compile -> prepare -> build",
				);
			});

			it("should create error for circular task dependency without package name", () => {
				const chain = ["task1", "task2", "task1"];
				const error = DependencyError.circularTaskDependency(chain);

				expect(error.message).toContain("task1 -> task2 -> task1");
				expect(error.context.packageName).toBeUndefined();
			});
		});

		describe("missingPackageDependency", () => {
			it("should create error for missing package dependency with package name", () => {
				const error = DependencyError.missingPackageDependency(
					"dep-package",
					"my-package",
				);

				expect(error.message).toBe("Missing package dependency 'dep-package'");
				expect(error.context.packageName).toBe("my-package");
				expect(error.userMessage).toContain("dep-package");
				expect(error.userMessage).toContain("package.json");
			});

			it("should create error for missing package dependency without package name", () => {
				const error = DependencyError.missingPackageDependency("missing-dep");

				expect(error.message).toContain("missing-dep");
				expect(error.context.packageName).toBeUndefined();
			});
		});

		describe("versionMismatch", () => {
			it("should create error for version mismatch with package name", () => {
				const error = DependencyError.versionMismatch(
					"react",
					"^18.0.0",
					"17.0.2",
					"my-package",
				);

				expect(error.message).toBe(
					"Version mismatch for 'react': expected ^18.0.0, got 17.0.2",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.userMessage).toContain("react");
				expect(error.userMessage).toContain("^18.0.0");
				expect(error.userMessage).toContain("17.0.2");
			});

			it("should create error for version mismatch without package name", () => {
				const error = DependencyError.versionMismatch(
					"typescript",
					"5.0.0",
					"4.9.5",
				);

				expect(error.message).toContain("typescript");
				expect(error.message).toContain("5.0.0");
				expect(error.message).toContain("4.9.5");
				expect(error.context.packageName).toBeUndefined();
			});
		});

		describe("unresolvedTaskDependency", () => {
			it("should create error for unresolved task dependency with package name", () => {
				const error = DependencyError.unresolvedTaskDependency(
					"build",
					"^compile",
					"my-package",
				);

				expect(error.message).toBe(
					"Unresolved task dependency '^compile' for task 'build'",
				);
				expect(error.context.packageName).toBe("my-package");
				expect(error.context.taskName).toBe("build");
				expect(error.userMessage).toContain("build");
				expect(error.userMessage).toContain("^compile");
			});

			it("should create error for unresolved task dependency without package name", () => {
				const error = DependencyError.unresolvedTaskDependency("task", "dep");

				expect(error.message).toContain("task");
				expect(error.message).toContain("dep");
				expect(error.context.packageName).toBeUndefined();
				expect(error.context.taskName).toBe("task");
			});
		});
	});

	describe("Error Properties", () => {
		it("should have correct category", () => {
			const error = new DependencyError("Test");

			expect(error.category).toBe(ErrorCategory.Dependency);
		});

		it("should preserve stack trace", () => {
			const error = new DependencyError("Test error");

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain("DependencyError");
		});

		it("should have correct error name", () => {
			const error = DependencyError.missingPackageDependency("dep");

			expect(error.name).toBe("DependencyError");
		});
	});

	describe("Error Inheritance", () => {
		it("should be catchable as Error", () => {
			const error = DependencyError.missingPackageDependency("dep");

			expect(error instanceof Error).toBe(true);
			expect(error instanceof DependencyError).toBe(true);
		});

		it("should inherit from SailError", () => {
			const error = new DependencyError("Test");

			expect(error.getFormattedMessage).toBeDefined();
			expect(error.getUserMessage).toBeDefined();
			expect(error.toJSON).toBeDefined();
		});
	});

	describe("Message Formatting", () => {
		it("should format message with package name", () => {
			const error = DependencyError.missingPackageDependency("dep", "pkg");
			const formatted = error.getFormattedMessage();

			expect(formatted).toContain("pkg");
		});

		it("should use user message when available", () => {
			const error = DependencyError.versionMismatch("lib", "1.0", "2.0", "pkg");
			const userMsg = error.getUserMessage();

			expect(userMsg).toContain("lib");
			expect(userMsg).toContain("1.0");
			expect(userMsg).toContain("2.0");
		});
	});

	describe("JSON Serialization", () => {
		it("should serialize to JSON", () => {
			const error = new DependencyError(
				"Dep error",
				{ packageName: "test", dependencyChain: ["a", "b"] },
				{ userMessage: "User message" },
			);

			const json = error.toJSON();

			expect(json.name).toBe("DependencyError");
			expect(json.message).toBe("Dep error");
			expect(json.category).toBe(ErrorCategory.Dependency);
			expect(json.context.packageName).toBe("test");
			expect(json.context.dependencyChain).toEqual(["a", "b"]);
			expect(json.userMessage).toBe("User message");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty dependency chain", () => {
			const error = DependencyError.circularPackageDependency([]);

			expect(error.message).toContain("Circular package dependency");
			expect(error.context.dependencyChain).toEqual([]);
		});

		it("should handle single-element chain", () => {
			const error = DependencyError.circularTaskDependency(["task"]);

			expect(error.message).toContain("task");
			expect(error.context.dependencyChain).toEqual(["task"]);
		});

		it("should handle special characters in package names", () => {
			const error = DependencyError.missingPackageDependency("@scope/package");

			expect(error.message).toContain("@scope/package");
		});

		it("should handle version wildcards", () => {
			const error = DependencyError.versionMismatch("lib", "*", "1.0.0");

			expect(error.message).toContain("*");
			expect(error.message).toContain("1.0.0");
		});

		it("should handle empty version strings", () => {
			const error = DependencyError.versionMismatch("lib", "", "");

			expect(error.message).toBeDefined();
		});
	});
});
