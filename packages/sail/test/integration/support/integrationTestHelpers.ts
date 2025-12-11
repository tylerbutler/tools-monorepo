import { execSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";

/**
 * Integration test helpers for managing temporary directories and test fixtures.
 */

/**
 * Creates a temporary directory for integration tests.
 * The directory will be created in the system temp directory with a unique name.
 *
 * @param prefix - Prefix for the temp directory name (e.g., "sail-test-")
 * @param initGit - Whether to initialize a git repository in the directory (default: true)
 * @returns Promise resolving to the absolute path of the created directory
 *
 * @example
 * ```typescript
 * const testDir = await createTempDirectory("sail-test-");
 * // Use testDir for integration tests
 * await cleanupTempDirectory(testDir);
 * ```
 */
export async function createTempDirectory(
	prefix = "sail-test-",
	initGit = true,
): Promise<string> {
	const tempPath = join(tmpdir(), prefix);
	const dir = await mkdtemp(tempPath);

	if (initGit) {
		// Initialize git repository (required by Sail)
		execSync("git init", { cwd: dir, stdio: "ignore" });
		execSync('git config user.email "test@example.com"', {
			cwd: dir,
			stdio: "ignore",
		});
		execSync('git config user.name "Test User"', { cwd: dir, stdio: "ignore" });
	}

	return dir;
}

/**
 * Recursively removes a temporary directory and all its contents.
 *
 * @param directory - Absolute path to the directory to remove
 * @returns Promise that resolves when cleanup is complete
 *
 * @example
 * ```typescript
 * const testDir = await createTempDirectory();
 * try {
 *   // Run tests
 * } finally {
 *   await cleanupTempDirectory(testDir);
 * }
 * ```
 */
export async function cleanupTempDirectory(directory: string): Promise<void> {
	await rm(directory, { force: true, recursive: true });
}

/**
 * Creates a test context with automatic cleanup.
 * Useful for integration tests that need temporary directories.
 *
 * @param prefix - Prefix for the temp directory name
 * @returns Object with testDir path and cleanup function
 *
 * @example
 * ```typescript
 * describe("integration test", () => {
 *   let ctx: TestContext;
 *
 *   beforeEach(async () => {
 *     ctx = await setupTestContext("my-test-");
 *   });
 *
 *   afterEach(async () => {
 *     await ctx.cleanup();
 *   });
 *
 *   it("should work", async () => {
 *     // Use ctx.testDir
 *   });
 * });
 * ```
 */
export async function setupTestContext(
	prefix = "sail-test-",
): Promise<TestContext> {
	const testDir = await createTempDirectory(prefix);

	return {
		cleanup: async () => {
			await cleanupTempDirectory(testDir);
		},
		testDir,
	};
}

/**
 * Test context returned by setupTestContext.
 */
export interface TestContext {
	/**
	 * Absolute path to the temporary test directory.
	 */
	testDir: string;

	/**
	 * Cleanup function to remove the test directory and all its contents.
	 */
	cleanup: () => Promise<void>;
}

/**
 * Helper to run a test with automatic temp directory setup and cleanup.
 *
 * @param testFn - Test function that receives the test directory path
 * @param prefix - Prefix for the temp directory name
 * @returns Promise that resolves when the test completes
 *
 * @example
 * ```typescript
 * it("should build packages", async () => {
 *   await withTempDirectory(async (testDir) => {
 *     // Copy fixtures to testDir
 *     // Run build
 *     // Verify output
 *   });
 * });
 * ```
 */
export async function withTempDirectory(
	testFn: (testDir: string) => Promise<void>,
	prefix = "sail-test-",
): Promise<void> {
	const testDir = await createTempDirectory(prefix);
	try {
		await testFn(testDir);
	} finally {
		await cleanupTempDirectory(testDir);
	}
}
