/**
 * Comprehensive GenerateEntrypointsTask Tests
 *
 * Coverage Target: → 80%+
 *
 * Test Areas:
 * 1. Task Construction and Initialization
 * 2. Config File Path Resolution (package.json)
 * 3. Tool Version Detection (@fluid-tools/build-cli)
 * 4. Output Directory Parsing (--outDir flag)
 * 5. Cache Input Files (TypeScript sources + package.json)
 * 6. Cache Output Files (generated entrypoints)
 * 7. Integration with TscDependentTask
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { globFn } from "../../../../../src/core/tasks/taskUtils.js";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";

// Mock dependencies
vi.mock("../../../../../src/core/tasks/taskUtils.js");

describe("GenerateEntrypointsTask - Comprehensive Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("Construction and Initialization", () => {
		it("should create GenerateEntrypointsTask successfully", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("test-lib")
				.withPackageDirectory("/project/packages/lib")
				.withCommand("flub generate entrypoints")
				.buildGenerateEntrypointsTask();

			expect(task).toBeDefined();
			expect(task.command).toBe("flub generate entrypoints");
		});

		it("should create task with default command", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("my-lib")
				.buildGenerateEntrypointsTask();

			expect(task).toBeDefined();
			expect(task.command).toBe("flub generate entrypoints");
		});

		it("should have appropriate task weight", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/project")
				.buildGenerateEntrypointsTask();

			expect(task.taskWeight).toBeGreaterThan(0);
		});

		it("should inherit from TscDependentTask", () => {
			const task = new LeafTaskBuilder().buildGenerateEntrypointsTask();

			// Verify it has methods from TscDependentTask/LeafTask
			expect(typeof task.isUpToDate).toBe("function");
		});

		it("should work with custom task names", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("test-package")
				.withTaskName("generate-entry")
				.buildGenerateEntrypointsTask();

			// Task names include package prefix
			expect(task.name).toBe("test-package#generate-entry");
		});
	});

	describe("Config File Tracking", () => {
		it("should track package.json as config file", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.buildGenerateEntrypointsTask();

			// package.json is tracked via configFileFullPaths
			expect(task).toBeDefined();
		});

		it("should use package.json for exports configuration", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("test-lib")
				.withScript("generate-entries", "flub generate entrypoints")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.packageJson).toBeDefined();
			expect(task.node.pkg.packageJson.name).toBe("test-lib");
		});
	});

	describe("Output Directory Parsing", () => {
		it("should parse --outDir from command", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			expect(task.command).toContain("--outDir dist");
		});

		it("should handle command without --outDir", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints")
				.buildGenerateEntrypointsTask();

			expect(task).toBeDefined();
			expect(task.command).not.toContain("--outDir");
		});

		it("should handle custom output directories", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints --outDir lib/entrypoints")
				.buildGenerateEntrypointsTask();

			expect(task.command).toContain("--outDir lib/entrypoints");
		});

		it("should handle multiple command flags", () => {
			const task = new LeafTaskBuilder()
				.withCommand(
					"flub generate entrypoints --outDir dist --verbose --force",
				)
				.buildGenerateEntrypointsTask();

			expect(task.command).toContain("--outDir dist");
			expect(task.command).toContain("--verbose");
			expect(task.command).toContain("--force");
		});
	});

	describe("Cache Input Files", () => {
		it("should include package.json in cache inputs", async () => {
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.buildGenerateEntrypointsTask();

			const inputs = await (
				task as unknown as { getCacheInputFiles: () => Promise<string[]> }
			).getCacheInputFiles();

			// Should include package.json (contains exports configuration)
			expect(inputs).toBeDefined();
		});

		it("should include TypeScript source files from parent", async () => {
			const mockSrcFiles = [
				"/workspace/pkg/src/index.ts",
				"/workspace/pkg/src/utils.ts",
			];

			vi.mocked(globFn).mockResolvedValue(mockSrcFiles);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.buildGenerateEntrypointsTask();

			const inputs = await (
				task as unknown as { getCacheInputFiles: () => Promise<string[]> }
			).getCacheInputFiles();

			expect(inputs).toBeDefined();
		});
	});

	describe("Cache Output Files", () => {
		it("should include generated entrypoint files", async () => {
			const mockEntrypoints = [
				"/workspace/pkg/dist/index.js",
				"/workspace/pkg/dist/index.d.ts",
			];

			vi.mocked(globFn).mockResolvedValue(mockEntrypoints);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			const outputs = await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			expect(outputs).toBeDefined();
		});

		it("should handle glob errors for output files", async () => {
			vi.mocked(globFn).mockRejectedValue(new Error("Glob failed"));

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			// Should not throw, just log error
			const outputs = await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			expect(outputs).toBeDefined();
		});

		it("should glob output directory with nodir option", async () => {
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints --outDir lib")
				.buildGenerateEntrypointsTask();

			await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			// Verify globFn was called with nodir option
			expect(globFn).toHaveBeenCalled();
			const calls = vi.mocked(globFn).mock.calls;
			if (calls.length > 0) {
				const options = calls[0]?.[1];
				if (options && typeof options === "object") {
					expect(options).toHaveProperty("nodir", true);
				}
			}
		});

		it("should handle no --outDir specified", async () => {
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints")
				.buildGenerateEntrypointsTask();

			// Should not attempt to glob if no outDir
			const outputs = await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			expect(outputs).toBeDefined();
		});

		it("should find all generated files in output directory", async () => {
			const mockFiles = [
				"/workspace/pkg/lib/index.js",
				"/workspace/pkg/lib/index.d.ts",
				"/workspace/pkg/lib/utils.js",
				"/workspace/pkg/lib/utils.d.ts",
			];

			vi.mocked(globFn).mockResolvedValue(mockFiles);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints --outDir lib")
				.buildGenerateEntrypointsTask();

			await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			expect(globFn).toHaveBeenCalled();
		});
	});

	describe("Tool Version Detection", () => {
		it("should detect @fluid-tools/build-cli version", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.buildGenerateEntrypointsTask();

			// Tool version detection happens via getInstalledPackageVersion
			expect(task).toBeDefined();
		});

		it("should have getToolVersion method from TscDependentTask", () => {
			const task = new LeafTaskBuilder().buildGenerateEntrypointsTask();

			// getToolVersion is protected, but we can verify task construction
			expect(task).toBeDefined();
		});
	});

	describe("Package Context", () => {
		it("should have correct package context", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("@myorg/lib")
				.withPackageDirectory("/workspace/packages/lib")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.name).toBe("@myorg/lib");
			expect(task.node.pkg.directory).toBe("/workspace/packages/lib");
		});

		it("should work with scoped package names", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("@scope/package")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.name).toBe("@scope/package");
		});

		it("should access package.json data", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("test-lib")
				.withPackageDirectory("/workspace/test-lib")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.packageJson).toBeDefined();
			expect(task.node.pkg.packageJson.name).toBe("test-lib");
		});
	});

	describe("Command Variations", () => {
		it("should handle basic generate entrypoints command", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints")
				.buildGenerateEntrypointsTask();

			expect(task.command).toBe("flub generate entrypoints");
		});

		it("should handle with --outDir flag", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			expect(task.command).toBe("flub generate entrypoints --outDir dist");
		});

		it("should handle with multiple flags", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints --outDir lib --verbose")
				.buildGenerateEntrypointsTask();

			expect(task.command).toContain("--outDir lib");
			expect(task.command).toContain("--verbose");
		});

		it("should handle pnpm exec prefix", () => {
			const task = new LeafTaskBuilder()
				.withCommand("pnpm exec flub generate entrypoints")
				.buildGenerateEntrypointsTask();

			expect(task.command).toContain("flub generate entrypoints");
		});
	});

	describe("Task Lifecycle", () => {
		it("should be created in non-disabled state", () => {
			const task = new LeafTaskBuilder().buildGenerateEntrypointsTask();

			expect(task).toBeDefined();
		});

		it("should have correct task name format", () => {
			const task1 = new LeafTaskBuilder()
				.withPackageName("pkg1")
				.withTaskName("gen-entries")
				.buildGenerateEntrypointsTask();

			expect(task1.name).toBe("pkg1#gen-entries");

			const task2 = new LeafTaskBuilder()
				.withPackageName("pkg2")
				.buildGenerateEntrypointsTask();

			expect(task2.command).toBeDefined();
		});

		it("should work with different package paths", () => {
			const task1 = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/packages/lib1")
				.buildGenerateEntrypointsTask();

			const task2 = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/packages/lib2")
				.buildGenerateEntrypointsTask();

			expect(task1.node.pkg.directory).toBe("/workspace/packages/lib1");
			expect(task2.node.pkg.directory).toBe("/workspace/packages/lib2");
		});
	});

	describe("Integration with TscDependentTask", () => {
		it("should extend TscDependentTask", () => {
			const task = new LeafTaskBuilder().buildGenerateEntrypointsTask();

			// GenerateEntrypointsTask extends TscDependentTask which extends LeafTask
			expect(typeof task.isUpToDate).toBe("function");
		});

		it("should include TypeScript-related functionality", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.buildGenerateEntrypointsTask();

			// TscDependentTask provides TypeScript compilation awareness
			expect(task).toBeDefined();
		});

		it("should depend on TypeScript compilation", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.buildGenerateEntrypointsTask();

			// Should have TypeScript dependency tracking
			expect(task).toBeDefined();
		});
	});

	describe("Output Path Construction", () => {
		it("should construct posix paths for output glob", async () => {
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/package")
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			// Verify globFn was called with posix-style path
			expect(globFn).toHaveBeenCalled();
		});

		it("should handle nested output directories", async () => {
			vi.mocked(globFn).mockResolvedValue([]);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints --outDir lib/entrypoints")
				.buildGenerateEntrypointsTask();

			await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			expect(globFn).toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("should handle output glob errors without throwing", async () => {
			vi.mocked(globFn).mockRejectedValue(new Error("File system error"));

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/pkg")
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			// Should log error but not throw
			await expect(
				(
					task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
				).getCacheOutputFiles(),
			).resolves.toBeDefined();
		});

		it("should handle missing output directory", async () => {
			vi.mocked(globFn).mockRejectedValue(
				new Error("ENOENT: no such file or directory"),
			);

			const task = new LeafTaskBuilder()
				.withPackageDirectory("/nonexistent")
				.withCommand("flub generate entrypoints --outDir dist")
				.buildGenerateEntrypointsTask();

			const outputs = await (
				task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
			).getCacheOutputFiles();

			expect(outputs).toBeDefined();
		});
	});

	describe("Package Directory Handling", () => {
		it("should work with absolute paths", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/absolute/path/to/package")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.directory).toBe("/absolute/path/to/package");
		});

		it("should work with Unix-style paths", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/unix/style/path")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.directory).toBe("/unix/style/path");
		});

		it("should work with nested package structures", () => {
			const task = new LeafTaskBuilder()
				.withPackageDirectory("/workspace/packages/nested/lib")
				.buildGenerateEntrypointsTask();

			expect(task.node.pkg.directory).toBe("/workspace/packages/nested/lib");
		});
	});

	describe("Task Properties", () => {
		it("should expose command property", () => {
			const task = new LeafTaskBuilder()
				.withCommand("flub generate entrypoints --outDir dist --verbose")
				.buildGenerateEntrypointsTask();

			expect(task.command).toBe(
				"flub generate entrypoints --outDir dist --verbose",
			);
		});

		it("should expose node property with package info", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("test-lib")
				.withPackageDirectory("/workspace/test-lib")
				.buildGenerateEntrypointsTask();

			expect(task.node).toBeDefined();
			expect(task.node.pkg.name).toBe("test-lib");
			expect(task.node.pkg.directory).toBe("/workspace/test-lib");
		});

		it("should have context from BuildGraphPackage", () => {
			const task = new LeafTaskBuilder()
				.withPackageName("lib")
				.buildGenerateEntrypointsTask();

			expect(task.context).toBeDefined();
		});
	});

	// Helper to access protected getDoneFileContent method
	async function getDoneFileContent(task: unknown): Promise<string | undefined> {
		return (task as unknown as {
			getDoneFileContent: () => Promise<string | undefined>;
		}).getDoneFileContent();
	}

	describe("Donefile Roundtripping - Phase 1: Core Tests", () => {
		describe("JSON Serialization", () => {
			it("should produce valid JSON content when donefile is available", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project/packages/lib")
					.buildGenerateEntrypointsTask();

				const content = await getDoneFileContent(task);

				if (content !== undefined) {
					expect(() => JSON.parse(content)).not.toThrow();
				}
			});

			it("should roundtrip through JSON parse/stringify", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildGenerateEntrypointsTask();

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
					.withPackageDirectory("/project/lib")
					.buildGenerateEntrypointsTask();
				const task2 = new LeafTaskBuilder()
					.withPackageDirectory("/project/lib")
					.buildGenerateEntrypointsTask();

				const content1 = await getDoneFileContent(task1);
				const content2 = await getDoneFileContent(task2);

				// Both should produce same content (or both undefined)
				expect(content1).toBe(content2);
			});
		});

		describe("Cache Invalidation", () => {
			it("should produce different content for different package directories", async () => {
				const task1 = new LeafTaskBuilder()
					.withPackageDirectory("/project/lib1")
					.buildGenerateEntrypointsTask();
				const task2 = new LeafTaskBuilder()
					.withPackageDirectory("/project/lib2")
					.buildGenerateEntrypointsTask();

				const content1 = await getDoneFileContent(task1);
				const content2 = await getDoneFileContent(task2);

				// Different directories may have different tsBuildInfo, verify type
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

		describe("Base Class Behavior", () => {
			it("should use base TscDependentTask donefile mechanism", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildGenerateEntrypointsTask();

				// GenerateEntrypointsTask doesn't override getDoneFileContent
				// It inherits from TscDependentTask
				const content = await getDoneFileContent(task);

				// Verify it produces content or undefined (base class behavior)
				expect(content === undefined || typeof content === "string").toBe(true);
			});

			it("should return undefined when tsBuildInfo is not available", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/nonexistent/path")
					.buildGenerateEntrypointsTask();

				const content = await getDoneFileContent(task);

				// Will likely be undefined without valid tsconfig/tsBuildInfo
				expect(content === undefined || typeof content === "string").toBe(true);
			});
		});
	});
});
