/**
 * Comprehensive DeclarativeTask Tests
 *
 * Coverage Target: 80%+
 *
 * Test Areas:
 * 1. DeclarativeTaskHandler construction and initialization
 * 2. File resolution via glob patterns
 * 3. Gitignore setting behavior (input, output, both, none)
 * 4. Integration with LeafWithDoneFileTask
 * 5. createDeclarativeTaskHandler factory function
 * 6. Error handling for glob operations
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDeclarativeTaskHandler } from "../../../../../src/core/tasks/leaf/declarativeTask.js";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";

// Mock globby (DeclarativeTask uses globby, not globFn)
vi.mock("globby");

describe("DeclarativeTask - Comprehensive Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("DeclarativeTaskHandler - Construction", () => {
		it("should construct with basic task definition", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**/*.ts"],
					outputGlobs: ["dist/**/*"],
				})
				.buildDeclarativeTaskHandler();

			expect(task).toBeDefined();
			expect(task.command).toContain("custom-tool");
		});

		it("should construct with custom command", () => {
			const task = new LeafTaskBuilder()
				.withCommand("custom-build --flag")
				.withDeclarativeTask({
					inputGlobs: ["src/**/*.js"],
					outputGlobs: ["build/**/*"],
				})
				.buildDeclarativeTaskHandler();

			expect(task.command).toBe("custom-build --flag");
		});

		it("should construct with task name", () => {
			const task = new LeafTaskBuilder()
				.withTaskName("custom-build")
				.withDeclarativeTask({
					inputGlobs: ["**/*.ts"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			// Task names are prefixed with package name
			expect(task.name).toBe("test-package#custom-build");
		});

		it("should construct with gitignore setting for input only", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["input"],
				})
				.buildDeclarativeTaskHandler();

			expect(task).toBeDefined();
		});

		it("should construct with gitignore setting for output only", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["output"],
				})
				.buildDeclarativeTaskHandler();

			expect(task).toBeDefined();
		});

		it("should construct with gitignore setting for both input and output", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["input", "output"],
				})
				.buildDeclarativeTaskHandler();

			expect(task).toBeDefined();
		});

		it("should construct with no gitignore setting", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			expect(task).toBeDefined();
		});
	});

	describe("DeclarativeTaskHandler - Input File Resolution", () => {
		it("should resolve input files using globby", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([
				"/test/package/src/file1.ts",
				"/test/package/src/file2.ts",
			]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/test/package")
				.withDeclarativeTask({
					inputGlobs: ["src/**/*.ts"],
					outputGlobs: ["dist/**/*"],
				})
				.buildDeclarativeTaskHandler();

			const inputs = await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["src/**/*.ts"],
				expect.objectContaining({
					cwd: "/test/package",
					absolute: true,
					gitignore: true, // default behavior for input
				}),
			);
			expect(inputs).toEqual([
				"/test/package/src/file1.ts",
				"/test/package/src/file2.ts",
			]);
		});

		it("should respect gitignore: ['input'] for input files", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/test/package")
				.withDeclarativeTask({
					inputGlobs: ["**/*.ts"],
					outputGlobs: ["dist/**"],
					gitignore: ["input"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["**/*.ts"],
				expect.objectContaining({
					gitignore: true,
				}),
			);
		});

		it("should respect gitignore: ['output'] for input files (exclude gitignore)", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/test/package")
				.withDeclarativeTask({
					inputGlobs: ["**/*.ts"],
					outputGlobs: ["dist/**"],
					gitignore: ["output"], // not "input", so gitignore should be false
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["**/*.ts"],
				expect.objectContaining({
					gitignore: false,
				}),
			);
		});

		it("should handle multiple input globs", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([
				"/test/package/src/file.ts",
				"/test/package/lib/file.js",
			]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**/*.ts", "lib/**/*.js"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["src/**/*.ts", "lib/**/*.js"],
				expect.any(Object),
			);
		});

		it("should handle empty input glob results", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["nonexistent/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			const inputs = await task.getCacheInputFiles();
			expect(inputs).toEqual([]);
		});

		it("should use absolute paths in cwd option", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/absolute/path/to/package")
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["src/**"],
				expect.objectContaining({
					cwd: "/absolute/path/to/package",
				}),
			);
		});

		it("should set absolute: true in globby options", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["src/**"],
				expect.objectContaining({
					absolute: true,
				}),
			);
		});
	});

	describe("DeclarativeTaskHandler - Output File Resolution", () => {
		it("should resolve output files using globby", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([
				"/test/package/dist/output1.js",
				"/test/package/dist/output2.js",
			]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/test/package")
				.withDeclarativeTask({
					inputGlobs: ["src/**/*.ts"],
					outputGlobs: ["dist/**/*.js"],
				})
				.buildDeclarativeTaskHandler();

			const outputs = await task.getCacheOutputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["dist/**/*.js"],
				expect.objectContaining({
					cwd: "/test/package",
					absolute: true,
					gitignore: false, // default behavior for output (includes gitignored files)
				}),
			);
			expect(outputs).toEqual([
				"/test/package/dist/output1.js",
				"/test/package/dist/output2.js",
			]);
		});

		it("should respect gitignore: ['output'] for output files", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["output"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheOutputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["dist/**"],
				expect.objectContaining({
					gitignore: true,
				}),
			);
		});

		it("should respect gitignore: ['input'] for output files (exclude gitignore)", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["input"], // not "output", so gitignore should be false
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheOutputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["dist/**"],
				expect.objectContaining({
					gitignore: false,
				}),
			);
		});

		it("should respect gitignore: ['input', 'output'] for output files", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["input", "output"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheOutputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["dist/**"],
				expect.objectContaining({
					gitignore: true,
				}),
			);
		});

		it("should handle multiple output globs", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([
				"/test/package/dist/bundle.js",
				"/test/package/build/output.css",
			]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**/*.js", "build/**/*.css"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheOutputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["dist/**/*.js", "build/**/*.css"],
				expect.any(Object),
			);
		});

		it("should handle empty output glob results", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			const outputs = await task.getCacheOutputFiles();
			expect(outputs).toEqual([]);
		});
	});

	describe("DeclarativeTaskHandler - Integration with LeafWithDoneFileTask", () => {
		it("should extend LeafWithDoneFileTask", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			// LeafWithDoneFileTask provides getDoneFileContent method
			expect(typeof task.getDoneFileContent).toBe("function");
		});

		it("should have isUpToDate method from base class", () => {
			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			expect(typeof task.isUpToDate).toBe("function");
		});

		it("should have command property from base class", () => {
			const task = new LeafTaskBuilder()
				.withCommand("custom-command")
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			expect(task.command).toBe("custom-command");
		});

		it("should have name property from base class", () => {
			const task = new LeafTaskBuilder()
				.withTaskName("build-custom")
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			// Task names are prefixed with package name
			expect(task.name).toBe("test-package#build-custom");
		});
	});

	describe("createDeclarativeTaskHandler - Factory Function", () => {
		it("should create a task handler function", () => {
			const taskDefinition = {
				inputGlobs: ["src/**/*.ts"],
				outputGlobs: ["dist/**/*.js"],
			};

			const handler = createDeclarativeTaskHandler(taskDefinition);

			expect(typeof handler).toBe("function");
		});

		it("should create task via handler function", () => {
			const taskDefinition = {
				inputGlobs: ["src/**/*.ts"],
				outputGlobs: ["dist/**/*.js"],
			};

			const handler = createDeclarativeTaskHandler(taskDefinition);
			const builder = new LeafTaskBuilder();
			const node = builder.getBuildGraphPackage();

			const task = handler(node, "custom-tool", node.context, "task-name");

			expect(task).toBeDefined();
			expect(task.command).toBe("custom-tool");
			// Task names are prefixed with package name
			expect(task.name).toBe("test-package#task-name");
		});

		it("should create task with gitignore settings", () => {
			const taskDefinition = {
				inputGlobs: ["src/**"],
				outputGlobs: ["dist/**"],
				gitignore: ["input", "output"] as const,
			};

			const handler = createDeclarativeTaskHandler(taskDefinition);
			const builder = new LeafTaskBuilder();
			const node = builder.getBuildGraphPackage();

			const task = handler(node, "tool", node.context);

			expect(task).toBeDefined();
			expect(typeof task.getCacheInputFiles).toBe("function");
		});

		it("should support multiple handlers with different definitions", () => {
			const handler1 = createDeclarativeTaskHandler({
				inputGlobs: ["src/**/*.ts"],
				outputGlobs: ["dist/**/*.js"],
			});

			const handler2 = createDeclarativeTaskHandler({
				inputGlobs: ["lib/**/*.js"],
				outputGlobs: ["build/**/*.min.js"],
			});

			expect(typeof handler1).toBe("function");
			expect(typeof handler2).toBe("function");
			expect(handler1).not.toBe(handler2);
		});

		it("should preserve task definition in created tasks", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const taskDefinition = {
				inputGlobs: ["specific/**/*.pattern"],
				outputGlobs: ["output/**/*.files"],
			};

			const handler = createDeclarativeTaskHandler(taskDefinition);
			const builder = new LeafTaskBuilder();
			const node = builder.getBuildGraphPackage();

			const task = handler(node, "tool", node.context);

			await task.getCacheInputFiles();

			expect(globby.default).toHaveBeenCalledWith(
				["specific/**/*.pattern"],
				expect.any(Object),
			);
		});
	});

	describe("DeclarativeTaskHandler - Error Handling", () => {
		it("should handle globby errors for input files", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockRejectedValue(
				new Error("Glob failed for input"),
			);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			await expect(task.getCacheInputFiles()).rejects.toThrow(
				"Glob failed for input",
			);
		});

		it("should handle globby errors for output files", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockRejectedValue(
				new Error("Glob failed for output"),
			);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
				})
				.buildDeclarativeTaskHandler();

			await expect(task.getCacheOutputFiles()).rejects.toThrow(
				"Glob failed for output",
			);
		});
	});

	describe("DeclarativeTaskHandler - Complex Scenarios", () => {
		it("should handle task with many input and output globs", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: [
						"src/**/*.ts",
						"src/**/*.tsx",
						"lib/**/*.js",
						"config/**/*.json",
					],
					outputGlobs: ["dist/**/*.js", "dist/**/*.d.ts", "build/**/*.map"],
				})
				.buildDeclarativeTaskHandler();

			await task.getCacheInputFiles();
			await task.getCacheOutputFiles();

			expect(globby.default).toHaveBeenCalledTimes(2);
		});

		it("should work with various package directories", async () => {
			const globby = await import("globby");
			vi.mocked(globby.default).mockResolvedValue([]);

			const directories = [
				"/root/packages/app",
				"/workspace/libs/utils",
				"/monorepo/tools/cli",
			];

			for (const dir of directories) {
				const task = new LeafTaskBuilder()
					.withPackageDirectory(dir)
					.withDeclarativeTask({
						inputGlobs: ["src/**"],
						outputGlobs: ["dist/**"],
					})
					.buildDeclarativeTaskHandler();

				await task.getCacheInputFiles();

				expect(globby.default).toHaveBeenCalledWith(
					["src/**"],
					expect.objectContaining({ cwd: dir }),
				);

				vi.clearAllMocks();
			}
		});

		it("should handle task with gitignore behavior changes", async () => {
			const globby = await import("globby");

			// Test input with gitignore
			vi.mocked(globby.default).mockResolvedValue([]);
			const task1 = new LeafTaskBuilder()
				.withDeclarativeTask({
					inputGlobs: ["src/**"],
					outputGlobs: ["dist/**"],
					gitignore: ["input"],
				})
				.buildDeclarativeTaskHandler();

			await task1.getCacheInputFiles();
			expect(globby.default).toHaveBeenLastCalledWith(
				["src/**"],
				expect.objectContaining({ gitignore: true }),
			);

			// Test output without gitignore
			await task1.getCacheOutputFiles();
			expect(globby.default).toHaveBeenLastCalledWith(
				["dist/**"],
				expect.objectContaining({ gitignore: false }),
			);
		});
	});
});
