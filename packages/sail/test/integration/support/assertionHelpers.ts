import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "vitest";

/**
 * Assertion helpers for integration tests.
 */

/**
 * Asserts that a file exists at the specified path.
 *
 * @param filePath - Absolute path to the file
 * @param message - Optional custom error message
 *
 * @example
 * ```typescript
 * await assertFileExists("/tmp/test/dist/index.js");
 * ```
 */
export async function assertFileExists(
	filePath: string,
	message?: string,
): Promise<void> {
	try {
		await access(filePath);
	} catch {
		const msg = message ?? `Expected file to exist: ${filePath}`;
		throw new Error(msg);
	}
}

/**
 * Asserts that a file does not exist at the specified path.
 *
 * @param filePath - Absolute path to the file
 * @param message - Optional custom error message
 *
 * @example
 * ```typescript
 * await assertFileNotExists("/tmp/test/dist/removed.js");
 * ```
 */
export async function assertFileNotExists(
	filePath: string,
	message?: string,
): Promise<void> {
	try {
		await access(filePath);
		const msg = message ?? `Expected file to not exist: ${filePath}`;
		throw new Error(msg);
	} catch (error) {
		// File doesn't exist - this is expected
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
	}
}

/**
 * Asserts that a directory exists at the specified path.
 *
 * @param dirPath - Absolute path to the directory
 * @param message - Optional custom error message
 *
 * @example
 * ```typescript
 * await assertDirectoryExists("/tmp/test/dist");
 * ```
 */
export async function assertDirectoryExists(
	dirPath: string,
	message?: string,
): Promise<void> {
	try {
		const stats = await stat(dirPath);
		if (!stats.isDirectory()) {
			const msg = message ?? `Path exists but is not a directory: ${dirPath}`;
			throw new Error(msg);
		}
	} catch {
		const msg = message ?? `Expected directory to exist: ${dirPath}`;
		throw new Error(msg);
	}
}

/**
 * Asserts that a file contains the specified content.
 *
 * @param filePath - Absolute path to the file
 * @param expectedContent - Expected file content (full or partial)
 * @param partial - If true, checks if content contains expectedContent; if false, checks exact match
 *
 * @example
 * ```typescript
 * await assertFileContains("/tmp/test/output.txt", "success", true);
 * ```
 */
export async function assertFileContains(
	filePath: string,
	expectedContent: string,
	partial: boolean = true,
): Promise<void> {
	const content = await readFile(filePath, "utf-8");

	if (partial) {
		expect(content).toContain(expectedContent);
	} else {
		expect(content).toBe(expectedContent);
	}
}

/**
 * Asserts that multiple files exist in a directory.
 *
 * @param dirPath - Absolute path to the directory
 * @param fileNames - Array of file names to check
 *
 * @example
 * ```typescript
 * await assertFilesExist("/tmp/test/dist", ["index.js", "types.d.ts"]);
 * ```
 */
export async function assertFilesExist(
	dirPath: string,
	fileNames: string[],
): Promise<void> {
	for (const fileName of fileNames) {
		await assertFileExists(join(dirPath, fileName));
	}
}

/**
 * Asserts that a build output directory contains expected artifacts.
 *
 * @param buildDir - Absolute path to the build output directory
 * @param expectedFiles - Array of expected file names
 *
 * @example
 * ```typescript
 * await assertBuildOutput("/tmp/test/packages/app/dist", [
 *   "index.js",
 *   "index.d.ts"
 * ]);
 * ```
 */
export async function assertBuildOutput(
	buildDir: string,
	expectedFiles: string[],
): Promise<void> {
	await assertDirectoryExists(buildDir);
	await assertFilesExist(buildDir, expectedFiles);
}

/**
 * Build assertion result.
 */
export interface BuildAssertions {
	/**
	 * Assert that the build succeeded.
	 */
	succeeded: () => void;

	/**
	 * Assert that the build failed.
	 */
	failed: () => void;

	/**
	 * Assert that specific tasks were executed.
	 */
	executedTasks: (taskNames: string[]) => void;

	/**
	 * Assert that specific tasks were skipped (cached).
	 */
	skippedTasks: (taskNames: string[]) => void;
}

/**
 * Creates assertion helpers for build results.
 *
 * @param buildResult - Build result object
 * @returns Object with assertion methods
 *
 * @example
 * ```typescript
 * const result = await buildGraph.build(["build"]);
 * const assert = createBuildAssertions(result);
 * assert.succeeded();
 * assert.executedTasks(["app#build", "lib#build"]);
 * ```
 */
export function createBuildAssertions(buildResult: {
	failures?: unknown[];
	statistics?: { executedTasks?: number; skippedTasks?: number };
	tasks?: Array<{ name: string; skipped?: boolean }>;
}): BuildAssertions {
	return {
		executedTasks(taskNames: string[]): void {
			const executedTasks =
				buildResult.tasks?.filter((t) => !t.skipped).map((t) => t.name) ?? [];
			for (const taskName of taskNames) {
				expect(executedTasks).toContain(taskName);
			}
		},

		failed(): void {
			expect(buildResult.failures).toBeDefined();
			expect(buildResult.failures!.length).toBeGreaterThan(0);
		},

		skippedTasks(taskNames: string[]): void {
			const skippedTasks =
				buildResult.tasks?.filter((t) => t.skipped).map((t) => t.name) ?? [];
			for (const taskName of taskNames) {
				expect(skippedTasks).toContain(taskName);
			}
		},

		succeeded(): void {
			expect(buildResult.failures).toBeUndefined();
		},
	};
}
