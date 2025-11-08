import { describe, expect, it } from "vitest";
import { computeCacheKey } from "../../../../src/core/sharedCache/cacheKey.js";
import type { CacheKeyInputs } from "../../../../src/core/sharedCache/types.js";

describe("computeCacheKey", () => {
	describe("dependency hash changes", () => {
		it("should produce different cache keys when dependencyHashes change", () => {
			// Arrange: Create base cache key inputs
			const baseInputs: CacheKeyInputs = {
				packageName: "@test/left",
				taskName: "build",
				executable: "tsc",
				command: "tsc --build",
				inputHashes: [
					{ path: "src/index.ts", hash: "abc123" },
					{ path: "tsconfig.json", hash: "def456" },
				],
				cacheSchemaVersion: "1.0",
				nodeVersion: "18.0.0",
				arch: "x64",
				platform: "linux",
				lockfileHash: "lockfile123",
			};

			// Scenario 1: No dependency hashes
			const key1 = computeCacheKey(baseInputs);

			// Scenario 2: With dependency hash from base package (Build 2)
			const inputsWithDep1: CacheKeyInputs = {
				...baseInputs,
				dependencyHashes: [
					{ name: "@test/base#build", hash: "6a1ed063abc123" },
				],
			};
			const key2 = computeCacheKey(inputsWithDep1);

			// Scenario 3: Same but with UPDATED dependency hash (Build 3)
			const inputsWithDep2: CacheKeyInputs = {
				...baseInputs,
				dependencyHashes: [
					{ name: "@test/base#build", hash: "86051332def456" },
				],
			};
			const key3 = computeCacheKey(inputsWithDep2);

			// Assert: All three keys should be different
			expect(key1).not.toBe(key2);
			expect(key2).not.toBe(key3);
			expect(key1).not.toBe(key3);
		});

		it("should produce same cache key when dependencyHashes are identical", () => {
			// Arrange
			const inputs1: CacheKeyInputs = {
				packageName: "@test/left",
				taskName: "build",
				executable: "tsc",
				command: "tsc --build",
				inputHashes: [{ path: "src/index.ts", hash: "abc123" }],
				dependencyHashes: [
					{ name: "@test/base#build", hash: "6a1ed063abc123" },
				],
				cacheSchemaVersion: "1.0",
				nodeVersion: "18.0.0",
				arch: "x64",
				platform: "linux",
				lockfileHash: "lockfile123",
			};

			const inputs2: CacheKeyInputs = {
				...inputs1,
				dependencyHashes: [
					{ name: "@test/base#build", hash: "6a1ed063abc123" },
				],
			};

			// Act
			const key1 = computeCacheKey(inputs1);
			const key2 = computeCacheKey(inputs2);

			// Assert
			expect(key1).toBe(key2);
		});

		it("should sort dependencyHashes by name for deterministic keys", () => {
			// Arrange
			const baseInputs: CacheKeyInputs = {
				packageName: "@test/top",
				taskName: "build",
				executable: "tsc",
				command: "tsc --build",
				inputHashes: [{ path: "src/index.ts", hash: "abc123" }],
				cacheSchemaVersion: "1.0",
				nodeVersion: "18.0.0",
				arch: "x64",
				platform: "linux",
				lockfileHash: "lockfile123",
			};

			// Same dependencies in different order
			const inputsOrder1: CacheKeyInputs = {
				...baseInputs,
				dependencyHashes: [
					{ name: "@test/left#build", hash: "hash1" },
					{ name: "@test/right#build", hash: "hash2" },
				],
			};

			const inputsOrder2: CacheKeyInputs = {
				...baseInputs,
				dependencyHashes: [
					{ name: "@test/right#build", hash: "hash2" },
					{ name: "@test/left#build", hash: "hash1" },
				],
			};

			// Act
			const key1 = computeCacheKey(inputsOrder1);
			const key2 = computeCacheKey(inputsOrder2);

			// Assert: Keys should be identical despite different input order
			expect(key1).toBe(key2);
		});
	});

	describe("other cache key properties", () => {
		it("should produce different keys when input file hashes change", () => {
			const inputs1: CacheKeyInputs = {
				packageName: "@test/pkg",
				taskName: "build",
				executable: "tsc",
				command: "tsc",
				inputHashes: [{ path: "src/index.ts", hash: "abc123" }],
				cacheSchemaVersion: "1.0",
				nodeVersion: "18.0.0",
				arch: "x64",
				platform: "linux",
				lockfileHash: "lockfile123",
			};

			const inputs2: CacheKeyInputs = {
				...inputs1,
				inputHashes: [{ path: "src/index.ts", hash: "xyz789" }],
			};

			const key1 = computeCacheKey(inputs1);
			const key2 = computeCacheKey(inputs2);

			expect(key1).not.toBe(key2);
		});
	});
});
