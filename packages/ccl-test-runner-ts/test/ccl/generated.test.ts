/**
 * Dynamically generated CCL tests from ccl-test-data.
 *
 * Tests are organized by validation function and use:
 * - test.todo() - validation function not yet implemented (throws NotYetImplementedError)
 * - context.skip(reason) - function not supported by implementation capabilities
 * - Regular test execution when all conditions are met
 */
import { existsSync } from "node:fs";
import { beforeAll, describe, test } from "vitest";
import {
	createCapabilities,
	type CCLFunction,
	type ImplementationCapabilities,
} from "../../src/capabilities.js";
import { getImplementedFunctions } from "../../src/ccl.js";
import { downloadTestData, getDefaultTestDataPath } from "../../src/download.js";
import type { TestCase } from "../../src/schema-validation.js";
import {
	groupTestsByFunction,
	loadAllTests,
	shouldRunTest,
} from "../../src/test-data.js";

// Test data path
const TEST_DATA_PATH = getDefaultTestDataPath();

/**
 * Current implementation capabilities.
 * Update this as you implement more CCL functions.
 */
const capabilities: ImplementationCapabilities = createCapabilities({
	name: "ccl-test-runner-ts",
	version: "0.1.0",
	functions: [
		// Add functions here as you implement them:
		// "parse",
		// "build_hierarchy",
	],
	features: [
		// Add supported features here:
		// "comments",
		// "empty_keys",
	],
	behaviors: [
		"boolean_lenient",
		"crlf_normalize_to_lf",
		"tabs_to_spaces",
		"loose_spacing",
		"list_coercion_disabled",
	],
	variant: "proposed_behavior",
});

/**
 * Set of functions that have actual implementations (not stubs).
 * This is populated from getImplementedFunctions() at test time.
 */
const implementedFunctions = new Set(getImplementedFunctions());

/**
 * Set of functions declared as supported in capabilities.
 */
const supportedFunctions = new Set(capabilities.functions);

/**
 * Check if a function is supported by the implementation capabilities.
 */
function isFunctionSupported(fn: string): boolean {
	return supportedFunctions.has(fn as CCLFunction);
}

/**
 * Check if a function has an actual implementation (not a stub).
 */
function isFunctionImplemented(fn: string): boolean {
	return implementedFunctions.has(fn);
}

/**
 * Run the actual test for a test case.
 * This is where the CCL function execution happens.
 */
async function runTestCase(_testCase: TestCase): Promise<void> {
	// TODO: Implement actual test execution
	// This will call the appropriate CCL function based on testCase.validation
	// and compare the result against testCase.expected
	//
	// Example structure:
	// const input = testCase.inputs[0];
	// switch (testCase.validation) {
	//   case 'parse':
	//     const result = parse(input);
	//     expect(result.entries).toEqual(testCase.expected.entries);
	//     break;
	//   case 'build_hierarchy':
	//     ...
	// }
	throw new Error("Test execution not yet implemented");
}

// Ensure test data is downloaded
beforeAll(async () => {
	if (!existsSync(TEST_DATA_PATH)) {
		console.log("Downloading test data...");
		await downloadTestData({ outputDir: TEST_DATA_PATH });
	}
});

describe("CCL", async () => {
	// Load all test data
	const data = await loadAllTests(TEST_DATA_PATH);
	const testsByFunction = groupTestsByFunction(data.tests);

	// Sort functions for consistent ordering
	const sortedFunctions = [...testsByFunction.keys()].sort();

	for (const validationFn of sortedFunctions) {
		const tests = testsByFunction.get(validationFn) ?? [];

		describe(validationFn, () => {
			for (const testCase of tests) {
				// Check if the validation function is supported by capabilities
				if (!isFunctionSupported(validationFn)) {
					// Function not in capabilities - skip with reason
					test(testCase.name, (context) => {
						context.skip(`function:${validationFn}`);
					});
					continue;
				}

				// Check if all required functions for this test are supported
				const requiredFunctions = testCase.functions ?? [];
				const unsupportedFunctions = requiredFunctions.filter(
					(fn) => !isFunctionSupported(fn),
				);

				if (unsupportedFunctions.length > 0) {
					// Missing required functions - skip with reason
					test(testCase.name, (context) => {
						context.skip(`function:${unsupportedFunctions.join(", ")}`);
					});
					continue;
				}

				// Check if the validation function is actually implemented
				if (!isFunctionImplemented(validationFn)) {
					// Function is supported but not implemented yet - mark as todo
					test.todo(testCase.name);
					continue;
				}

				// Check if all required functions are implemented
				const unimplementedFunctions = requiredFunctions.filter(
					(fn) => !isFunctionImplemented(fn),
				);

				if (unimplementedFunctions.length > 0) {
					// Required functions not implemented - mark as todo
					test.todo(testCase.name);
					continue;
				}

				// Function is supported and implemented - create a real test
				test(testCase.name, (context) => {
					// Check remaining capability compatibility (behaviors, features, variants)
					const filterResult = shouldRunTest(testCase, capabilities);

					if (!filterResult.shouldRun) {
						// Capability mismatch - skip with categorized reason
						context.skip(filterResult.skipReason ?? "Capability mismatch");
						return;
					}

					// All conditions met - run the actual test
					return runTestCase(testCase);
				});
			}
		});
	}
});
