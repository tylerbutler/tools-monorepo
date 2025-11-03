import { join } from "node:path";
import registerDebug from "debug";
import type { BuildGraph } from "../../../src/core/buildGraph.js";
import { SailBuildRepo } from "../../../src/core/buildRepo.js";
import type { BuildOptions } from "../../../src/core/options.js";

const traceCache = registerDebug("sail:test:cache");

/**
 * Helper for creating and executing BuildGraph in integration tests.
 */

/**
 * Logger implementation for integration tests.
 * Captures output for assertions and debugging.
 */
export class TestLogger {
	public logs: string[] = [];

	public log(message: string): void {
		this.logs.push(message);
	}

	public error(message: string): void {
		this.logs.push(`ERROR: ${message}`);
	}

	public errorLog(message: string): void {
		this.logs.push(`ERROR_LOG: ${message}`);
	}

	public warn(message: string): void {
		this.logs.push(`WARN: ${message}`);
	}

	public debug(message: string): void {
		this.logs.push(`DEBUG: ${message}`);
	}

	public verbose(message: string): void {
		this.logs.push(`VERBOSE: ${message}`);
	}

	/**
	 * Get all captured logs as a single string.
	 */
	public getOutput(): string {
		return this.logs.join("\n");
	}

	/**
	 * Clear all captured logs.
	 */
	public clear(): void {
		this.logs = [];
	}

	/**
	 * Check if logs contain a specific message.
	 */
	public contains(message: string): boolean {
		return this.logs.some((log) => log.includes(message));
	}
}

/**
 * Integration test context for BuildGraph execution.
 */
export interface BuildGraphTestContext {
	/**
	 * The BuildRepo instance for the test monorepo.
	 */
	repo: SailBuildRepo;

	/**
	 * Test logger for capturing build output.
	 */
	logger: TestLogger;

	/**
	 * Executes a build with the specified task names.
	 *
	 * @param taskNames - Names of tasks to build (default: ["build"])
	 * @param options - Additional build options
	 * @returns The BuildGraph instance after build completion
	 */
	executeBuild: (
		taskNames?: string[],
		options?: Partial<BuildOptions>,
	) => Promise<BuildGraph>;

	/**
	 * Creates a BuildGraph without executing it.
	 *
	 * @param options - Build options
	 * @returns The BuildGraph instance ready for execution
	 */
	createBuildGraph: (options?: Partial<BuildOptions>) => Promise<BuildGraph>;

	/**
	 * Installs dependencies for all packages in the monorepo.
	 *
	 * @returns Promise that resolves to true if install succeeded
	 */
	installDependencies: () => Promise<boolean>;
}

/**
 * Creates a BuildGraph integration test context from a test directory.
 *
 * @param testDir - Absolute path to the test monorepo directory
 * @param packageFilter - Optional package name filter (regex pattern)
 * @returns Integration test context with repo, logger, and execution helpers
 *
 * @example
 * ```typescript
 * const ctx = await createBuildGraphTestContext("/tmp/test-monorepo");
 * const buildGraph = await ctx.executeBuild(["build"]);
 * expect(ctx.logger.contains("Build completed")).toBe(true);
 * ```
 */
export async function createBuildGraphTestContext(
	testDir: string,
	packageFilter?: string,
): Promise<BuildGraphTestContext> {
	const logger = new TestLogger();

	// Clear config cache to ensure fresh config loading for each test
	const { getSailConfig } = await import("../../../src/core/config.js");
	try {
		getSailConfig(testDir, true); // noCache = true clears the cache
	} catch {
		// Ignore errors - config might not exist yet for some tests
	}

	const repo = new SailBuildRepo(testDir, logger);

	// Load plugins if configured
	await repo.ensureHandlersLoaded();

	// Initialize shared cache for integration tests
	// Use a temp cache directory for each test to avoid interference
	const { initializeSharedCache } = await import(
		"../../../src/core/sharedCache/index.js"
	);
	const cacheDir = join(testDir, ".sail-cache");
	traceCache(
		`createBuildGraphTestContext: testDir=${testDir}, cacheDir=${cacheDir}`,
	);
	const sharedCache = await initializeSharedCache(
		cacheDir,
		testDir, // repoRoot
		false, // skipCacheWrite
		false, // verifyIntegrity
	);

	if (sharedCache) {
		// Add cache to build context (same as build.ts:120)
		// biome-ignore lint/suspicious/noExplicitAny: Accessing internal context property
		(repo as any).context.sharedCache = sharedCache;
	}

	return {
		createBuildGraph: async (options?: Partial<BuildOptions>) => {
			const buildOptions: BuildOptions = {
				build: true,
				buildTaskNames: ["build"],
				dirs: [testDir], // Use testDir as the target directory
				match: [],
				releaseGroups: [],
				verbose: false,
				workspaces: [],
				...options,
				packageFilter: packageFilter ?? options?.packageFilter,
			};

			// Set matched packages
			const matched = repo.setMatched(buildOptions);
			if (!matched) {
				throw new Error("No packages matched the filter");
			}

			// Create the build graph
			return await repo.createBuildGraph(buildOptions);
		},

		executeBuild: async (
			taskNames?: string[],
			options?: Partial<BuildOptions>,
		) => {
			const buildOptions: BuildOptions = {
				build: true,
				buildTaskNames: taskNames ?? ["build"],
				dirs: [testDir], // Use testDir as the target directory
				match: [],
				releaseGroups: [],
				verbose: false,
				workspaces: [],
				...options,
				packageFilter: packageFilter ?? options?.packageFilter,
			};

			// Set matched packages
			const matched = repo.setMatched(buildOptions);
			if (!matched) {
				throw new Error("No packages matched the filter");
			}

			// Create the build graph
			traceCache(`executeBuild: Creating new build graph at ${Date.now()}`);
			const buildGraph = await repo.createBuildGraph(buildOptions);

			// Check install
			const installed = await buildGraph.checkInstall();
			if (!installed) {
				throw new Error("Dependencies not installed");
			}

			// Execute the build
			await buildGraph.build();

			return buildGraph;
		},

		installDependencies: async () => {
			// Use the built-in ensureInstalled method from SailBuildRepo
			// Convert Map to array of package values
			// Allow lockfile updates for integration tests to handle version mismatches
			return await SailBuildRepo.ensureInstalled(
				Array.from(repo.packages.values()),
				true, // updateLockfile
			);
		},

		logger,
		repo,
	};
}

/**
 * Build execution result helper for making assertions.
 */
export interface BuildExecutionResult {
	/**
	 * The BuildGraph instance after execution.
	 */
	buildGraph: BuildGraph;

	/**
	 * Test logger with captured output.
	 */
	logger: TestLogger;

	/**
	 * Total elapsed time for the build.
	 */
	elapsedTime: number;

	/**
	 * Cache statistics (if cache was enabled).
	 */
	cacheStats?: string;
}

/**
 * Executes a build and returns results for assertions.
 *
 * @param testDir - Absolute path to the test monorepo
 * @param taskNames - Task names to build
 * @param options - Build options
 * @returns Build execution result with graph, logger, and timing
 *
 * @example
 * ```typescript
 * const result = await executeBuildAndGetResult("/tmp/test-monorepo", ["build"]);
 * expect(result.buildGraph.taskStats.leafBuiltCount).toBeGreaterThan(0);
 * expect(result.logger.contains("completed")).toBe(true);
 * ```
 */
/**
 * Track which directories have had dependencies installed to avoid redundant installs.
 * Key insight: pnpm install with updateLockfile=true changes pnpm-lock.yaml,
 * which changes the lockfileHash in the cache key, invalidating all cached entries!
 */
const installedDirs = new Set<string>();

/**
 * Track BuildGraphTestContext instances per test directory to reuse cache.
 * Key insight: Each call to createBuildGraphTestContext creates a NEW cache instance,
 * so multiple builds in the same test wouldn't see each other's cached entries!
 */
const testContexts = new Map<string, BuildGraphTestContext>();

export async function executeBuildAndGetResult(
	testDir: string,
	taskNames: string[] = ["build"],
	options?: Partial<BuildOptions>,
): Promise<BuildExecutionResult> {
	// Reuse existing context (and cache!) or create new one
	const contextExists = testContexts.has(testDir);
	traceCache(
		`executeBuildAndGetResult: testDir=${testDir}, contextExists=${contextExists}`,
	);
	let ctx = testContexts.get(testDir);
	if (!ctx) {
		ctx = await createBuildGraphTestContext(testDir);
		testContexts.set(testDir, ctx);
	}

	// Install dependencies ONCE per test directory to avoid lockfile changes
	// that would invalidate the shared cache
	if (!installedDirs.has(testDir)) {
		await ctx.installDependencies();
		installedDirs.add(testDir);
	}

	const buildGraph = await ctx.executeBuild(taskNames, options);
	const elapsedTime = buildGraph.totalElapsedTime; // Get elapsed time from BuildGraph (getter, not method)

	const cacheStats = buildGraph.getCacheStatistics();

	// DEBUG: Check which manifests exist at the END of this build
	const { readdir } = await import("node:fs/promises");
	const { join: joinPath } = await import("node:path");
	const { existsSync: checkExists } = await import("node:fs");
	try {
		const entriesDir = joinPath(testDir, ".sail-cache/v1/entries");
		if (checkExists(entriesDir)) {
			const entries = await readdir(entriesDir);
			const manifestStatus = entries.map((entry) => {
				const manifestPath = joinPath(entriesDir, entry, "manifest.json");
				const exists = checkExists(manifestPath);
				return `${entry.substring(0, 12)}:${exists ? "✓" : "✗"}`;
			});
			traceCache(`End of build - manifests: [${manifestStatus.join(", ")}]`);
		}
	} catch (e) {
		traceCache(`Error checking manifests: ${e}`);
	}

	return {
		buildGraph,
		cacheStats,
		elapsedTime,
		logger: ctx.logger,
	};
}
