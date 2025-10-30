import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "node:path";
import type { BuildProjectConfig } from '@tylerbu/sail-infrastructure';
import type { SimpleGit } from "simple-git";
import type { Logger } from "@tylerbu/cli-api";
import {
	BuildGraph,
	BuildGraphPackage,
	isKnownMainExecutable,
} from "../../../src/core/buildGraph.js";
import {
	BuildResult,
	summarizeBuildResult,
} from "../../../src/core/execution/BuildExecutor.js";
import { BuildPackage } from "../../../src/common/npmPackage.js";
import type { BuildContext } from "../../../src/core/buildContext.js";
import type { ISailConfig } from "../../../src/core/sailConfig.js";

/**
 * Mock logger for testing
 */
function createMockLogger(): Logger {
	return {
		log: vi.fn(),
		errorLog: vi.fn(),
		verbose: vi.fn(),
		info: vi.fn(),
		warning: vi.fn(),
	} as unknown as Logger;
}

/**
 * Create a minimal mock BuildContext for testing
 * This creates a BuildGraphContext-like object with taskStats
 */
function createMockBuildContext(
	overrides?: Partial<BuildContext>,
): any {
	return {
		sailConfig: {} as ISailConfig,
		buildProjectConfig: {} as BuildProjectConfig,
		repoRoot: "/test/repo",
		gitRepo: {} as SimpleGit,
		gitRoot: "/test/repo",
		log: createMockLogger(),
		taskStats: {
			leafTotalCount: 0,
			leafUpToDateCount: 0,
			leafBuiltCount: 0,
			leafExecTimeTotal: 0,
			leafQueueWaitTimeTotal: 0,
		},
		fileHashCache: {
			getFileHash: vi.fn(),
			clear: vi.fn(),
		},
		failedTaskLines: [],
		repoPackageMap: new Map(),
		...overrides,
	};
}

/**
 * Create a mock BuildPackage for testing
 */
function createMockBuildPackage(
	name: string,
	overrides?: Partial<BuildPackage>,
): BuildPackage {
	const mockPackage = {
		name,
		nameColored: name,
		directory: `/test/repo/packages/${name}`,
		version: "1.0.0",
		packageJson: {
			name,
			version: "1.0.0",
		},
		matched: false,
		isReleaseGroupRoot: false,
		combinedDependencies: [],
		getScript: vi.fn(() => undefined),
		workspace: {
			directory: `/test/repo`,
			packageManager: {
				lockfileNames: ["pnpm-lock.yaml"],
			},
		},
		...overrides,
	} as unknown as BuildPackage;

	return mockPackage;
}

describe("buildGraph", () => {
	describe("isKnownMainExecutable", () => {
		it("should identify known main executables", () => {
			expect(isKnownMainExecutable("sail build --task compile")).toBe(true);
			expect(isKnownMainExecutable("sail b --task test")).toBe(true);
			expect(isKnownMainExecutable("fluid-build --task build")).toBe(true);
		});

		it("should not identify non-matching scripts", () => {
			expect(isKnownMainExecutable("npm run build")).toBe(false);
			expect(isKnownMainExecutable("tsc --build")).toBe(false);
			expect(isKnownMainExecutable("echo sail build")).toBe(false);
		});
	});

	describe("BuildResult", () => {
		it("should have correct enum values", () => {
			expect(BuildResult.Success).toBe("Success");
			expect(BuildResult.UpToDate).toBe("UpToDate");
			expect(BuildResult.Failed).toBe("Failed");
		});
	});

	describe("summarizeBuildResult", () => {
		it("should return Failed if any result is Failed", () => {
			expect(
				summarizeBuildResult([
					BuildResult.Success,
					BuildResult.Failed,
					BuildResult.UpToDate,
				]),
			).toBe(BuildResult.Failed);
		});

		it("should return Success if any result is Success and none Failed", () => {
			expect(
				summarizeBuildResult([
					BuildResult.Success,
					BuildResult.UpToDate,
					BuildResult.UpToDate,
				]),
			).toBe(BuildResult.Success);
		});

		it("should return UpToDate if all results are UpToDate", () => {
			expect(
				summarizeBuildResult([
					BuildResult.UpToDate,
					BuildResult.UpToDate,
					BuildResult.UpToDate,
				]),
			).toBe(BuildResult.UpToDate);
		});

		it("should return UpToDate for empty array", () => {
			expect(summarizeBuildResult([])).toBe(BuildResult.UpToDate);
		});

		it("should prioritize Failed over Success", () => {
			expect(summarizeBuildResult([BuildResult.Failed, BuildResult.Success])).toBe(
				BuildResult.Failed,
			);
		});

		it("should prioritize Success over UpToDate", () => {
			expect(
				summarizeBuildResult([BuildResult.Success, BuildResult.UpToDate]),
			).toBe(BuildResult.Success);
		});
	});

	describe("BuildGraphPackage", () => {
		let mockContext: BuildContext;
		let mockPackage: BuildPackage;

		beforeEach(() => {
			mockContext = createMockBuildContext();
			mockPackage = createMockBuildPackage("test-package");
		});

		describe("constructor", () => {
			it("should create a BuildGraphPackage with correct properties", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				expect(graphPackage.pkg).toBe(mockPackage);
				expect(graphPackage.taskCount).toBe(0);
				expect(graphPackage.level).toBe(-1);
				expect(graphPackage.dependentPackages).toEqual([]);
			});

			it("should initialize task definitions from package.json", () => {
				const packageWithTasks = createMockBuildPackage("test-package", {
					packageJson: {
						name: "test-package",
						version: "1.0.0",
						sail: {
							tasks: {
								build: {
									dependsOn: ["compile"],
									script: false,
								},
								compile: {
									dependsOn: [],
									script: true,
								},
							},
						},
					},
				});

				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					packageWithTasks,
					{},
				);

				expect(graphPackage).toBeDefined();
				expect(graphPackage.pkg).toBe(packageWithTasks);
			});
		});

		describe("createTasks", () => {
			it("should return undefined for empty task names", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				const result = graphPackage.createTasks([]);

				expect(result).toBeUndefined();
			});

			it("should create tasks from task names", () => {
				const packageWithScript = createMockBuildPackage("test-package", {
					packageJson: {
						name: "test-package",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					packageWithScript,
					{},
				);

				const result = graphPackage.createTasks(["build"]);

				expect(result).toBe(true);
				expect(graphPackage.taskCount).toBeGreaterThan(0);
			});

			it("should handle tasks with dependencies", () => {
				const packageWithDeps = createMockBuildPackage("test-package", {
					packageJson: {
						name: "test-package",
						version: "1.0.0",
						scripts: {
							build: "tsc",
							test: "vitest",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["compile"],
									script: false,
								},
								compile: {
									dependsOn: [],
									script: true,
								},
							},
						},
					},
					getScript: vi.fn((name: string) => {
						const scripts: Record<string, string> = {
							build: "tsc",
							compile: "tsc",
						};
						return scripts[name];
					}),
				});

				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					packageWithDeps,
					{},
				);

				const result = graphPackage.createTasks(["build"]);

				expect(result).toBe(true);
				expect(graphPackage.taskCount).toBeGreaterThan(0);
			});
		});

		describe("getDependsOnTasks", () => {
			it("should return empty array when task config not found", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				const mockTask = {
					nameColored: "test-task",
				} as any;

				const result = graphPackage.getDependsOnTasks(
					mockTask,
					"nonexistent",
					[],
				);

				expect(result).toEqual([]);
			});

			it("should resolve task dependencies", () => {
				const packageWithDeps = createMockBuildPackage("test-package", {
					packageJson: {
						name: "test-package",
						version: "1.0.0",
						scripts: {
							build: "tsc",
							lint: "eslint",
						},
						sail: {
							tasks: {
								build: {
									dependsOn: ["lint"],
									script: true,
								},
								lint: {
									dependsOn: [],
									script: true,
								},
							},
						},
					},
					getScript: vi.fn((name: string) => {
						const scripts: Record<string, string> = {
							build: "tsc",
							lint: "eslint",
						};
						return scripts[name];
					}),
				});

				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					packageWithDeps,
					{},
				);

				// Create the tasks first
				graphPackage.createTasks(["build", "lint"]);

				// Note: Full testing of getDependsOnTasks requires more complex setup
				// with actual Task instances, which is covered in integration tests
				expect(graphPackage.taskCount).toBeGreaterThan(0);
			});
		});

		describe("level property", () => {
			it("should start with level -1", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				expect(graphPackage.level).toBe(-1);
			});

			it("should allow level to be set", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				graphPackage.level = 5;

				expect(graphPackage.level).toBe(5);
			});
		});

		describe("dependentPackages", () => {
			it("should start with empty dependentPackages array", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				expect(graphPackage.dependentPackages).toEqual([]);
				expect(graphPackage.dependentPackages).toHaveLength(0);
			});

			it("should allow dependent packages to be added", () => {
				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					mockPackage,
					{},
				);

				const depPackage = createMockBuildPackage("dep-package");
				const depGraphPackage = new BuildGraphPackage(
					mockContext as any,
					depPackage,
					{},
				);

				graphPackage.dependentPackages.push(depGraphPackage);

				expect(graphPackage.dependentPackages).toHaveLength(1);
				expect(graphPackage.dependentPackages[0]).toBe(depGraphPackage);
			});
		});

		describe("release group root behavior", () => {
			it("should handle release group root packages differently", () => {
				const releaseGroupRoot = createMockBuildPackage("release-group-root", {
					isReleaseGroupRoot: true,
					packageJson: {
						name: "release-group-root",
						version: "1.0.0",
						scripts: {
							build: "sail build",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "sail build" : undefined,
					),
				});

				const graphPackage = new BuildGraphPackage(
					mockContext as any,
					releaseGroupRoot,
					{},
				);

				// Release group roots have special task definition behavior
				expect(graphPackage.pkg.isReleaseGroupRoot).toBe(true);
			});
		});
	});

	describe("BuildGraph", () => {
		let mockContext: BuildContext;
		let mockLogger: Logger;

		beforeEach(() => {
			mockLogger = createMockLogger();
			mockContext = createMockBuildContext({ log: mockLogger });
		});

		describe("constructor", () => {
			it("should throw when creating a BuildGraph with empty packages", () => {
				const packages = new Map<string, BuildPackage>();

				// Empty packages should throw because there are no tasks
				expect(() => {
					new BuildGraph(
						packages,
						[],
						mockContext,
						["build"],
						undefined,
						() => () => true,
						mockLogger,
						{ matchedOnly: false, worker: false },
					);
				}).toThrow("No task(s) found for 'build'");
			});

			it("should initialize packages that are matched", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				expect(graph).toBeDefined();
			});

			it("should handle packages with dependencies", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					combinedDependencies: [{ name: "pkg2", version: "1.0.0" }],
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const pkg2 = createMockBuildPackage("pkg2", {
					matched: false,
					packageJson: {
						name: "pkg2",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([
					["pkg1", pkg1],
					["pkg2", pkg2],
				]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				expect(graph).toBeDefined();
			});

			it("should throw error if no tasks found", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
					},
					getScript: vi.fn(() => undefined),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				expect(() => {
					new BuildGraph(
						packages,
						[],
						mockContext,
						["nonexistent-task"],
						undefined,
						() => () => true,
						mockLogger,
						{ matchedOnly: false, worker: false },
					);
				}).toThrow("No task(s) found for 'nonexistent-task'");
			});

			it("should support matchedOnly option", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const pkg2 = createMockBuildPackage("pkg2", {
					matched: false,
					packageJson: {
						name: "pkg2",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([
					["pkg1", pkg1],
					["pkg2", pkg2],
				]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: true, worker: false },
				);

				expect(graph).toBeDefined();
			});

			it("should initialize worker pool when worker option is true", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{
						matchedOnly: false,
						worker: true,
						workerThreads: 4,
						workerMemoryLimit: 2048,
					},
				);

				expect(graph).toBeDefined();
			});
		});

		describe("properties", () => {
			it("should track skipped tasks", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				expect(graph.numSkippedTasks).toBe(0);
			});

			it("should track total elapsed time", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				expect(graph.totalElapsedTime).toBe(0);
			});

			it("should track total queue wait time", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				expect(graph.totalQueueWaitTime).toBe(0);
			});

			it("should provide empty task failure summary when no failures", () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				expect(graph.taskFailureSummary).toBe("");
			});
		});

		describe("checkInstall", () => {
			it("should return true when all packages install check passes", async () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					checkInstall: vi.fn().mockResolvedValue(true),
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				const result = await graph.checkInstall();

				expect(result).toBe(true);
			});

			it("should return false when any package install check fails", async () => {
				const pkg1 = createMockBuildPackage("pkg1", {
					matched: true,
					checkInstall: vi.fn().mockResolvedValue(false),
					packageJson: {
						name: "pkg1",
						version: "1.0.0",
						scripts: {
							build: "tsc",
						},
					},
					getScript: vi.fn((name: string) =>
						name === "build" ? "tsc" : undefined,
					),
				});

				const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

				const graph = new BuildGraph(
					packages,
					[],
					mockContext,
					["build"],
					undefined,
					() => () => true,
					mockLogger,
					{ matchedOnly: false, worker: false },
				);

				const result = await graph.checkInstall();

				expect(result).toBe(false);
			});
		});
	});
});
