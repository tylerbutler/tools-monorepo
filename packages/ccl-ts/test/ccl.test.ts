/**
 * CCL test suite using the ccl-test-runner-ts vitest integration.
 *
 * This test file wires up the ccl-ts parser to the CCL test suite
 * from ccl-test-data. Tests are automatically generated based on
 * the declared capabilities.
 *
 * Test data must be downloaded first:
 *   cd ../ccl-test-runner-ts && npx ccl-download-tests --output ./ccl-test-data
 */

import {
	Behavior,
	type CCLFunctions,
	createCCLTestCases,
	defineCCLTests,
	getCCLTestSuiteInfo,
	Variant,
} from "ccl-test-runner-ts/vitest";
import { describe, expect, test } from "vitest";
import { parse } from "../src/ccl.js";

/**
 * Define CCL test configuration.
 *
 * Wire up implemented functions and declare capabilities.
 * The test runner will automatically skip tests for unimplemented functions.
 */
const cclConfig = defineCCLTests({
	name: "ccl-ts",
	version: "0.1.0",

	// Path to test data (relative to this package)
	testDataPath: "../ccl-test-runner-ts/ccl-test-data",

	// Wire up implemented functions
	functions: {
		parse,
		// Uncomment as you implement:
		// build_hierarchy: buildHierarchy,
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
		Behavior.CRLFNormalize,
		Behavior.TabsPreserve,
		Behavior.StrictSpacing,
		Behavior.ListCoercionDisabled,
	],

	// Specification variant
	variant: Variant.ProposedBehavior,
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
							const result = run();

							// Check count if expected
							if (result.testCase.expected.count !== undefined) {
								expect(
									Array.isArray(result.output) ? result.output.length : 0,
								).toBe(result.testCase.expected.count);
							}

							// Check entries if expected
							if (result.testCase.expected.entries !== undefined) {
								expect(result.output).toEqual(result.testCase.expected.entries);
							}

							// Check object if expected
							if (result.testCase.expected.object !== undefined) {
								expect(result.output).toEqual(result.testCase.expected.object);
							}
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
