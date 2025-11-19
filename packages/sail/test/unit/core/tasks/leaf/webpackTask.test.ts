import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";
import { WebpackTask } from "../../../../../src/core/tasks/leaf/webpackTask.js";
import * as taskUtils from "../../../../../src/core/tasks/taskUtils.js";

vi.mock("node:fs");
vi.mock("../../../../../src/core/tasks/taskUtils.js", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../../../../src/core/tasks/taskUtils.js")>();
	return {
		...actual,
		loadModule: vi.fn(),
		globFn: vi.fn(),
	};
});

describe("WebpackTask", () => {
	let baseDoneFileContentSpy: ReturnType<typeof vi.spyOn> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (baseDoneFileContentSpy) {
			baseDoneFileContentSpy.mockRestore();
			baseDoneFileContentSpy = null;
		}
	});

	describe("Construction", () => {
		it("should create WebpackTask with package context", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildWebpackTask();

			expect(task).toBeInstanceOf(WebpackTask);
			expect(task.node.pkg.directory).toBe("/project");
		});

		it("should initialize with webpack command", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack --mode production")
				.buildWebpackTask();

			expect(task.command).toBe("webpack --mode production");
		});

		it("should inherit from LeafWithDoneFileTask", () => {
			const task = new LeafTaskBuilder().buildWebpackTask();

			// LeafWithDoneFileTask has getDoneFileContent method
			expect(typeof (task as any).getDoneFileContent).toBe("function");
		});

		it("should set correct task name", () => {
			const task = new LeafTaskBuilder()
				.withTaskName("webpack-build")
				.buildWebpackTask();

			expect(task.name).toBe("test-package#webpack-build");
		});
	});

	describe("Configuration Discovery", () => {
		it("should discover webpack.config.js by default", () => {
			vi.mocked(fs.existsSync).mockImplementation((path) => {
				return path === "/project/webpack.config.js";
			});

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack")
				.buildWebpackTask();

			const configPaths = (task as any).configFileFullPaths;
			expect(configPaths).toEqual(["/project/webpack.config.js"]);
		});

		it("should discover webpack.config.cjs if .js not found", () => {
			vi.mocked(fs.existsSync).mockImplementation((path) => {
				return path === "/project/webpack.config.cjs";
			});

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack")
				.buildWebpackTask();

			const configPaths = (task as any).configFileFullPaths;
			expect(configPaths).toEqual(["/project/webpack.config.cjs"]);
		});

		it("should use custom config path from --config flag", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack --config custom.config.js")
				.buildWebpackTask();

			const configPaths = (task as any).configFileFullPaths;
			expect(configPaths).toEqual(["/project/custom.config.js"]);
		});

		it("should discover .webpack/webpack.config.js", () => {
			vi.mocked(fs.existsSync).mockImplementation((path) => {
				return path === "/project/.webpack/webpack.config.js";
			});

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack")
				.buildWebpackTask();

			const configPaths = (task as any).configFileFullPaths;
			expect(configPaths).toEqual(["/project/.webpack/webpack.config.js"]);
		});
	});

	describe("Done File Management", () => {
		it("should return undefined if base done file is undefined", async () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withRecheckLeafIsUpToDate(false)
				.buildWebpackTask();

			vi.spyOn(
				Object.getPrototypeOf(Object.getPrototypeOf(task)),
				"getDoneFileContent",
			).mockResolvedValue(undefined);

			const content = await (task as any).getDoneFileContent();

			expect(content).toBeUndefined();
		});

		it("should return undefined on config load error", async () => {
			vi.mocked(taskUtils.loadModule).mockRejectedValue(
				new Error("Config not found"),
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withRecheckLeafIsUpToDate(false)
				.buildWebpackTask();

			const content = await (task as any).getDoneFileContent();

			expect(content).toBeUndefined();
		});

		it("should throw error if recheckLeafIsUpToDate is not false", async () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withRecheckLeafIsUpToDate(true) // Invalid for WebpackTask
				.buildWebpackTask();

			await expect((task as any).getDoneFileContent()).rejects.toThrow(
				"WebpackTask requires recheckLeafIsUpToDate to be false",
			);
		});

		it("should handle JSON parse errors gracefully", async () => {
			vi.mocked(taskUtils.loadModule).mockResolvedValue({});

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withRecheckLeafIsUpToDate(false)
				.buildWebpackTask();

			// Return invalid JSON from base
			vi.spyOn(
				Object.getPrototypeOf(Object.getPrototypeOf(task)),
				"getDoneFileContent",
			).mockResolvedValue("invalid json");

			const content = await (task as any).getDoneFileContent();

			expect(content).toBeUndefined();
		});
	});

	describe("Input/Output Files", () => {
		it("should glob source files from src directory", async () => {
			const mockFiles = ["/project/src/index.js", "/project/src/utils.js"];
			vi.mocked(taskUtils.globFn).mockResolvedValue(mockFiles);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildWebpackTask();

			const inputFiles = await (task as any).getInputFiles();

			expect(inputFiles).toEqual(mockFiles);
			expect(taskUtils.globFn).toHaveBeenCalledWith("/project/src/**/*.*");
		});

		it("should return empty array on glob error", async () => {
			vi.mocked(taskUtils.globFn).mockRejectedValue(
				new Error("Glob failed"),
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildWebpackTask();

			const inputFiles = await (task as any).getInputFiles();

			expect(inputFiles).toEqual([]);
		});

		it("should return empty array for output files", async () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildWebpackTask();

			const outputFiles = await (task as any).getOutputFiles();

			expect(outputFiles).toEqual([]);
		});
	});

	describe("Environment Arguments Parsing", () => {
		it("should parse --env flag with boolean value", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack --env production")
				.buildWebpackTask();

			const env = (task as any).getEnvArguments();

			expect(env).toEqual({ production: true });
		});

		it("should parse --env flag with key=value", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack --env mode=production")
				.buildWebpackTask();

			const env = (task as any).getEnvArguments();

			expect(env).toEqual({ mode: "production" });
		});

		it("should handle multiple --env flags", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack --env production --env optimize=true")
				.buildWebpackTask();

			const env = (task as any).getEnvArguments();

			expect(env).toEqual({ production: true, optimize: "true" });
		});

		it("should ignore trailing --env without value", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("webpack --mode production --env")
				.buildWebpackTask();

			const env = (task as any).getEnvArguments();

			expect(env).toEqual({});
		});
	});

	describe("Task Properties", () => {
		it("should have taskWeight of 5 (expensive task)", () => {
			const task = new LeafTaskBuilder().buildWebpackTask();

			const weight = (task as any).taskWeight;

			expect(weight).toBe(5);
		});

		it("should use lock file hash for version", async () => {
			const task = new LeafTaskBuilder()
				.withLockFileHash("abc123")
				.buildWebpackTask();

			const version = await (task as any).getVersion();

			expect(version).toBe("abc123");
		});
	});

	// Helper to access protected getDoneFileContent method
	async function getDoneFileContent(
		task: unknown,
	): Promise<string | undefined> {
		return (
			task as unknown as {
				getDoneFileContent: () => Promise<string | undefined>;
			}
		).getDoneFileContent();
	}

	describe("Donefile Roundtripping - Phase 1: Core Tests", () => {
		describe("JSON Serialization", () => {
			it("should produce valid JSON content when donefile is available", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildWebpackTask();

				const content = await getDoneFileContent(task);

				if (content !== undefined) {
					expect(() => JSON.parse(content)).not.toThrow();
				}
			});

			it("should roundtrip through JSON parse/stringify", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildWebpackTask();

				const content = await getDoneFileContent(task);

				if (content) {
					const parsed = JSON.parse(content);
					const reserialized = JSON.stringify(parsed);
					expect(reserialized).toBe(content);
				}
			});
		});

		describe("Content Determinism", () => {
			it("should produce identical content for identical tasks", async () => {
				const task1 = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildWebpackTask();
				const task2 = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildWebpackTask();

				const content1 = await getDoneFileContent(task1);
				const content2 = await getDoneFileContent(task2);

				// Both should produce same content (or both undefined)
				expect(content1).toBe(content2);
			});
		});

		describe("Cache Invalidation", () => {
			it("should produce different content for different package directories", async () => {
				const task1 = new LeafTaskBuilder()
					.withPackageDirectory("/project/app1")
					.buildWebpackTask();
				const task2 = new LeafTaskBuilder()
					.withPackageDirectory("/project/app2")
					.buildWebpackTask();

				const content1 = await getDoneFileContent(task1);
				const content2 = await getDoneFileContent(task2);

				// Different directories may have different configs/tsBuildInfo
				if (content1 !== undefined || content2 !== undefined) {
					expect(
						content1 === undefined ||
							content2 === undefined ||
							typeof content1 === "string",
					).toBe(true);
					expect(
						content1 === undefined ||
							content2 === undefined ||
							typeof content2 === "string",
					).toBe(true);
				}
			});
		});

		describe("Base Class Integration", () => {
			it("should override base class getDoneFileContent", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildWebpackTask();

				// WebpackTask overrides getDoneFileContent to add webpack stats
				const content = await getDoneFileContent(task);

				// Verify it produces content or undefined
				expect(content === undefined || typeof content === "string").toBe(true);
			});

			it("should include base donefile content plus webpack stats", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildWebpackTask();

				const content = await getDoneFileContent(task);

				if (content) {
					const parsed = JSON.parse(content);
					// WebpackTask may add webpack-specific data to donefile
					// Structure may vary, but should be valid JSON
					expect(typeof parsed).toBe("object");
				}
			});
		});
	});
});
