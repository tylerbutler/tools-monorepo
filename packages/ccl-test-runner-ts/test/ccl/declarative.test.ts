/**
 * Example: Declarative CCL test suite using the vitest integration.
 *
 * This demonstrates the recommended approach for CCL implementers:
 * 1. Import defineCCLTests and wire up your functions
 * 2. Export the config for potential CLI tooling
 * 3. Tests are automatically generated with proper skip/todo handling
 */
import { describe, expect, test } from "vitest";
import { Behavior, Variant } from "../../src/capabilities.js";
import { parse } from "../../src/ccl.js";
import {
	type CCLFunctions,
	createCCLTestCases,
	defineCCLTests,
	getCCLTestSuiteInfo,
} from "../../src/vitest.js";
import { STUB_PARSER_SKIP_TESTS, TEST_DATA_PATH } from "./test-config.js";

/**
 * Define CCL test configuration.
 *
 * This is the declarative approach - just wire up your functions
 * and the library handles test generation, skip/todo logic, etc.
 */
const cclConfig = defineCCLTests({
	name: "ccl-test-runner-ts-example",
	version: "0.1.0",

	testDataPath: TEST_DATA_PATH,

	// Wire up only the functions you've implemented
	functions: {
		parse, // Using the built-in stub/example implementation
		// build_hierarchy: buildHierarchy,  // Uncomment as you implement
	} satisfies CCLFunctions,

	// Explicit feature declarations
	features: ["comments", "empty_keys", "multiline", "unicode", "whitespace"],

	// Strongly-typed behaviors with IDE autocomplete
	behaviors: [
		Behavior.BooleanLenient,
		Behavior.CRLFNormalize,
		Behavior.TabsToSpaces,
		Behavior.LooseSpacing,
		Behavior.ListCoercionDisabled,
	],

	// Explicit variant choice
	variant: Variant.ProposedBehavior,

	// Tests to skip - these require full CCL parser features not implemented in stub
	skipTests: STUB_PARSER_SKIP_TESTS,
});

describe("CCL (Declarative API)", async () => {
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
							// Use custom CCL matcher for rich error messages
							expect(result).toPassCCLTest();
						});
						break;

					default:
						// Exhaustive check - should never reach here
						break;
				}
			}
		});
	}
});
