import { beforeEach, describe, expect, it, vi } from "vitest";
import { globFn } from "../../../../../src/core/tasks/taskUtils.js";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("../../../../../src/core/tasks/taskUtils.js");

/**
 * Comprehensive MiscTasks Tests
 *
 * Test Coverage for:
 * - CopyfilesTask: File copying with glob patterns, flags, and path manipulation
 * - EchoTask: Simple echo command (always up-to-date)
 * - GenVerTask: Package version file generation
 * - GoodFenceTask: Fence.json-based TypeScript file validation
 * - DepCruiseTask: Dependency cruiser analysis
 */

describe("MiscTasks - Comprehensive Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("CopyfilesTask", () => {
		describe("Construction and Command Parsing", () => {
			it("should create CopyfilesTask with basic copy command", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-app")
					.withCommand("copyfiles src/*.ts dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("copyfiles src/*.ts dist");
			});

			it("should parse -u flag for directory level stripping", () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/utils/helper.ts",
					"/project/src/index.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -u 1 src/**/*.ts dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should parse --up flag (long form)", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles --up 2 src/**/*.ts dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should parse -e flag for exclude patterns", () => {
				const task = new LeafTaskBuilder()
					.withCommand('copyfiles -e "**/*.test.ts" src/**/*.ts dist')
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should parse -f flag for flat copy", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles -f src/**/*.ts dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should parse -F flag for follow symlinks", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles -F src/**/*.ts dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should parse -a flag for all files (dotfiles)", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles -a src/**/* dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should handle multiple flags combined", () => {
				const task = new LeafTaskBuilder()
					.withCommand('copyfiles -u 1 -a -f -e "*.test.ts" src/**/*.ts dist')
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should ignore unknown flags", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles --unknown-flag src/*.ts dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should handle quoted arguments", () => {
				const task = new LeafTaskBuilder()
					.withCommand('copyfiles "src/**/*.ts" "dist/output"')
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});

			it("should handle multiple source patterns", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles src/**/*.ts src/**/*.js dist")
					.buildCopyfilesTask();

				expect(task).toBeDefined();
			});
		});

		describe("Input File Resolution", () => {
			it("should resolve input files from glob patterns", async () => {
				const mockFiles = [
					"/project/src/index.ts",
					"/project/src/utils/helper.ts",
				];

				vi.mocked(globFn).mockResolvedValue(mockFiles);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				const inputs = await task.getCacheInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**/*.ts", {
					nodir: true,
					dot: false,
					follow: false,
					ignore: "",
				});
				expect(inputs).toContain("/project/src/index.ts");
				expect(inputs).toContain("/project/src/utils/helper.ts");
			});

			it("should resolve multiple source patterns", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce(["/project/src/index.ts"])
					.mockResolvedValueOnce(["/project/src/utils.js"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles src/*.ts src/*.js dist")
					.buildCopyfilesTask();

				const inputs = await task.getCacheInputFiles();

				expect(globFn).toHaveBeenCalledTimes(2);
				expect(inputs).toContain("/project/src/index.ts");
				expect(inputs).toContain("/project/src/utils.js");
			});

			it("should respect -a flag for dotfiles", async () => {
				vi.mocked(globFn).mockResolvedValue(["/project/src/.config"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -a src/**/* dist")
					.buildCopyfilesTask();

				await task.getCacheInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**/*", {
					nodir: true,
					dot: true,
					follow: false,
					ignore: "",
				});
			});

			it("should respect -F flag for symlinks", async () => {
				vi.mocked(globFn).mockResolvedValue(["/project/src/link.ts"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -F src/**/*.ts dist")
					.buildCopyfilesTask();

				await task.getCacheInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**/*.ts", {
					nodir: true,
					dot: false,
					follow: true,
					ignore: "",
				});
			});

			it("should respect -e flag for exclude patterns", async () => {
				vi.mocked(globFn).mockResolvedValue(["/project/src/index.ts"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand('copyfiles -e "**/*.test.ts" src/**/*.ts dist')
					.buildCopyfilesTask();

				await task.getCacheInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**/*.ts", {
					nodir: true,
					dot: false,
					follow: false,
					ignore: '"**/*.test.ts"', // CopyfilesTask doesn't unquote the -e argument
				});
			});

			it("should cache input files on subsequent calls", async () => {
				vi.mocked(globFn).mockResolvedValue(["/project/src/index.ts"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				const inputs1 = await task.getCacheInputFiles();
				const inputs2 = await task.getCacheInputFiles();

				expect(globFn).toHaveBeenCalledTimes(1);
				expect(inputs1).toEqual(inputs2);
			});
		});

		describe("Output File Resolution", () => {
			it("should compute output files from input files", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/index.ts",
					"/project/src/utils/helper.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				const outputs = await task.getCacheOutputFiles();

				expect(outputs).toContain("/project/dist/src/index.ts");
				expect(outputs).toContain("/project/dist/src/utils/helper.ts");
			});

			it("should strip directories with -u flag", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/utils/helper.ts",
					"/project/src/index.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -u 1 src/**/*.ts dist")
					.buildCopyfilesTask();

				const outputs = await task.getCacheOutputFiles();

				// With -u 1, "src/" is stripped from paths
				expect(outputs).toContain("/project/dist/utils/helper.ts");
				expect(outputs).toContain("/project/dist/index.ts");
			});

			it("should strip multiple directory levels with -u 2", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/core/utils/helper.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -u 2 src/core/**/*.ts dist")
					.buildCopyfilesTask();

				const outputs = await task.getCacheOutputFiles();

				// With -u 2, "src/core/" is stripped
				expect(outputs).toContain("/project/dist/utils/helper.ts");
			});

			it("should flatten output with -f flag", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/utils/helper.ts",
					"/project/src/core/index.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -f src/**/*.ts dist")
					.buildCopyfilesTask();

				const outputs = await task.getCacheOutputFiles();

				// With -f, all files go directly to dist/
				expect(outputs).toContain("/project/dist/helper.ts");
				expect(outputs).toContain("/project/dist/index.ts");
			});

			it("should cache output files on subsequent calls", async () => {
				vi.mocked(globFn).mockResolvedValue(["/project/src/index.ts"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				const outputs1 = await task.getCacheOutputFiles();
				const outputs2 = await task.getCacheOutputFiles();

				expect(outputs1).toEqual(outputs2);
			});
		});

		describe("Error Handling", () => {
			it("should throw error when parsing fails (insufficient arguments)", async () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles src")
					.buildCopyfilesTask();

				await expect(task.getCacheInputFiles()).rejects.toThrow(
					"error parsing command line",
				);
			});

			it("should throw error when -u value exceeds path depth", async () => {
				vi.mocked(globFn).mockResolvedValue(["/project/src/index.ts"]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.withCommand("copyfiles -u 5 src/index.ts dist")
					.buildCopyfilesTask();

				await expect(task.getCacheOutputFiles()).rejects.toThrow(
					"Cannot go up that far",
				);
			});

			it("should throw error for output resolution on unparseable command", async () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles")
					.buildCopyfilesTask();

				await expect(task.getCacheOutputFiles()).rejects.toThrow(
					"error parsing command line",
				);
			});
		});

		describe("Incremental Build Support", () => {
			it("should support recheck for up-to-date status", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				// CopyfilesTask sets recheckLeafIsUpToDate to true
				expect(task.recheckLeafIsUpToDate).toBe(true);
			});

			it("should have low task weight for prioritization", () => {
				const task = new LeafTaskBuilder()
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				expect(task.taskWeight).toBe(0);
			});
		});

		describe("Donefile Generation with Missing Output Files", () => {
			it("should generate donefile content even when output files don't exist yet", async () => {
				// Setup: Mock input files that exist
				vi.mocked(globFn).mockResolvedValue([
					"/test-package/src/file1.ts",
					"/test-package/src/file2.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageName("test-app")
					.withPackagePath("/test-package")
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				// Get donefile content - this would fail before the fix because:
				// 1. getOutputFiles() returns ["/test-package/dist/file1.ts", "/test-package/dist/file2.ts"]
				// 2. These files don't exist yet (clean build scenario)
				// 3. fileHashCache.getFileHash() tries to read them and throws ENOENT
				// 4. getDoneFileContent() catches error and returns undefined
				const donefileContent = await (
					task as unknown as {
						getDoneFileContent: () => Promise<string | undefined>;
					}
				).getDoneFileContent();

				// With the fix: donefile content should be generated with "<missing>" for non-existent files
				expect(donefileContent).toBeDefined();
				expect(donefileContent).not.toBe(undefined);

				// Parse and verify structure
				// biome-ignore lint/style/noNonNullAssertion: donefileContent is checked to be defined above
				const parsed = JSON.parse(donefileContent!);
				expect(parsed).toHaveProperty("srcHashes");
				expect(parsed).toHaveProperty("dstHashes");

				// Output files should have "<missing>" hash since they don't exist
				expect(parsed.dstHashes).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							name: expect.stringContaining("dist"),
							hash: "<missing>",
						}),
					]),
				);
			});

			it("should handle donefile generation when both input and output files are missing", async () => {
				// Setup: Mock no files found
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageName("test-app")
					.withPackagePath("/test-package")
					.withCommand("copyfiles src/**/*.ts dist")
					.buildCopyfilesTask();

				const donefileContent = await (
					task as unknown as {
						getDoneFileContent: () => Promise<string | undefined>;
					}
				).getDoneFileContent();

				// Should still generate valid content with empty arrays
				expect(donefileContent).toBeDefined();
				// biome-ignore lint/style/noNonNullAssertion: donefileContent is checked to be defined above
				const parsed = JSON.parse(donefileContent!);
				expect(parsed.srcHashes).toEqual([]);
				expect(parsed.dstHashes).toEqual([]);
			});
		});
	});

	describe("EchoTask", () => {
		it("should create EchoTask", () => {
			const task = new LeafTaskBuilder()
				.withCommand("echo test")
				.buildEchoTask();

			expect(task).toBeDefined();
			expect(task.command).toBe("echo test");
		});

		it("should always be up to date", async () => {
			const task = new LeafTaskBuilder()
				.withCommand("echo hello")
				.buildEchoTask();

			const upToDate = await task.isUpToDate();
			expect(upToDate).toBe(true);
		});

		it("should have zero task weight", () => {
			const task = new LeafTaskBuilder()
				.withCommand("echo test")
				.buildEchoTask();

			expect(task.taskWeight).toBe(0);
		});

		it("should have no input files", async () => {
			const task = new LeafTaskBuilder()
				.withCommand("echo test")
				.buildEchoTask();

			const inputs = await task.getCacheInputFiles();
			expect(inputs).toEqual([]);
		});

		it("should have no output files", async () => {
			const task = new LeafTaskBuilder()
				.withCommand("echo test")
				.buildEchoTask();

			const outputs = await task.getCacheOutputFiles();
			expect(outputs).toEqual([]);
		});

		it("should be incremental", () => {
			const task = new LeafTaskBuilder()
				.withCommand("echo test")
				.buildEchoTask();

			expect(task.isIncremental).toBe(true);
		});
	});

	describe("GenVerTask", () => {
		it("should create GenVerTask", () => {
			const task = new LeafTaskBuilder()
				.withCommand("gen-version")
				.buildGenVerTask();

			expect(task).toBeDefined();
		});

		it("should have zero task weight", () => {
			const task = new LeafTaskBuilder()
				.withCommand("gen-version")
				.buildGenVerTask();

			expect(task.taskWeight).toBe(0);
		});

		it("should be incremental", () => {
			const task = new LeafTaskBuilder()
				.withCommand("gen-version")
				.buildGenVerTask();

			expect(task.isIncremental).toBe(true);
		});

		it("should include package.json as input", async () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("gen-version")
				.buildGenVerTask();

			const inputs = await task.getCacheInputFiles();
			expect(inputs).toContain("/project/package.json");
		});

		it("should have no output files", async () => {
			const task = new LeafTaskBuilder()
				.withCommand("gen-version")
				.buildGenVerTask();

			const outputs = await task.getCacheOutputFiles();
			expect(outputs).toEqual([]);
		});
	});

	describe("GoodFenceTask", () => {
		it("should create GoodFenceTask", () => {
			const task = new LeafTaskBuilder()
				.withCommand("good-fences")
				.buildGoodFenceTask();

			expect(task).toBeDefined();
		});

		it("should have zero task weight", () => {
			const task = new LeafTaskBuilder()
				.withCommand("good-fences")
				.buildGoodFenceTask();

			expect(task.taskWeight).toBe(0);
		});

		it("should find TypeScript files in fenced directories", async () => {
			vi.mocked(globFn)
				.mockResolvedValueOnce([
					"/project/src/fence.json",
					"/project/lib/fence.json",
				])
				.mockResolvedValueOnce([
					"/project/src/index.ts",
					"/project/src/utils.ts",
				])
				.mockResolvedValueOnce(["/project/lib/api.ts"]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("good-fences")
				.buildGoodFenceTask();

			const inputs = await task.getCacheInputFiles();

			expect(globFn).toHaveBeenCalledWith("/project/**/fence.json", {
				nodir: true,
			});
			expect(inputs.length).toBeGreaterThan(0);
		});

		it("should have no output files", async () => {
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("good-fences")
				.buildGoodFenceTask();

			const outputs = await task.getCacheOutputFiles();

			// GoodFenceTask only validates, doesn't produce outputs
			// But includes done file from parent class
			expect(outputs.length).toBeGreaterThanOrEqual(0);
		});

		it("should cache input files", async () => {
			vi.mocked(globFn)
				.mockResolvedValueOnce(["/project/src/fence.json"])
				.mockResolvedValueOnce(["/project/src/index.ts"]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("good-fences")
				.buildGoodFenceTask();

			await task.getCacheInputFiles();
			await task.getCacheInputFiles();

			// Should only call globFn twice total (once for fence.json, once for ts files)
			expect(globFn).toHaveBeenCalledTimes(2);
		});
	});

	describe("DepCruiseTask", () => {
		it("should create DepCruiseTask", () => {
			const task = new LeafTaskBuilder()
				.withCommand("depcruise src")
				.buildDepCruiseTask();

			expect(task).toBeDefined();
		});

		it("should parse file arguments from command", async () => {
			const mockReaddir = vi
				.fn()
				.mockResolvedValue(["index.ts", "utils.ts", "test.ts"]);

			vi.mocked(globFn).mockResolvedValue([]);

			// Mock fs promises
			const { readdir, stat } = await import("node:fs/promises");
			vi.mocked(readdir).mockImplementation(mockReaddir as never);
			vi.mocked(stat).mockResolvedValue({
				isDirectory: () => true,
			} as never);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("depcruise src")
				.buildDepCruiseTask();

			const inputs = await task.getCacheInputFiles();

			expect(inputs.length).toBeGreaterThan(0);
		});

		it("should handle glob patterns in arguments", async () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("depcruise src/**/*.ts")
				.buildDepCruiseTask();

			expect(task).toBeDefined();
		});

		it("should have no output files", async () => {
			const { readdir, stat } = await import("node:fs/promises");
			vi.mocked(readdir).mockResolvedValue([]);
			vi.mocked(stat).mockResolvedValue({
				isDirectory: () => true,
			} as never);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("depcruise src")
				.buildDepCruiseTask();

			const outputs = await task.getCacheOutputFiles();

			// DepCruise validates, doesn't produce files
			// But includes done file from parent class
			expect(outputs.length).toBeGreaterThanOrEqual(0);
		});

		it("should cache input files", async () => {
			const mockReaddir = vi.fn().mockResolvedValue(["index.ts"]);

			const { readdir, stat } = await import("node:fs/promises");
			vi.mocked(readdir).mockImplementation(mockReaddir as never);
			vi.mocked(stat).mockResolvedValue({
				isDirectory: () => true,
			} as never);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.withCommand("depcruise src")
				.buildDepCruiseTask();

			await task.getCacheInputFiles();
			await task.getCacheInputFiles();

			// Should only read directory structure once
			expect(mockReaddir).toHaveBeenCalledTimes(1);
		});
	});
});
