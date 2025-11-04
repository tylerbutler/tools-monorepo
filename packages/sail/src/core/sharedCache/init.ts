/*!
 * Shared cache initialization utilities.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SharedCacheManager } from "./sharedCacheManager.js";
import type { GlobalCacheKeyComponents } from "./types.js";

/**
 * Cache schema version for forward/backward compatibility.
 * Increment when making incompatible changes to the cache format.
 */
const CACHE_SCHEMA_VERSION = 1;

/**
 * Initialize the shared cache manager with the provided options.
 *
 * @param cacheDir - Path to cache directory (undefined = disabled)
 * @param repoRoot - Repository root directory
 * @param skipCacheWrite - Read-only mode
 * @param verifyIntegrity - Verify hashes on restore
 * @param overwriteCache - Overwrite existing cache entries on conflict
 * @returns Initialized cache manager, or undefined if disabled
 */
export async function initializeSharedCache(
	cacheDir: string | undefined,
	repoRoot: string,
	skipCacheWrite: boolean,
	verifyIntegrity: boolean,
	overwriteCache = false,
): Promise<SharedCacheManager | undefined> {
	if (!cacheDir) {
		return undefined; // Cache disabled
	}

	// Compute global cache key components
	const globalKeyComponents = await computeGlobalCacheKeyComponents(repoRoot);

	const cacheManager = new SharedCacheManager({
		cacheDir,
		repoRoot,
		globalKeyComponents,
		verifyIntegrity,
		skipCacheWrite,
		overwriteCache,
	});

	await cacheManager.initialize();

	return cacheManager;
}

/**
 * Compute global cache key components that apply to all tasks.
 *
 * These values ensure that cache entries are only reused when the
 * environment matches (same Node version, dependencies, etc.).
 */
async function computeGlobalCacheKeyComponents(
	repoRoot: string,
): Promise<GlobalCacheKeyComponents> {
	// Hash the lockfile to detect dependency changes
	const lockfilePath = path.join(repoRoot, "pnpm-lock.yaml");
	let lockfileHash = "";
	try {
		const lockfileContent = await readFile(lockfilePath, "utf8");
		lockfileHash = createHash("sha256").update(lockfileContent).digest("hex");
	} catch {
		// Lockfile doesn't exist or can't be read, use empty string
		// This means cache won't be shared with environments that have lockfile
	}

	// Collect cache bust environment variables
	const cacheBustVars: Record<string, string> = {};
	// biome-ignore lint/style/noProcessEnv: Need to read environment variables for cache busting
	for (const key of Object.keys(process.env)) {
		if (key.startsWith("SAIL_CACHE_BUST")) {
			// biome-ignore lint/style/noProcessEnv: Reading cache bust environment variable
			const value = process.env[key];
			if (value !== undefined) {
				cacheBustVars[key] = value;
			}
		}
	}

	return {
		cacheSchemaVersion: CACHE_SCHEMA_VERSION,
		nodeVersion: process.version,
		arch: process.arch,
		platform: process.platform,
		lockfileHash,
		// biome-ignore lint/style/noProcessEnv: Reading NODE_ENV for cache key
		nodeEnv: process.env.NODE_ENV,
		cacheBustVars:
			Object.keys(cacheBustVars).length > 0 ? cacheBustVars : undefined,
	};
}
