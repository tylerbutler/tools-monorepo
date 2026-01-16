import { readdir, readFile } from "node:fs/promises";
import { join } from "pathe";
import {
	type CCLBehavior,
	type CCLFunction,
	type CCLVariant,
	getConflictingBehavior,
	type ImplementationCapabilities,
} from "./capabilities.js";

// Types derived from JSON schema (single source of truth)
import type { TestCase, TestFile } from "./schema-validation.js";

/**
 * Options for loading test data.
 */
export interface LoadTestDataOptions {
	/** Path to the test data directory */
	testDataPath: string;
	/** Implementation capabilities for filtering */
	capabilities?: ImplementationCapabilities;
	/** Tests to skip by name */
	skipTests?: string[];
}

/**
 * Loaded test data with metadata.
 */
export interface LoadedTestData {
	/** All test cases loaded */
	tests: TestCase[];
	/** Map of file name to tests */
	fileMap: Map<string, TestCase[]>;
	/** Total number of tests */
	totalCount: number;
	/** Number of tests skipped due to filtering */
	skippedCount: number;
}

/**
 * Result of checking if a test should run.
 */
export interface TestFilterResult {
	/** Whether the test should run */
	shouldRun: boolean;
	/** Reason for skipping (if shouldRun is false) */
	skipReason?: string;
}

/**
 * Map of composite functions to their dependencies.
 * Some test functions can be implemented via other functions.
 *
 * TODO: Remove this workaround once ccl-test-data is fixed to list actual
 * required functions instead of composite function names.
 * See: https://github.com/CatConfLang/ccl-test-data/issues/60
 */
const COMPOSITE_FUNCTIONS: Record<string, string[]> = {
	round_trip: ["parse", "print"],
};

/**
 * Check if a function is supported, either directly or via composite implementation.
 */
function isFunctionSupported(
	fn: string,
	capabilities: ImplementationCapabilities,
): boolean {
	// Direct implementation
	if (capabilities.functions.includes(fn as CCLFunction)) {
		return true;
	}

	// Composite implementation
	const compositeDeps = COMPOSITE_FUNCTIONS[fn];
	if (compositeDeps) {
		return compositeDeps.every((dep) =>
			capabilities.functions.includes(dep as CCLFunction),
		);
	}

	return false;
}

/**
 * Check if all required functions are supported.
 */
function checkFunctions(
	test: TestCase,
	capabilities: ImplementationCapabilities,
): TestFilterResult | null {
	const functions = test.functions ?? [];
	const unsupportedFunctions = functions.filter(
		(fn) => !isFunctionSupported(fn, capabilities),
	);
	if (unsupportedFunctions.length > 0) {
		return {
			shouldRun: false,
			skipReason: `Missing required functions: ${unsupportedFunctions.join(", ")}`,
		};
	}
	return null;
}

/**
 * Check if behavior requirements are compatible.
 */
function checkBehaviors(
	test: TestCase,
	capabilities: ImplementationCapabilities,
): TestFilterResult | null {
	for (const requiredBehavior of test.behaviors) {
		const implHasBehavior = capabilities.behaviors.includes(
			requiredBehavior as CCLBehavior,
		);

		if (!implHasBehavior) {
			// Test requires a behavior the implementation doesn't have
			const conflicting = getConflictingBehavior(
				requiredBehavior as CCLBehavior,
			);
			if (conflicting && capabilities.behaviors.includes(conflicting)) {
				return {
					shouldRun: false,
					skipReason: `Behavior conflict: test requires ${requiredBehavior}, implementation uses ${conflicting}`,
				};
			}
			// Even without explicit conflict, skip if required behavior is missing
			return {
				shouldRun: false,
				skipReason: `Missing behavior: ${requiredBehavior}`,
			};
		}
	}
	return null;
}

/**
 * Check if variant requirements are compatible.
 */
function checkVariants(
	test: TestCase,
	capabilities: ImplementationCapabilities,
): TestFilterResult | null {
	if (test.variants.length > 0) {
		const hasMatchingVariant = test.variants.some(
			(v) => v === capabilities.variant,
		);
		if (!hasMatchingVariant) {
			return {
				shouldRun: false,
				skipReason: `Variant mismatch: test requires ${test.variants.join(" or ")}, implementation uses ${capabilities.variant}`,
			};
		}
	}
	return null;
}

/**
 * Check test conflicts against implementation capabilities.
 */
function checkConflicts(
	test: TestCase,
	capabilities: ImplementationCapabilities,
): TestFilterResult | null {
	if (!test.conflicts) {
		return null;
	}

	// Check function conflicts
	if (test.conflicts.functions) {
		const conflictingFunctions = test.conflicts.functions.filter((fn) =>
			capabilities.functions.includes(fn as CCLFunction),
		);
		if (conflictingFunctions.length > 0) {
			return {
				shouldRun: false,
				skipReason: `Function conflict: test conflicts with ${conflictingFunctions.join(", ")}`,
			};
		}
	}

	// Check behavior conflicts
	if (test.conflicts.behaviors) {
		const conflictingBehaviors = test.conflicts.behaviors.filter((b) =>
			capabilities.behaviors.includes(b as CCLBehavior),
		);
		if (conflictingBehaviors.length > 0) {
			return {
				shouldRun: false,
				skipReason: `Behavior conflict: test conflicts with ${conflictingBehaviors.join(", ")}`,
			};
		}
	}

	// Check variant conflicts
	if (test.conflicts.variants?.includes(capabilities.variant as CCLVariant)) {
		return {
			shouldRun: false,
			skipReason: `Variant conflict: test conflicts with ${capabilities.variant}`,
		};
	}

	// Note: Feature conflicts are NOT checked - features are metadata for reporting only

	return null;
}

/**
 * Check if a test should run based on implementation capabilities.
 *
 * Filtering logic:
 * 0. SkipTests: Explicitly skipped tests are excluded
 * 1. Functions: ALL required functions must be supported by the implementation
 * 2. Behaviors: If a test requires specific behaviors, implementation must match
 * 3. Variants: If a test requires a specific variant, implementation must match
 * 4. Conflicts: Test must not conflict with implementation capabilities
 *
 * Note: Features are NOT used for filtering - they are metadata for reporting only.
 */
export function shouldRunTest(
	test: TestCase,
	capabilities: ImplementationCapabilities,
): TestFilterResult {
	// Check explicit skip list first
	if (capabilities.skipTests?.includes(test.name)) {
		return {
			shouldRun: false,
			skipReason: "Explicitly skipped via skipTests",
		};
	}

	// Check each requirement in order
	const checks = [
		checkFunctions,
		checkBehaviors,
		checkVariants,
		checkConflicts,
	];

	for (const check of checks) {
		const result = check(test, capabilities);
		if (result !== null) {
			return result;
		}
	}

	return { shouldRun: true };
}

/**
 * Load test data from JSON files in the test data directory.
 *
 * When capabilities are provided, tests are filtered to only include those
 * that are compatible with the implementation's declared capabilities.
 */
export async function loadTestData(
	options: LoadTestDataOptions,
): Promise<LoadedTestData> {
	const { testDataPath, capabilities, skipTests = [] } = options;

	const files = await readdir(testDataPath);
	const jsonFiles = files.filter((f) => f.endsWith(".json"));

	const fileMap = new Map<string, TestCase[]>();
	const allTests: TestCase[] = [];
	let skippedCount = 0;

	for (const file of jsonFiles) {
		const filePath = join(testDataPath, file);
		const content = await readFile(filePath, "utf-8");
		const testFile: TestFile = JSON.parse(content);

		const compatibleTests: TestCase[] = [];

		for (const test of testFile.tests) {
			// Skip tests by name
			if (skipTests.includes(test.name)) {
				skippedCount++;
				continue;
			}

			// Filter by capabilities if provided
			if (capabilities) {
				const result = shouldRunTest(test, capabilities);
				if (!result.shouldRun) {
					skippedCount++;
					continue;
				}
			}

			compatibleTests.push(test);
		}

		if (compatibleTests.length > 0) {
			fileMap.set(file, compatibleTests);
			allTests.push(...compatibleTests);
		}
	}

	return {
		tests: allTests,
		fileMap,
		totalCount: allTests.length,
		skippedCount,
	};
}

/**
 * Load all tests without filtering.
 * Useful for getting statistics about the full test suite.
 */
export async function loadAllTests(
	testDataPath: string,
): Promise<LoadedTestData> {
	return loadTestData({ testDataPath });
}

/**
 * Group tests by the function they validate.
 */
export function groupTestsByFunction(
	tests: TestCase[],
): Map<string, TestCase[]> {
	const groups = new Map<string, TestCase[]>();

	for (const test of tests) {
		const fn = test.validation;
		const existing = groups.get(fn) ?? [];
		existing.push(test);
		groups.set(fn, existing);
	}

	return groups;
}

/**
 * Group tests by their source test name.
 */
export function groupTestsBySourceTest(
	tests: TestCase[],
): Map<string, TestCase[]> {
	const groups = new Map<string, TestCase[]>();

	for (const test of tests) {
		const source = test.source_test ?? "unknown";
		const existing = groups.get(source) ?? [];
		existing.push(test);
		groups.set(source, existing);
	}

	return groups;
}

/**
 * Get statistics about loaded test data.
 */
export interface TestStats {
	totalTests: number;
	skippedTests: number;
	testsByFunction: Map<string, number>;
	testsByFeature: Map<string, number>;
	testsByBehavior: Map<string, number>;
	testsByVariant: Map<string, number>;
}

/**
 * Calculate statistics from loaded test data.
 */
export function getTestStats(data: LoadedTestData): TestStats {
	const testsByFunction = new Map<string, number>();
	const testsByFeature = new Map<string, number>();
	const testsByBehavior = new Map<string, number>();
	const testsByVariant = new Map<string, number>();

	for (const test of data.tests) {
		// Count by validation function
		const fn = test.validation;
		testsByFunction.set(fn, (testsByFunction.get(fn) ?? 0) + 1);

		// Count by features
		for (const feature of test.features) {
			testsByFeature.set(feature, (testsByFeature.get(feature) ?? 0) + 1);
		}

		// Count by behaviors
		for (const behavior of test.behaviors) {
			testsByBehavior.set(behavior, (testsByBehavior.get(behavior) ?? 0) + 1);
		}

		// Count by variants
		for (const variant of test.variants) {
			testsByVariant.set(variant, (testsByVariant.get(variant) ?? 0) + 1);
		}
	}

	return {
		totalTests: data.totalCount,
		skippedTests: data.skippedCount,
		testsByFunction,
		testsByFeature,
		testsByBehavior,
		testsByVariant,
	};
}
