import { beforeEach, describe, expect, it } from "vitest";
import type { SailPackageJson } from "../../../../src/common/npmPackage.js";
import { TaskDefinitionCache } from "../../../../src/core/cache/TaskDefinitionCache.js";
import type { TaskDefinitions } from "../../../../src/core/taskDefinitions.js";

describe("TaskDefinitionCache", () => {
	let cache: TaskDefinitionCache;

	beforeEach(() => {
		cache = new TaskDefinitionCache();
	});

	describe("cache key generation", () => {
		it("should generate different cache keys for packages with undefined scripts vs defined scripts", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkgWithUndefinedScripts: SailPackageJson = {
				name: "pkg-no-scripts",
				version: "1.0.0",
				// biome-ignore lint/suspicious/noExplicitAny: Testing edge case with undefined scripts
				scripts: undefined as any,
			};

			const pkgWithScripts: SailPackageJson = {
				name: "pkg-with-scripts",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };

			// Force cache misses by using different compute functions
			let callCount1 = 0;
			let callCount2 = 0;

			cache.getTaskDefinitions(
				pkgWithUndefinedScripts,
				globalTaskDefs,
				options,
				() => {
					callCount1++;
					return {};
				},
			);

			cache.getTaskDefinitions(pkgWithScripts, globalTaskDefs, options, () => {
				callCount2++;
				return {
					build: {
						dependsOn: ["^build"],
						script: true,
						before: [],
						children: [],
						after: [],
					},
				};
			});

			// Both should be cache misses (different keys)
			expect(callCount1).toBe(1);
			expect(callCount2).toBe(1);
		});

		it("should generate the same cache key for identical package configurations", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg1: SailPackageJson = {
				name: "pkg-1",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const pkg2: SailPackageJson = {
				name: "pkg-2",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };
			let callCount = 0;

			const result1 = cache.getTaskDefinitions(
				pkg1,
				globalTaskDefs,
				options,
				() => {
					callCount++;
					return {
						build: {
							dependsOn: ["^build"],
							script: true,
							before: [],
							children: [],
							after: [],
						},
					};
				},
			);

			const result2 = cache.getTaskDefinitions(
				pkg2,
				globalTaskDefs,
				options,
				() => {
					callCount++;
					return {
						build: {
							dependsOn: ["^build"],
							script: true,
							before: [],
							children: [],
							after: [],
						},
					};
				},
			);

			// Second call should be a cache hit
			expect(callCount).toBe(1);
			expect(result1).toBe(result2);
		});

		it("should generate different cache keys for different script configurations", () => {
			const localCache = new TaskDefinitionCache(); // Use local cache instance
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkgWithBuild: SailPackageJson = {
				name: "pkg-build",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const pkgWithBuildAndTest: SailPackageJson = {
				name: "pkg-build-test",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					test: "vitest", // Additional script makes this different
				},
			};

			const options = { isReleaseGroupRoot: false };
			let callCount = 0;

			localCache.getTaskDefinitions(
				pkgWithBuild,
				globalTaskDefs,
				options,
				() => {
					callCount++;
					return {};
				},
			);

			localCache.getTaskDefinitions(
				pkgWithBuildAndTest,
				globalTaskDefs,
				options,
				() => {
					callCount++;
					return {};
				},
			);

			// Both should be cache misses (different script sets)
			expect(callCount).toBe(2);
		});

		it("should generate different cache keys for different global task definitions", () => {
			const localCache = new TaskDefinitionCache(); // Use local cache instance
			const globalTaskDefs1: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const globalTaskDefs2: TaskDefinitions = {
				build: {
					dependsOn: [], // Different dependency - this makes it different
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };
			let call1 = false;
			let call2 = false;

			localCache.getTaskDefinitions(pkg, globalTaskDefs1, options, () => {
				call1 = true;
				return {
					build: {
						dependsOn: ["^build"],
						script: true,
						before: [],
						children: [],
						after: [],
					},
				};
			});

			localCache.getTaskDefinitions(pkg, globalTaskDefs2, options, () => {
				call2 = true;
				return {
					build: {
						dependsOn: [],
						script: true,
						before: [],
						children: [],
						after: [],
					},
				};
			});

			// Both should be cache misses (different global task defs)
			expect(call1).toBe(true);
			expect(call2).toBe(true);
		});

		it("should generate different cache keys for different isReleaseGroupRoot values", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			let callCount = 0;

			cache.getTaskDefinitions(
				pkg,
				globalTaskDefs,
				{ isReleaseGroupRoot: false },
				() => {
					callCount++;
					return {};
				},
			);

			cache.getTaskDefinitions(
				pkg,
				globalTaskDefs,
				{ isReleaseGroupRoot: true },
				() => {
					callCount++;
					return {};
				},
			);

			// Both should be cache misses (different options)
			expect(callCount).toBe(2);
		});
	});

	describe("cache behavior", () => {
		it("should cache and return task definitions on subsequent calls", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "test-pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };
			const expectedResult: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			let computeCallCount = 0;
			const computeFn = () => {
				computeCallCount++;
				return expectedResult;
			};

			// First call - cache miss
			const result1 = cache.getTaskDefinitions(
				pkg,
				globalTaskDefs,
				options,
				computeFn,
			);
			expect(computeCallCount).toBe(1);
			expect(result1).toBe(expectedResult);

			// Second call - cache hit
			const result2 = cache.getTaskDefinitions(
				pkg,
				globalTaskDefs,
				options,
				computeFn,
			);
			expect(computeCallCount).toBe(1); // Should not call compute again
			expect(result2).toBe(expectedResult);
			expect(result2).toBe(result1); // Should return same object
		});

		it("should handle empty scripts object differently from undefined", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkgWithEmptyScripts: SailPackageJson = {
				name: "pkg-empty",
				version: "1.0.0",
				scripts: {},
			};

			const pkgWithUndefinedScripts: SailPackageJson = {
				name: "pkg-undefined",
				version: "1.0.0",
				// biome-ignore lint/suspicious/noExplicitAny: Testing edge case with undefined scripts
				scripts: undefined as any,
			};

			const options = { isReleaseGroupRoot: false };
			let callCount = 0;

			cache.getTaskDefinitions(
				pkgWithEmptyScripts,
				globalTaskDefs,
				options,
				() => {
					callCount++;
					return {};
				},
			);

			cache.getTaskDefinitions(
				pkgWithUndefinedScripts,
				globalTaskDefs,
				options,
				() => {
					callCount++;
					return {};
				},
			);

			// Both should be cache misses (empty object is different from undefined)
			expect(callCount).toBe(2);
		});
	});

	describe("has", () => {
		it("should return true for cached entries", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "test-pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };

			expect(cache.has(pkg, globalTaskDefs, options)).toBe(false);

			cache.getTaskDefinitions(pkg, globalTaskDefs, options, () => ({}));

			expect(cache.has(pkg, globalTaskDefs, options)).toBe(true);
		});

		it("should return false for non-cached entries", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "test-pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };

			expect(cache.has(pkg, globalTaskDefs, options)).toBe(false);
		});
	});

	describe("clear", () => {
		it("should clear all cached entries", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "test-pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };

			cache.getTaskDefinitions(pkg, globalTaskDefs, options, () => ({}));
			expect(cache.has(pkg, globalTaskDefs, options)).toBe(true);

			cache.clear();

			expect(cache.has(pkg, globalTaskDefs, options)).toBe(false);
		});

		it("should allow caching after clear", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg: SailPackageJson = {
				name: "test-pkg",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };
			let computeCount = 0;

			cache.getTaskDefinitions(pkg, globalTaskDefs, options, () => {
				computeCount++;
				return {};
			});
			expect(computeCount).toBe(1);

			cache.clear();

			cache.getTaskDefinitions(pkg, globalTaskDefs, options, () => {
				computeCount++;
				return {};
			});
			expect(computeCount).toBe(2); // Should compute again after clear
		});
	});

	describe("cache size management", () => {
		it("should respect max cache size", () => {
			const smallCache = new TaskDefinitionCache(2);
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			const pkg1: SailPackageJson = {
				name: "pkg-1",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};

			const pkg2: SailPackageJson = {
				name: "pkg-2",
				version: "1.0.0",
				scripts: { build: "tsc", test: "vitest" }, // Different set of scripts
			};

			const pkg3: SailPackageJson = {
				name: "pkg-3",
				version: "1.0.0",
				scripts: { build: "tsc", lint: "biome" }, // Another different set
			};

			const options = { isReleaseGroupRoot: false };
			let count = 0;

			smallCache.getTaskDefinitions(pkg1, globalTaskDefs, options, () => {
				count++;
				return {};
			});
			smallCache.getTaskDefinitions(pkg2, globalTaskDefs, options, () => {
				count++;
				return {};
			});

			const stats = smallCache.getStats();
			expect(stats.size).toBe(2);
			expect(count).toBe(2); // Both computed

			// Adding third entry should evict least recently used
			smallCache.getTaskDefinitions(pkg3, globalTaskDefs, options, () => {
				count++;
				return {};
			});

			const statsAfter = smallCache.getStats();
			expect(statsAfter.size).toBe(2); // Still max 2
			expect(count).toBe(3); // Third one was computed
		});
	});

	describe("regression test for cache key collision bug", () => {
		it("should not return empty task definitions for packages with scripts when workspace root has no scripts", () => {
			const globalTaskDefs: TaskDefinitions = {
				build: {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};

			// Workspace root with undefined scripts
			const workspaceRoot: SailPackageJson = {
				name: "workspace-root",
				version: "1.0.0",
				// biome-ignore lint/suspicious/noExplicitAny: Testing edge case with undefined scripts
				scripts: undefined as any,
			};

			// Regular package with build script
			const regularPackage: SailPackageJson = {
				name: "regular-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const options = { isReleaseGroupRoot: false };

			// Process workspace root first (returns empty task definitions)
			const rootResult = cache.getTaskDefinitions(
				workspaceRoot,
				globalTaskDefs,
				options,
				() => ({}),
			);
			expect(Object.keys(rootResult)).toHaveLength(0);

			// Process regular package (should NOT get cached empty result from root)
			let regularComputeCalled = false;
			const regularResult = cache.getTaskDefinitions(
				regularPackage,
				globalTaskDefs,
				options,
				() => {
					regularComputeCalled = true;
					return {
						build: {
							dependsOn: ["^build"],
							script: true,
							before: [],
							children: [],
							after: [],
						},
					};
				},
			);

			// The compute function MUST be called (cache miss, not cache hit from root)
			expect(regularComputeCalled).toBe(true);

			// The result should contain the build task definition
			expect(Object.keys(regularResult)).toContain("build");
			expect(regularResult.build).toBeDefined();
			expect(regularResult.build?.dependsOn).toEqual(["^build"]);
		});
	});
});
