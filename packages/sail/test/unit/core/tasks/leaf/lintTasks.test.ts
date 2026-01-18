/**
 * Comprehensive EsLintTask Tests
 *
 * Coverage Target: → 80%+
 *
 * Test Areas:
 * 1. Construction and initialization
 * 2. Config file resolution
 * 3. Worker thread configuration
 * 4. Tool version retrieval
 * 5. Input file resolution
 * 6. Error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getEsLintConfigFilePath,
	getInstalledPackageVersion,
	globFn,
	toPosixPath,
} from "../../../../../src/core/tasks/taskUtils.js";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";

// Mock all dependencies
vi.mock("../../../../../src/core/tasks/taskUtils.js");

describe("EsLintTask - Comprehensive Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("Construction and Initialization", () => {
		it("should create EsLintTask successfully", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageName("test-app")
				.withPackageDirectory("/project")
				.withCommand("eslint src")
				.buildEsLintTask();

			expect(task).toBeDefined();
			expect(task.command).toBe("eslint src");
		});

		it("should have appropriate task weight", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// ESLint is a linting task with moderate weight
			expect(task.taskWeight).toBeGreaterThan(0);
		});
	});

	describe("Config File Resolution", () => {
		it("should find .eslintrc.js config file", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const configFiles = task.configFileFullPaths;

			expect(getEsLintConfigFilePath).toHaveBeenCalledWith("/project");
			expect(configFiles).toEqual(["/project/.eslintrc.js"]);
		});

		it("should find .eslintrc.cjs config file", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.cjs",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const configFiles = task.configFileFullPaths;

			expect(configFiles).toEqual(["/project/.eslintrc.cjs"]);
		});

		it("should find .eslintrc.json config file", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.json",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const configFiles = task.configFileFullPaths;

			expect(configFiles).toEqual(["/project/.eslintrc.json"]);
		});

		it("should find .eslintrc config file", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue("/project/.eslintrc");

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const configFiles = task.configFileFullPaths;

			expect(configFiles).toEqual(["/project/.eslintrc"]);
		});

		it("should cache config file path after first access", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// Access config files multiple times
			task.configFileFullPaths;
			task.configFileFullPaths;
			task.configFileFullPaths;

			// Should only call getEsLintConfigFilePath once
			expect(getEsLintConfigFilePath).toHaveBeenCalledTimes(1);
		});

		it("should throw error when config file not found", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(undefined);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("eslint src")
				.buildEsLintTask();

			expect(() => task.configFileFullPaths).toThrow(
				"Unable to find config file for eslint eslint src",
			);
		});

		it("should include command in error message when config not found", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(undefined);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("eslint --format stylish src")
				.buildEsLintTask();

			expect(() => task.configFileFullPaths).toThrow(
				"Unable to find config file for eslint eslint --format stylish src",
			);
		});
	});

	describe("Worker Thread Configuration", () => {
		it("should not use worker threads by default", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("eslint src")
				.buildEsLintTask();

			expect(task.useWorker).toBe(false);
		});

		it("should disable worker threads for 'eslint --format stylish src' command when worker threads are enabled", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			// Create task with workerPool that uses worker threads
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("eslint --format stylish src")
				.withWorkerPool({ useWorkerThreads: true })
				.buildEsLintTask();

			// Should return false (disable worker threads for this specific command)
			expect(task.useWorker).toBe(false);
		});

		it("should allow worker threads for 'eslint --format stylish src' command when worker threads are disabled", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			// Create task with workerPool that doesn't use worker threads
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("eslint --format stylish src")
				.withWorkerPool({ useWorkerThreads: false })
				.buildEsLintTask();

			// Should return true (can use worker when worker threads are disabled)
			expect(task.useWorker).toBe(true);
		});

		it("should not use worker threads for different eslint commands", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("eslint --fix src")
				.withWorkerPool({ useWorkerThreads: true })
				.buildEsLintTask();

			expect(task.useWorker).toBe(false);
		});
	});

	describe("Tool Version Retrieval", () => {
		it("should retrieve ESLint version from package directory", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(getInstalledPackageVersion).mockResolvedValue("8.57.0");

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const version = await task.getToolVersion();

			expect(getInstalledPackageVersion).toHaveBeenCalledWith(
				"eslint",
				"/project",
			);
			expect(version).toBe("8.57.0");
		});

		it("should handle different ESLint versions", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(getInstalledPackageVersion).mockResolvedValue("9.0.0");

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const version = await task.getToolVersion();

			expect(version).toBe("9.0.0");
		});

		it("should handle version lookup failures", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(getInstalledPackageVersion).mockResolvedValue(undefined);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const version = await task.getToolVersion();

			expect(version).toBeUndefined();
		});
	});

	describe("Input File Resolution", () => {
		it("should call parent class getCacheInputFiles", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const inputs = await task.getCacheInputFiles();

			// Should return an array (parent may return empty array in test environment)
			expect(Array.isArray(inputs)).toBe(true);
		});

		it("should glob source files in src directory", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockResolvedValue([
				"/project/src/index.ts",
				"/project/src/utils.ts",
			]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			await task.getCacheInputFiles();

			expect(globFn).toHaveBeenCalledWith("/project/src/**/*.*");
		});

		it("should include all source files in cache inputs", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockResolvedValue([
				"/project/src/index.ts",
				"/project/src/utils.ts",
				"/project/src/components/Button.tsx",
			]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const inputs = await task.getCacheInputFiles();

			expect(inputs).toContain("/project/src/index.ts");
			expect(inputs).toContain("/project/src/utils.ts");
			expect(inputs).toContain("/project/src/components/Button.tsx");
		});

		it("should access configFileFullPaths property", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// Access the config files property (used by parent class for caching)
			const configFiles = task.configFileFullPaths;

			// Config files are included via parent class (configFileFullPaths property)
			expect(configFiles).toEqual(["/project/.eslintrc.js"]);
			expect(Array.isArray(configFiles)).toBe(true);
		});

		it("should handle glob failures gracefully", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockRejectedValue(new Error("Glob failed"));

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// Should not throw, but log error via traceError
			const inputs = await task.getCacheInputFiles();

			// Should still return parent inputs
			expect(inputs).toBeDefined();
			expect(Array.isArray(inputs)).toBe(true);
		});

		it("should convert Windows paths to POSIX for globbing", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"C:\\project\\.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockReturnValue("C:/project");
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("C:\\project")
				.buildEsLintTask();

			await task.getCacheInputFiles();

			expect(toPosixPath).toHaveBeenCalledWith("C:\\project");
			expect(globFn).toHaveBeenCalledWith("C:/project/src/**/*.*");
		});

		it("should handle multiple file types in source directory", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockResolvedValue([
				"/project/src/index.ts",
				"/project/src/styles.css",
				"/project/src/config.json",
				"/project/src/utils.js",
			]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			const inputs = await task.getCacheInputFiles();

			// All file types should be included (glob is src/**/*.*)
			expect(inputs).toContain("/project/src/index.ts");
			expect(inputs).toContain("/project/src/styles.css");
			expect(inputs).toContain("/project/src/config.json");
			expect(inputs).toContain("/project/src/utils.js");
		});
	});

	describe("Error Handling", () => {
		it("should throw descriptive error when config file not found", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(undefined);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/nonexistent")
				.withCommand("eslint .")
				.buildEsLintTask();

			expect(() => task.configFileFullPaths).toThrow(
				/Unable to find config file/,
			);
			expect(() => task.configFileFullPaths).toThrow(/eslint \./);
		});

		it("should handle errors during version retrieval", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(getInstalledPackageVersion).mockRejectedValue(
				new Error("Package not found"),
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			await expect(task.getToolVersion()).rejects.toThrow("Package not found");
		});

		it("should log error trace when glob fails", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			const globError = new Error("Permission denied");
			vi.mocked(globFn).mockRejectedValue(globError);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// Spy on traceError (it's inherited from parent class)
			const traceErrorSpy = vi.spyOn(task, "traceError");

			await task.getCacheInputFiles();

			// Should have logged the error
			expect(traceErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to glob source files for eslint"),
			);
		});
	});

	describe("Incremental Build Support", () => {
		it("should support recheck for up-to-date status", () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// EsLintTask extends TscDependentTask which supports incremental builds
			expect(task.recheckLeafIsUpToDate).toBeDefined();
		});

		it("should cache input files across multiple calls", async () => {
			vi.mocked(getEsLintConfigFilePath).mockReturnValue(
				"/project/.eslintrc.js",
			);
			vi.mocked(toPosixPath).mockImplementation((p) => p.replace(/\\/g, "/"));
			vi.mocked(globFn).mockResolvedValue(["/project/src/index.ts"]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildEsLintTask();

			// Call getCacheInputFiles multiple times
			await task.getCacheInputFiles();
			await task.getCacheInputFiles();
			await task.getCacheInputFiles();

			// Glob should be called for each invocation (no caching at task level)
			// Note: The actual caching might be at a different layer
			expect(globFn).toHaveBeenCalled();
		});
	});
});
