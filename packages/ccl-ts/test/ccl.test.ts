/**
 * CCL test suite using the ccl-test-runner-ts vitest integration.
 *
 * This test file wires up the ccl-ts parser to the CCL test suite
 * from ccl-test-data. Tests are automatically generated based on
 * the declared capabilities.
 *
 * Test data is provided by the @tylerbu/ccl-test-data workspace package.
 */

import { createRequire } from "node:module";
import { Behavior, Variant } from "ccl-test-runner-ts";
import {
	type CCLFunctions,
	type CCLTestResult,
	createCCLTestCases,
	defineCCLTests,
	getCCLTestSuiteInfo,
} from "ccl-test-runner-ts/vitest";
import { dirname, join } from "pathe";
import { describe, expect, test } from "vitest";
import { buildHierarchy, parse } from "../src/ccl.js";

const require = createRequire(import.meta.url);

/**
 * Resolves the path to the ccl-test-data package's data directory.
 * Uses require.resolve to find the workspace package.
 */
function resolveTestDataPath(): string {
	const packageJsonPath = require.resolve(
		"@tylerbu/ccl-test-data/package.json",
	);
	return join(dirname(packageJsonPath), "data");
}

const TEST_DATA_PATH = resolveTestDataPath();

/**
 * Run assertions for a test result based on expected values.
 * Extracted to reduce cognitive complexity of the main test loop.
 */
function runAssertions(result: CCLTestResult): void {
	const { expected } = result.testCase;

	// Check count if expected - only for array outputs (entries)
	// For object outputs (build_hierarchy), the count field exists but is not meaningful
	// as a count of the output - it's typically 1 to indicate a single valid object result
	if (expected.count !== undefined && expected.entries !== undefined) {
		const actualCount = Array.isArray(result.output) ? result.output.length : 0;
		// biome-ignore lint/suspicious/noMisplacedAssertion: helper function called from within test()
		expect(actualCount).toBe(expected.count);
	}

	// Check entries if expected
	if (expected.entries !== undefined) {
		// biome-ignore lint/suspicious/noMisplacedAssertion: helper function called from within test()
		expect(result.output).toEqual(expected.entries);
	}

	// Check object if expected
	if (expected.object !== undefined) {
		// biome-ignore lint/suspicious/noMisplacedAssertion: helper function called from within test()
		expect(result.output).toEqual(expected.object);
	}
}

/**
 * Define CCL test configuration.
 *
 * Wire up implemented functions and declare capabilities.
 * The test runner will automatically skip tests for unimplemented functions.
 */
const cclConfig = defineCCLTests({
	name: "ccl-ts",
	version: "0.1.0",

	// Path to test data from @tylerbu/ccl-test-data package
	testDataPath: TEST_DATA_PATH,

	// Wire up implemented functions
	// Note: Stubs that throw "Not yet implemented" are auto-detected as todo
	functions: {
		parse,
		build_hierarchy: buildHierarchy, // Auto-detected as todo (throws "Not yet implemented")
		// Uncomment as you implement:
		// get_string: getString,
		// get_int: getInt,
		// get_bool: getBool,
		// get_float: getFloat,
		// get_list: getList,
	} satisfies CCLFunctions,

	// Declare supported features
	features: ["comments", "empty_keys", "multiline", "unicode", "whitespace"],

	// Declare behavioral choices
	behaviors: [
		Behavior.BooleanLenient,
		Behavior.CRLFPreserve,
		Behavior.TabsPreserve,
		Behavior.StrictSpacing,
		Behavior.ListCoercionDisabled,
		Behavior.ToplevelIndentPreserve,
	],

	// Specification variant
	// Using ReferenceCompliant because the parser keeps nested content as the value
	// (rather than flattening to individual entries as in ProposedBehavior)
	variant: Variant.ReferenceCompliant,
});

describe("CCL", async () => {
	// Get suite info for progress display
	const info = await getCCLTestSuiteInfo(cclConfig);

	// Log progress summary
	console.log(`\nCCL Test Suite: ${info.capabilities.name}`);
	console.log(
		`Functions: ${info.implementedFunctions.length}/${info.capabilities.functions.length} implemented`,
	);
	console.log(
		`Tests: ${info.runnableTests} runnable, ${info.skippedTests} skipped, ${info.todoTests} todo`,
	);

	// Create categorized test cases
	const { byFunction } = await createCCLTestCases(cclConfig);

	// Generate tests organized by validation function
	for (const [fn, testEntries] of byFunction) {
		describe(fn, () => {
			for (const { categorization, run } of testEntries) {
				const { testCase } = categorization;

				switch (categorization.type) {
					case "skip":
						// Function or feature not supported - skip
						// biome-ignore lint/suspicious/noSkippedTests: Intentional capability-based skip
						test.skip(testCase.name, () => {});
						break;

					case "todo":
						// Function declared but not implemented - mark as todo
						test.todo(testCase.name);
						break;

					case "run":
						// All requirements met - run the test
						test(testCase.name, () => {
							runAssertions(run());
						});
						break;

					default:
						// Exhaustive check
						break;
				}
			}
		});
	}
});
