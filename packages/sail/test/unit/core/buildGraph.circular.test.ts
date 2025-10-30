import { describe, it, expect, beforeEach, vi } from "vitest";
import type { BuildProjectConfig } from '@tylerbu/sail-infrastructure';
import type { SimpleGit } from "simple-git";
import type { Logger } from "@tylerbu/cli-api";
import { BuildGraph } from "../../../src/core/buildGraph.js";
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

describe("BuildGraph - Circular Dependencies and Complex Scenarios", () => {
	let mockContext: BuildContext;
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = createMockLogger();
		mockContext = createMockBuildContext({ log: mockLogger });
	});

	describe("circular dependency detection", () => {
		it("should detect circular dependencies between packages", () => {
			// Create packages with circular dependencies
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
				combinedDependencies: [{ name: "pkg1", version: "1.0.0" }],
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

			// Creating the graph should detect the circular reference
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
			}).toThrow(/Circular Reference detected/);
		});

		it("should not throw on valid DAG of dependencies", () => {
			// Create a valid dependency chain: pkg1 -> pkg2 -> pkg3
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
				combinedDependencies: [{ name: "pkg3", version: "1.0.0" }],
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

			const pkg3 = createMockBuildPackage("pkg3", {
				matched: false,
				combinedDependencies: [],
				packageJson: {
					name: "pkg3",
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
				["pkg3", pkg3],
			]);

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
			}).not.toThrow();
		});

		it("should handle diamond dependency pattern", () => {
			// Diamond: pkg1 -> pkg2, pkg1 -> pkg3, pkg2 -> pkg4, pkg3 -> pkg4
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				combinedDependencies: [
					{ name: "pkg2", version: "1.0.0" },
					{ name: "pkg3", version: "1.0.0" },
				],
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
				combinedDependencies: [{ name: "pkg4", version: "1.0.0" }],
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

			const pkg3 = createMockBuildPackage("pkg3", {
				matched: false,
				combinedDependencies: [{ name: "pkg4", version: "1.0.0" }],
				packageJson: {
					name: "pkg3",
					version: "1.0.0",
					scripts: {
						build: "tsc",
					},
				},
				getScript: vi.fn((name: string) =>
					name === "build" ? "tsc" : undefined,
				),
			});

			const pkg4 = createMockBuildPackage("pkg4", {
				matched: false,
				combinedDependencies: [],
				packageJson: {
					name: "pkg4",
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
				["pkg3", pkg3],
				["pkg4", pkg4],
			]);

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
			}).not.toThrow();
		});
	});

	describe("dependency filtering", () => {
		it("should filter dependencies based on depFilter function", () => {
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				combinedDependencies: [
					{ name: "pkg2", version: "1.0.0" },
					{ name: "pkg3", version: "1.0.0" },
				],
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

			const pkg3 = createMockBuildPackage("pkg3", {
				matched: false,
				packageJson: {
					name: "pkg3",
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
				["pkg3", pkg3],
			]);

			// Filter to only include pkg2
			const depFilter = (pkg: BuildPackage) => (dep: BuildPackage) =>
				dep.name === "pkg2";

			const graph = new BuildGraph(
				packages,
				[],
				mockContext,
				["build"],
				undefined,
				depFilter,
				mockLogger,
				{ matchedOnly: false, worker: false },
			);

			expect(graph).toBeDefined();
		});
	});

	describe("workspace dependencies", () => {
		it("should handle workspace: protocol in dependencies", () => {
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				combinedDependencies: [{ name: "pkg2", version: "workspace:*" }],
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
			}).not.toThrow();
		});
	});

	describe("multiple tasks", () => {
		it("should handle multiple task names", () => {
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				packageJson: {
					name: "pkg1",
					version: "1.0.0",
					scripts: {
						build: "tsc",
						test: "vitest",
						lint: "eslint",
					},
				},
				getScript: vi.fn((name: string) => {
					const scripts: Record<string, string> = {
						build: "tsc",
						test: "vitest",
						lint: "eslint",
					};
					return scripts[name];
				}),
			});

			const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

			const graph = new BuildGraph(
				packages,
				[],
				mockContext,
				["build", "test", "lint"],
				undefined,
				() => () => true,
				mockLogger,
				{ matchedOnly: false, worker: false },
			);

			expect(graph).toBeDefined();
		});

		it("should succeed even if not all tasks exist on all packages", () => {
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

			// Note: BuildGraph only throws if NO tasks are found across ALL packages
			// If at least one package has at least one of the requested tasks, it succeeds
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
			}).not.toThrow();
		});
	});

	describe("global task definitions", () => {
		it("should apply global task definitions", () => {
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				packageJson: {
					name: "pkg1",
					version: "1.0.0",
					scripts: {
						build: "tsc",
						compile: "tsc --noEmit",
					},
				},
				getScript: vi.fn((name: string) => {
					const scripts: Record<string, string> = {
						build: "tsc",
						compile: "tsc --noEmit",
					};
					return scripts[name];
				}),
			});

			const packages = new Map<string, BuildPackage>([["pkg1", pkg1]]);

			const globalTaskDefinitions = {
				build: {
					dependsOn: ["compile"],
					script: true,
				},
				compile: {
					dependsOn: [],
					script: true,
				},
			};

			const graph = new BuildGraph(
				packages,
				[],
				mockContext,
				["build"],
				globalTaskDefinitions,
				() => () => true,
				mockLogger,
				{ matchedOnly: false, worker: false },
			);

			expect(graph).toBeDefined();
		});
	});

	describe("version matching", () => {
		it("should skip dependencies with version mismatch", () => {
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				combinedDependencies: [
					{ name: "pkg2", version: "^2.0.0" }, // requires 2.x
				],
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
				version: "1.0.0", // but pkg2 is 1.0.0
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

			// Should not throw - version mismatch is handled gracefully
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
			}).not.toThrow();
		});

		it("should include dependencies with matching versions", () => {
			const pkg1 = createMockBuildPackage("pkg1", {
				matched: true,
				combinedDependencies: [
					{ name: "pkg2", version: "^1.0.0" }, // requires 1.x
				],
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
				version: "1.5.0", // matches ^1.0.0
				packageJson: {
					name: "pkg2",
					version: "1.5.0",
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
			}).not.toThrow();
		});
	});
});
