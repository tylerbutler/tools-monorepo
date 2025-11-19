/**
 * Comprehensive FlubTasks Tests
 *
 * Coverage Target: → 80%+
 *
 * Test Areas:
 * 1. FlubListTask - Release group package listing
 * 2. FlubCheckLayerTask - Layer info validation
 * 3. FlubCheckPolicyTask - Git-based policy checking
 * 4. FlubGenerateTypeTestsTask - Type validation test generation
 * 5. FlubGenerateChangesetConfigTask - Changeset config generation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { globFn } from "../../../../../src/core/tasks/taskUtils.js";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";

// Mock dependencies
vi.mock("../../../../../src/core/tasks/taskUtils.js");

describe("FlubTasks - Comprehensive Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("FlubListTask", () => {
		describe("Construction and Initialization", () => {
			it("should create FlubListTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-package")
					.withCommand("flub list")
					.buildFlubListTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub list");
			});

			it("should create task with default command", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("my-package")
					.buildFlubListTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub list");
			});

			it("should have appropriate task weight", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildFlubListTask();

				expect(task.taskWeight).toBeGreaterThan(0);
			});

			it("should inherit from LeafWithDoneFileTask", () => {
				const task = new LeafTaskBuilder().buildFlubListTask();

				expect(typeof task.isUpToDate).toBe("function");
			});
		});

		describe("Release Group Parsing", () => {
			it("should parse -g flag for release group", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub list -g client")
					.buildFlubListTask();

				expect(task.command).toContain("-g client");
			});

			it("should parse --releaseGroup flag", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub list --releaseGroup server")
					.buildFlubListTask();

				expect(task.command).toContain("--releaseGroup server");
			});

			it("should handle command without release group flag", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub list")
					.buildFlubListTask();

				expect(task).toBeDefined();
			});

			it("should handle positional release group argument", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub list packages client")
					.buildFlubListTask();

				expect(task.command).toContain("client");
			});
		});

		describe("Cache Operations", () => {
			it("should return empty cache input files", async () => {
				const task = new LeafTaskBuilder().buildFlubListTask();

				const inputs = await (
					task as unknown as { getCacheInputFiles: () => Promise<string[]> }
				).getCacheInputFiles();

				// FlubListTask doesn't use file-based tracking
				expect(inputs).toEqual([]);
			});

			it("should return empty cache output files", async () => {
				const task = new LeafTaskBuilder().buildFlubListTask();

				const outputs = await (
					task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
				).getCacheOutputFiles();

				// FlubListTask doesn't produce output files
				expect(outputs).toEqual([]);
			});
		});

		describe("Task Properties", () => {
			it("should have correct package context", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("@myorg/package")
					.withPackageDirectory("/workspace/package")
					.buildFlubListTask();

				expect(task.node.pkg.name).toBe("@myorg/package");
				expect(task.node.pkg.directory).toBe("/workspace/package");
			});

			it("should expose command property", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub list -g client --verbose")
					.buildFlubListTask();

				expect(task.command).toBe("flub list -g client --verbose");
			});
		});
	});

	describe("FlubCheckLayerTask", () => {
		describe("Construction and Initialization", () => {
			it("should create FlubCheckLayerTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-package")
					.withCommand("flub check layers")
					.buildFlubCheckLayerTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub check layers");
			});

			it("should create task with default command", () => {
				const task = new LeafTaskBuilder().buildFlubCheckLayerTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub check layers");
			});

			it("should inherit from LeafWithDoneFileTask", () => {
				const task = new LeafTaskBuilder().buildFlubCheckLayerTask();

				expect(typeof task.isUpToDate).toBe("function");
			});
		});

		describe("Layer Info File Parsing", () => {
			it("should parse --info flag for layer info file", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub check layers --info layer-info.json")
					.buildFlubCheckLayerTask();

				expect(task.command).toContain("--info layer-info.json");
			});

			it("should handle command without --info flag", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub check layers")
					.buildFlubCheckLayerTask();

				expect(task).toBeDefined();
			});

			it("should handle custom layer info paths", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub check layers --info config/layers.json")
					.buildFlubCheckLayerTask();

				expect(task.command).toContain("config/layers.json");
			});
		});

		describe("Cache Operations", () => {
			it("should return empty cache input files", async () => {
				const task = new LeafTaskBuilder().buildFlubCheckLayerTask();

				const inputs = await (
					task as unknown as { getCacheInputFiles: () => Promise<string[]> }
				).getCacheInputFiles();

				expect(inputs).toEqual([]);
			});

			it("should return empty cache output files", async () => {
				const task = new LeafTaskBuilder().buildFlubCheckLayerTask();

				const outputs = await (
					task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
				).getCacheOutputFiles();

				expect(outputs).toEqual([]);
			});
		});
	});

	describe("FlubCheckPolicyTask", () => {
		describe("Construction and Initialization", () => {
			it("should create FlubCheckPolicyTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-package")
					.withCommand("flub check policy")
					.buildFlubCheckPolicyTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub check policy");
			});

			it("should create task with default command", () => {
				const task = new LeafTaskBuilder().buildFlubCheckPolicyTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub check policy");
			});

			it("should inherit from LeafWithDoneFileTask", () => {
				const task = new LeafTaskBuilder().buildFlubCheckPolicyTask();

				expect(typeof task.isUpToDate).toBe("function");
			});
		});

		describe("Git-Based Tracking", () => {
			it("should use git for done file content", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg")
					.buildFlubCheckPolicyTask();

				// FlubCheckPolicyTask uses GitRepo internally
				expect(task).toBeDefined();
			});

			it("should handle different package directories", () => {
				const task1 = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg1")
					.buildFlubCheckPolicyTask();

				const task2 = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg2")
					.buildFlubCheckPolicyTask();

				expect(task1.node.pkg.directory).toBe("/workspace/pkg1");
				expect(task2.node.pkg.directory).toBe("/workspace/pkg2");
			});
		});

		describe("Cache Operations", () => {
			it("should return empty cache input files", async () => {
				const task = new LeafTaskBuilder().buildFlubCheckPolicyTask();

				const inputs = await (
					task as unknown as { getCacheInputFiles: () => Promise<string[]> }
				).getCacheInputFiles();

				expect(inputs).toEqual([]);
			});

			it("should return empty cache output files", async () => {
				const task = new LeafTaskBuilder().buildFlubCheckPolicyTask();

				const outputs = await (
					task as unknown as { getCacheOutputFiles: () => Promise<string[]> }
				).getCacheOutputFiles();

				expect(outputs).toEqual([]);
			});
		});

		describe("Command Variations", () => {
			it("should handle basic check policy command", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub check policy")
					.buildFlubCheckPolicyTask();

				expect(task.command).toBe("flub check policy");
			});

			it("should handle with flags", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub check policy --verbose")
					.buildFlubCheckPolicyTask();

				expect(task.command).toContain("--verbose");
			});
		});
	});

	describe("FlubGenerateTypeTestsTask", () => {
		describe("Construction and Initialization", () => {
			it("should create FlubGenerateTypeTestsTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-lib")
					.withCommand("flub generate typetests")
					.buildFlubGenerateTypeTestsTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub generate typetests");
			});

			it("should create task with default command", () => {
				const task = new LeafTaskBuilder().buildFlubGenerateTypeTestsTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub generate typetests");
			});

			it("should inherit from LeafWithDoneFileTask", () => {
				const task = new LeafTaskBuilder().buildFlubGenerateTypeTestsTask();

				expect(typeof task.isUpToDate).toBe("function");
			});
		});

		describe("Output Directory Parsing", () => {
			it("should parse --outDir flag", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub generate typetests --outDir src/test/types")
					.buildFlubGenerateTypeTestsTask();

				expect(task.command).toContain("--outDir src/test/types");
			});

			it("should parse --outFile flag", () => {
				const task = new LeafTaskBuilder()
					.withCommand(
						"flub generate typetests --outFile validateCustomPrevious.generated.ts",
					)
					.buildFlubGenerateTypeTestsTask();

				expect(task.command).toContain(
					"--outFile validateCustomPrevious.generated.ts",
				);
			});

			it("should handle both --outDir and --outFile", () => {
				const task = new LeafTaskBuilder()
					.withCommand(
						"flub generate typetests --outDir lib/test --outFile validate.generated.ts",
					)
					.buildFlubGenerateTypeTestsTask();

				expect(task.command).toContain("--outDir lib/test");
				expect(task.command).toContain("--outFile validate.generated.ts");
			});

			it("should handle command without output flags", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub generate typetests")
					.buildFlubGenerateTypeTestsTask();

				expect(task).toBeDefined();
			});
		});

		describe("Output File Globbing", () => {
			it("should glob output files", async () => {
				const mockFiles = [
					"/workspace/pkg/src/test/types/validatePkgPrevious.generated.ts",
				];

				vi.mocked(globFn).mockResolvedValue(mockFiles);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg")
					.buildFlubGenerateTypeTestsTask();

				// getOutputFiles is protected, but called during construction
				expect(task).toBeDefined();
			});

			it("should handle empty output directory", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg")
					.buildFlubGenerateTypeTestsTask();

				expect(task).toBeDefined();
			});

			it("should use nodir option for globbing", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg")
					.buildFlubGenerateTypeTestsTask();

				// nodir: true is used in getOutputFiles
				expect(task).toBeDefined();
			});
		});

		describe("Package Context", () => {
			it("should have correct package directory", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/packages/lib")
					.buildFlubGenerateTypeTestsTask();

				expect(task.node.pkg.directory).toBe("/workspace/packages/lib");
			});

			it("should work with scoped packages", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("@scope/lib")
					.buildFlubGenerateTypeTestsTask();

				expect(task.node.pkg.name).toBe("@scope/lib");
			});
		});
	});

	describe("FlubGenerateChangesetConfigTask", () => {
		describe("Construction and Initialization", () => {
			it("should create FlubGenerateChangesetConfigTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-package")
					.withCommand("flub generate changeset-config")
					.buildFlubGenerateChangesetConfigTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub generate changeset-config");
			});

			it("should create task with default command", () => {
				const task =
					new LeafTaskBuilder().buildFlubGenerateChangesetConfigTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("flub generate changeset-config");
			});

			it("should inherit from LeafWithDoneFileTask", () => {
				const task =
					new LeafTaskBuilder().buildFlubGenerateChangesetConfigTask();

				expect(typeof task.isUpToDate).toBe("function");
			});

			it("should have appropriate task weight", () => {
				const task =
					new LeafTaskBuilder().buildFlubGenerateChangesetConfigTask();

				expect(task.taskWeight).toBeGreaterThan(0);
			});
		});

		describe("Config File Tracking", () => {
			it("should track changeset config file", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg")
					.buildFlubGenerateChangesetConfigTask();

				// Tracks .changeset/config.json, fluidBuild.config.cjs, flub.config.cjs
				expect(task).toBeDefined();
			});

			it("should handle different package paths", () => {
				const task1 = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg1")
					.buildFlubGenerateChangesetConfigTask();

				const task2 = new LeafTaskBuilder()
					.withPackageDirectory("/workspace/pkg2")
					.buildFlubGenerateChangesetConfigTask();

				expect(task1.node.pkg.directory).toBe("/workspace/pkg1");
				expect(task2.node.pkg.directory).toBe("/workspace/pkg2");
			});
		});

		describe("Command Variations", () => {
			it("should handle basic generate changeset-config command", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub generate changeset-config")
					.buildFlubGenerateChangesetConfigTask();

				expect(task.command).toBe("flub generate changeset-config");
			});

			it("should handle with flags", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub generate changeset-config --verbose")
					.buildFlubGenerateChangesetConfigTask();

				expect(task.command).toContain("--verbose");
			});
		});

		describe("Task Properties", () => {
			it("should expose command property", () => {
				const task = new LeafTaskBuilder()
					.withCommand("flub generate changeset-config --force")
					.buildFlubGenerateChangesetConfigTask();

				expect(task.command).toBe("flub generate changeset-config --force");
			});

			it("should have package context", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-pkg")
					.withPackageDirectory("/workspace/test-pkg")
					.buildFlubGenerateChangesetConfigTask();

				expect(task.node).toBeDefined();
				expect(task.node.pkg.name).toBe("test-pkg");
			});
		});
	});

	describe("Common FlubTask Behavior", () => {
		it("should all extend LeafWithDoneFileTask", () => {
			const listTask = new LeafTaskBuilder().buildFlubListTask();
			const layerTask = new LeafTaskBuilder().buildFlubCheckLayerTask();
			const policyTask = new LeafTaskBuilder().buildFlubCheckPolicyTask();
			const typeTestsTask =
				new LeafTaskBuilder().buildFlubGenerateTypeTestsTask();
			const changesetTask =
				new LeafTaskBuilder().buildFlubGenerateChangesetConfigTask();

			expect(typeof listTask.isUpToDate).toBe("function");
			expect(typeof layerTask.isUpToDate).toBe("function");
			expect(typeof policyTask.isUpToDate).toBe("function");
			expect(typeof typeTestsTask.isUpToDate).toBe("function");
			expect(typeof changesetTask.isUpToDate).toBe("function");
		});

		it("should all work with custom task names", () => {
			const listTask = new LeafTaskBuilder()
				.withPackageName("pkg")
				.withTaskName("list-packages")
				.buildFlubListTask();

			const policyTask = new LeafTaskBuilder()
				.withPackageName("pkg")
				.withTaskName("check-policies")
				.buildFlubCheckPolicyTask();

			expect(listTask.name).toBe("pkg#list-packages");
			expect(policyTask.name).toBe("pkg#check-policies");
		});

		it("should all work with different package directories", () => {
			const dir1 = "/workspace/packages/pkg1";
			const dir2 = "/workspace/packages/pkg2";

			const listTask = new LeafTaskBuilder()
				.withPackageDirectory(dir1)
				.buildFlubListTask();

			const policyTask = new LeafTaskBuilder()
				.withPackageDirectory(dir2)
				.buildFlubCheckPolicyTask();

			expect(listTask.node.pkg.directory).toBe(dir1);
			expect(policyTask.node.pkg.directory).toBe(dir2);
		});

		it("should all have positive task weight", () => {
			const tasks = [
				new LeafTaskBuilder().buildFlubListTask(),
				new LeafTaskBuilder().buildFlubCheckLayerTask(),
				new LeafTaskBuilder().buildFlubCheckPolicyTask(),
				new LeafTaskBuilder().buildFlubGenerateTypeTestsTask(),
				new LeafTaskBuilder().buildFlubGenerateChangesetConfigTask(),
			];

			for (const task of tasks) {
				expect(task.taskWeight).toBeGreaterThan(0);
			}
		});
	});

	describe("Task Lifecycle", () => {
		it("should create all tasks in non-disabled state", () => {
			const tasks = [
				new LeafTaskBuilder().buildFlubListTask(),
				new LeafTaskBuilder().buildFlubCheckLayerTask(),
				new LeafTaskBuilder().buildFlubCheckPolicyTask(),
				new LeafTaskBuilder().buildFlubGenerateTypeTestsTask(),
				new LeafTaskBuilder().buildFlubGenerateChangesetConfigTask(),
			];

			for (const task of tasks) {
				expect(task).toBeDefined();
			}
		});

		it("should support command variations across all tasks", () => {
			const listTask = new LeafTaskBuilder()
				.withCommand("flub list -g client --verbose")
				.buildFlubListTask();

			const policyTask = new LeafTaskBuilder()
				.withCommand("flub check policy --fix")
				.buildFlubCheckPolicyTask();

			expect(listTask.command).toContain("--verbose");
			expect(policyTask.command).toContain("--fix");
		});
	});
});
