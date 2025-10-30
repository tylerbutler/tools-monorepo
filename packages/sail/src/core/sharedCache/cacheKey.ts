/*!
 * Cache key computation utilities.
 *
 * Ported from FluidFramework build-tools.
 */

import { createHash } from "node:crypto";
import type { CacheKeyInputs } from "./types.js";

/**
 * Compute a deterministic cache key from task inputs.
 *
 * The cache key is a SHA-256 hash of all inputs that affect task output.
 * Properties:
 * - Deterministic: Same inputs always produce the same key
 * - Collision-resistant: Different inputs produce different keys
 * - Order-independent: Array ordering doesn't affect the key
 *
 * @param inputs - All inputs that affect the task execution
 * @returns A 64-character hexadecimal SHA-256 hash
 */
export function computeCacheKey(inputs: CacheKeyInputs): string {
	// Sort all arrays and object keys for deterministic serialization
	const normalizedInputs = normalizeInputs(inputs);

	// Serialize to JSON
	const keyData = JSON.stringify(normalizedInputs);

	// Compute SHA-256 hash
	return createHash("sha256").update(keyData, "utf8").digest("hex");
}

/**
 * Normalize cache key inputs for deterministic serialization.
 */
function normalizeInputs(inputs: CacheKeyInputs): Record<string, unknown> {
	// Build normalized object with properties in a fixed order
	const normalized: Record<string, unknown> = {
		packageName: inputs.packageName,
		taskName: inputs.taskName,
		executable: inputs.executable,
		command: inputs.command,
		// Sort input hashes by path
		inputHashes: [...inputs.inputHashes].sort((a, b) =>
			a.path.localeCompare(b.path),
		),
		cacheSchemaVersion: inputs.cacheSchemaVersion,
		nodeVersion: inputs.nodeVersion,
		arch: inputs.arch,
		platform: inputs.platform,
		lockfileHash: inputs.lockfileHash,
	};

	// Add optional fields if present
	if (inputs.nodeEnv !== undefined) {
		normalized.nodeEnv = inputs.nodeEnv;
	}

	if (inputs.cacheBustVars !== undefined) {
		// Sort cache bust var keys
		const sortedCacheBustVars: Record<string, string> = {};
		const keys = Object.keys(inputs.cacheBustVars).sort();
		for (const key of keys) {
			sortedCacheBustVars[key] = inputs.cacheBustVars[key];
		}
		normalized.cacheBustVars = sortedCacheBustVars;
	}

	if (inputs.toolVersion !== undefined) {
		normalized.toolVersion = inputs.toolVersion;
	}

	if (inputs.configHashes !== undefined) {
		// Sort config hash keys
		const sortedConfigHashes: Record<string, string> = {};
		const keys = Object.keys(inputs.configHashes).sort();
		for (const key of keys) {
			sortedConfigHashes[key] = inputs.configHashes[key];
		}
		normalized.configHashes = sortedConfigHashes;
	}

	return normalized;
}

/**
 * Hash file contents using SHA-256.
 *
 * @param content - File content to hash
 * @returns 64-character hexadecimal SHA-256 hash
 */
export function hashContent(content: string | Buffer): string {
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Verify that a cache key matches the expected inputs.
 *
 * @param cacheKey - The cache key to verify
 * @param inputs - The inputs that should produce this key
 * @returns True if the key matches the inputs
 */
export function verifyCacheKey(
	cacheKey: string,
	inputs: CacheKeyInputs,
): boolean {
	const expectedKey = computeCacheKey(inputs);
	return cacheKey === expectedKey;
}

/**
 * Extract a short prefix from a cache key for display purposes.
 *
 * @param cacheKey - The full cache key
 * @param length - Number of characters to include
 * @returns Short prefix of the cache key
 */
export function shortCacheKey(cacheKey: string, length = 12): string {
	return cacheKey.substring(0, length);
}
