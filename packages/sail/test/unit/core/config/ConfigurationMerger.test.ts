import { describe, expect, it } from "vitest";
import { ConfigurationMerger } from "../../../../src/core/config/ConfigurationMerger.js";
import type { IDependencyFilters } from "../../../../src/core/interfaces/index.js";
import type {
	TaskDefinitions,
	TaskDefinitionsOnDisk,
} from "../../../../src/core/taskDefinitions.js";

describe("ConfigurationMerger", () => {
	const merger = new ConfigurationMerger();

	describe("mergeTaskDefinitions", () => {
		it("should include global task definitions when package has matching script", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const packageScripts = {
				build: "tsc",
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			expect(result.build).toBeDefined();
			expect(result.build?.dependsOn).toEqual(["^build"]);
			expect(result.build?.script).toBe(true);
		});

		it("should skip global script tasks when package doesn't have the script", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const packageScripts = {
				test: "vitest",
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			// Build task should be skipped because package doesn't have build script
			expect(result.build).toBeUndefined();
		});

		it("should include global non-script tasks regardless of package scripts", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				"group-task": {
					dependsOn: ["build", "test"],
					script: false,
					before: [],
					children: [],
					after: [],
				},
			};

			const packageScripts = {
				build: "tsc",
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			// Non-script tasks should be included regardless of scripts
			expect(result["group-task"]).toBeDefined();
			expect(result["group-task"]?.script).toBe(false);
		});

		it("should handle empty package scripts", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const packageScripts = {};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			// Should return empty task definitions when no scripts match
			expect(Object.keys(result)).toHaveLength(0);
		});

		it("should override global definitions with package-specific definitions", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const packageTaskDefinitions: TaskDefinitionsOnDisk = {
				build: {
					dependsOn: ["clean", "^build"],
					script: true,
					before: [],
					after: [],
				},
			};

			const packageScripts = {
				build: "tsc",
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				packageTaskDefinitions,
				packageScripts,
				filters,
			);

			// Package definition should override global
			expect(result.build).toBeDefined();
			expect(result.build?.dependsOn).toEqual(["clean", "^build"]);
		});

		it("should apply filters to global task dependencies", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build", "clean"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const packageScripts = {
				build: "tsc",
			};

			const filters: IDependencyFilters = {
				globalAllow: (dep) => dep === "^build", // Only allow ^build
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			// Only ^build should be kept, clean should be filtered out
			expect(result.build?.dependsOn).toEqual(["^build"]);
		});

		it("should apply filters to before/after dependencies", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: ["clean", "*"],
					children: [],
					after: ["^*"],
				},
			};

			const packageScripts = {
				build: "tsc",
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: (dep) => dep === "*", // Only allow *
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			expect(result.build?.before).toEqual(["*"]);
			expect(result.build?.after).toEqual([]); // ^* filtered out
		});

		it("should not inherit children from global definitions", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: ["compile", "bundle"],
					after: [],
				},
			};

			const packageScripts = {
				build: "tsc",
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			const result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				packageScripts,
				filters,
			);

			// Children should always be empty from global definitions
			expect(result.build?.children).toEqual([]);
		});
	});

	describe("mergeConfigurationArrays", () => {
		it('should expand "..." to include inherited dependencies', () => {
			const packageConfig = ["clean", "...", "bundle"];
			const globalConfig = ["^build", "compile"];

			const result = merger.mergeConfigurationArrays(
				packageConfig,
				globalConfig,
			);

			expect(result).toEqual(["clean", "bundle", "^build", "compile"]);
		});

		it('should remove "..." when no global config exists', () => {
			const packageConfig = ["clean", "...", "bundle"];
			const globalConfig = undefined;

			const result = merger.mergeConfigurationArrays(
				packageConfig,
				globalConfig,
			);

			expect(result).toEqual(["clean", "bundle"]);
		});

		it('should keep config unchanged when no "..." present', () => {
			const packageConfig = ["clean", "build"];
			const globalConfig = ["^build", "compile"];

			const result = merger.mergeConfigurationArrays(
				packageConfig,
				globalConfig,
			);

			expect(result).toEqual(["clean", "build"]);
		});

		it('should handle multiple "..." occurrences', () => {
			const packageConfig = ["...", "clean", "...", "bundle"];
			const globalConfig = ["^build"];

			const result = merger.mergeConfigurationArrays(
				packageConfig,
				globalConfig,
			);

			// Multiple ... should be removed and global added once
			expect(result).toEqual(["clean", "bundle", "^build"]);
		});

		it("should handle empty arrays", () => {
			const packageConfig: string[] = [];
			const globalConfig: string[] = [];

			const result = merger.mergeConfigurationArrays(
				packageConfig,
				globalConfig,
			);

			expect(result).toEqual([]);
		});
	});

	describe("regression test for script matching bug", () => {
		it("should correctly handle workspace root with no scripts followed by packages with scripts", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			// First: workspace root with no scripts
			const rootResult = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				{}, // Empty scripts
				filters,
			);

			// Root should have empty task definitions
			expect(Object.keys(rootResult)).toHaveLength(0);

			// Second: regular package with build script
			const packageResult = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				{ build: "tsc" }, // Has build script
				filters,
			);

			// Package should have build task definition
			expect(Object.keys(packageResult)).toContain("build");
			expect(packageResult.build).toBeDefined();
			expect(packageResult.build?.dependsOn).toEqual(["^build"]);
		});

		it("should handle packages with different script sets independently", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
				test: {
					dependsOn: ["^test"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const filters: IDependencyFilters = {
				globalAllow: () => true,
				globalAllowExpansionsStar: () => true,
			};

			// Package 1: only has build script
			const pkg1Result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				{ build: "tsc" },
				filters,
			);

			expect(Object.keys(pkg1Result)).toEqual(["build"]);
			expect(pkg1Result.test).toBeUndefined();

			// Package 2: only has test script
			const pkg2Result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				{ test: "vitest" },
				filters,
			);

			expect(Object.keys(pkg2Result)).toEqual(["test"]);
			expect(pkg2Result.build).toBeUndefined();

			// Package 3: has both scripts
			const pkg3Result = merger.mergeTaskDefinitions(
				globalTaskDefinitions,
				undefined,
				{ build: "tsc", test: "vitest" },
				filters,
			);

			expect(Object.keys(pkg3Result).sort()).toEqual(["build", "test"]);
			expect(pkg3Result.build).toBeDefined();
			expect(pkg3Result.test).toBeDefined();
		});
	});
});
