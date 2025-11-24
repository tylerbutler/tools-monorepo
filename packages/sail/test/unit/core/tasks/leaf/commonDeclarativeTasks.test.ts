/**
 * Comprehensive CommonDeclarativeTasks Tests
 *
 * Coverage Target: → 80%+
 *
 * Test Areas:
 * 1. OclifManifestTask - OCLIF manifest generation
 * 2. OclifReadmeTask - OCLIF README generation
 * 3. SyncpackLintSemverRangesTask - Semver range linting
 * 4. SyncpackListMismatchesTask - Version mismatch detection
 * 5. MarkdownMagicTask - Dynamic markdown processing
 * 6. JssmVizTask - FSL state machine visualization
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { globFn } from "../../../../../src/core/tasks/taskUtils.js";
import { LeafTaskBuilder } from "../../../../helpers/builders/LeafTaskBuilder.js";

// Mock dependencies
vi.mock("../../../../../src/core/tasks/taskUtils.js");

describe("CommonDeclarativeTasks - Comprehensive Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("OclifManifestTask", () => {
		describe("Construction and Initialization", () => {
			it("should create OclifManifestTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-cli")
					.withPackageDirectory("/project")
					.withCommand("oclif manifest")
					.buildOclifManifestTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("oclif manifest");
			});

			it("should have appropriate task weight", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifManifestTask();

				expect(task.taskWeight).toBeGreaterThan(0);
			});
		});

		describe("Input File Resolution", () => {
			it("should include package.json as input", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifManifestTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/project/package.json");
			});

			it("should include all source files from src directory", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/commands/build.ts",
					"/project/src/commands/scan.ts",
					"/project/src/index.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifManifestTask();

				const inputs = await task.getInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**", { nodir: true });
				expect(inputs).toContain("/project/src/commands/build.ts");
				expect(inputs).toContain("/project/src/commands/scan.ts");
				expect(inputs).toContain("/project/src/index.ts");
			});

			it("should handle empty source directory", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifManifestTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toEqual(["/project/package.json"]);
			});
		});

		describe("Output File Resolution", () => {
			it("should output oclif.manifest.json", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifManifestTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toEqual(["/project/oclif.manifest.json"]);
			});
		});

		describe("Incremental Build Support", () => {
			it("should support recheck for up-to-date status", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifManifestTask();

				expect(task.recheckLeafIsUpToDate).toBeDefined();
			});
		});
	});

	describe("OclifReadmeTask", () => {
		describe("Construction and Initialization", () => {
			it("should create OclifReadmeTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("test-cli")
					.withPackageDirectory("/project")
					.withCommand("oclif readme")
					.buildOclifReadmeTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("oclif readme");
			});

			it("should have appropriate task weight", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifReadmeTask();

				expect(task.taskWeight).toBeGreaterThan(0);
			});
		});

		describe("Input File Resolution", () => {
			it("should include package.json as input", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifReadmeTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/project/package.json");
			});

			it("should include all source files from src directory", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/commands/deploy.ts",
					"/project/src/utils/logger.ts",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifReadmeTask();

				const inputs = await task.getInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**", { nodir: true });
				expect(inputs).toContain("/project/src/commands/deploy.ts");
				expect(inputs).toContain("/project/src/utils/logger.ts");
			});
		});

		describe("Output File Resolution", () => {
			it("should output README.md", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifReadmeTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toContain("/project/README.md");
			});

			it("should include docs directory files if they exist", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/docs/commands.md",
					"/project/docs/usage.md",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifReadmeTask();

				const outputs = await task.getOutputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/docs/**", {
					nodir: true,
				});
				expect(outputs).toContain("/project/README.md");
				expect(outputs).toContain("/project/docs/commands.md");
				expect(outputs).toContain("/project/docs/usage.md");
			});

			it("should handle missing docs directory", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildOclifReadmeTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toEqual(["/project/README.md"]);
			});
		});
	});

	describe("SyncpackLintSemverRangesTask", () => {
		describe("Construction and Initialization", () => {
			it("should create SyncpackLintSemverRangesTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("monorepo-root")
					.withPackageDirectory("/monorepo")
					.withCommand("syncpack lint-semver-ranges")
					.buildSyncpackLintSemverRangesTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("syncpack lint-semver-ranges");
			});
		});

		describe("Input File Resolution", () => {
			it("should include syncpack.config.cjs if it exists", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce(["/monorepo/syncpack.config.cjs"])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/monorepo/syncpack.config.cjs");
			});

			it("should include syncpack.config.js if it exists", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce(["/monorepo/syncpack.config.js"])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/monorepo/syncpack.config.js");
			});

			it("should include .syncpackrc if it exists", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce(["/monorepo/.syncpackrc"])
					.mockResolvedValueOnce([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/monorepo/.syncpackrc");
			});

			it("should include root package.json", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/monorepo/package.json");
			});

			it("should include workspace package.json files", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([
						"/monorepo/packages/cli/package.json",
						"/monorepo/packages/utils/package.json",
						"/monorepo/apps/web/package.json",
					]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const inputs = await task.getInputFiles();

				expect(globFn).toHaveBeenCalledWith(
					"/monorepo/{packages,apps,tools}/*/*/package.json",
					{ nodir: true },
				);
				expect(inputs).toContain("/monorepo/packages/cli/package.json");
				expect(inputs).toContain("/monorepo/packages/utils/package.json");
				expect(inputs).toContain("/monorepo/apps/web/package.json");
			});
		});

		describe("Output File Resolution", () => {
			it("should include root package.json as output", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toContain("/monorepo/package.json");
			});

			it("should include workspace package.json files as outputs", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/monorepo/packages/app1/package.json",
					"/monorepo/packages/app2/package.json",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackLintSemverRangesTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toContain("/monorepo/packages/app1/package.json");
				expect(outputs).toContain("/monorepo/packages/app2/package.json");
			});
		});
	});

	describe("SyncpackListMismatchesTask", () => {
		describe("Construction and Initialization", () => {
			it("should create SyncpackListMismatchesTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("monorepo-root")
					.withPackageDirectory("/monorepo")
					.withCommand("syncpack list-mismatches")
					.buildSyncpackListMismatchesTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("syncpack list-mismatches");
			});
		});

		describe("Input File Resolution", () => {
			it("should include syncpack config files", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce(["/monorepo/syncpack.config.cjs"])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackListMismatchesTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/monorepo/syncpack.config.cjs");
			});

			it("should include all workspace package.json files", async () => {
				vi.mocked(globFn)
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([
						"/monorepo/packages/lib1/package.json",
						"/monorepo/packages/lib2/package.json",
					]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackListMismatchesTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toContain("/monorepo/packages/lib1/package.json");
				expect(inputs).toContain("/monorepo/packages/lib2/package.json");
			});
		});

		describe("Output File Resolution", () => {
			it("should return empty array (list command doesn't modify files)", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/monorepo")
					.buildSyncpackListMismatchesTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toEqual([]);
			});
		});
	});

	describe("MarkdownMagicTask", () => {
		describe("Construction and Initialization", () => {
			it("should create MarkdownMagicTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("docs-processor")
					.withPackageDirectory("/project")
					.withCommand("markdown-magic")
					.buildMarkdownMagicTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("markdown-magic");
			});
		});

		describe("Input File Resolution", () => {
			it("should return empty array (markdown-magic finds files via config)", async () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildMarkdownMagicTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toEqual([]);
			});
		});

		describe("Output File Resolution", () => {
			it("should find markdown files in workspace", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/packages/cli/README.md",
					"/project/packages/utils/CHANGELOG.md",
					"/project/tools/docs/guide.md",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildMarkdownMagicTask();

				const outputs = await task.getOutputFiles();

				expect(globFn).toHaveBeenCalledWith(
					"/project/{packages,tools}/*/**.md",
					{
						nodir: true,
					},
				);
				expect(outputs).toContain("/project/packages/cli/README.md");
				expect(outputs).toContain("/project/packages/utils/CHANGELOG.md");
				expect(outputs).toContain("/project/tools/docs/guide.md");
			});

			it("should handle no markdown files found", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildMarkdownMagicTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toEqual([]);
			});
		});
	});

	describe("JssmVizTask", () => {
		describe("Construction and Initialization", () => {
			it("should create JssmVizTask successfully", () => {
				const task = new LeafTaskBuilder()
					.withPackageName("state-machine-app")
					.withPackageDirectory("/project")
					.withCommand("jssm-viz")
					.buildJssmVizTask();

				expect(task).toBeDefined();
				expect(task.command).toBe("jssm-viz");
			});

			it("should have appropriate task weight", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildJssmVizTask();

				expect(task.taskWeight).toBeGreaterThan(0);
			});
		});

		describe("Input File Resolution", () => {
			it("should find all .fsl files in src directory", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/workflows/approval.fsl",
					"/project/src/workflows/deployment.fsl",
					"/project/src/states/user.fsl",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildJssmVizTask();

				const inputs = await task.getInputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**/*.fsl", {
					nodir: true,
				});
				expect(inputs).toContain("/project/src/workflows/approval.fsl");
				expect(inputs).toContain("/project/src/workflows/deployment.fsl");
				expect(inputs).toContain("/project/src/states/user.fsl");
			});

			it("should handle no .fsl files found", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildJssmVizTask();

				const inputs = await task.getInputFiles();

				expect(inputs).toEqual([]);
			});
		});

		describe("Output File Resolution", () => {
			it("should find all .fsl.svg files in src directory", async () => {
				vi.mocked(globFn).mockResolvedValue([
					"/project/src/workflows/approval.fsl.svg",
					"/project/src/workflows/deployment.fsl.svg",
					"/project/src/states/user.fsl.svg",
				]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildJssmVizTask();

				const outputs = await task.getOutputFiles();

				expect(globFn).toHaveBeenCalledWith("/project/src/**/*.fsl.svg", {
					nodir: true,
				});
				expect(outputs).toContain("/project/src/workflows/approval.fsl.svg");
				expect(outputs).toContain("/project/src/workflows/deployment.fsl.svg");
				expect(outputs).toContain("/project/src/states/user.fsl.svg");
			});

			it("should handle no .fsl.svg files found", async () => {
				vi.mocked(globFn).mockResolvedValue([]);

				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildJssmVizTask();

				const outputs = await task.getOutputFiles();

				expect(outputs).toEqual([]);
			});
		});

		describe("Incremental Build Support", () => {
			it("should support incremental builds", () => {
				const task = new LeafTaskBuilder()
					.withPackageDirectory("/project")
					.buildJssmVizTask();

				expect(task.recheckLeafIsUpToDate).toBeDefined();
			});
		});
	});
});
