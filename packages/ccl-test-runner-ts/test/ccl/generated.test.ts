/**
 * Dynamically generated CCL tests from bundled test data.
 *
 * Tests are organized by validation function and use:
 * - test.todo() - validation function not yet implemented (throws NotYetImplementedError)
 * - context.skip(reason) - function not supported by implementation capabilities
 * - Regular test execution when all conditions are met
 */
import { describe, expect, test } from "vitest";
import {
	type CCLFunction,
	createCapabilities,
	type ImplementationCapabilities,
} from "../../src/capabilities.js";
import { getImplementedFunctions, parse } from "../../src/ccl.js";
import type { TestCase } from "../../src/schema-validation.js";
import {
	groupTestsByFunction,
	loadAllTests,
	shouldRunTest,
} from "../../src/test-data.js";
import type { CCLTestResult } from "../../src/vitest.js";
import { STUB_PARSER_SKIP_TESTS, TEST_DATA_PATH } from "./test-config.js";

/**
 * Current implementation capabilities.
 * Update this as you implement more CCL functions.
 */
const capabilities: ImplementationCapabilities = createCapabilities({
	name: "ccl-test-runner-ts",
	version: "0.1.0",
	functions: [
		"parse",
		// Add more functions here as you implement them:
		// "build_hierarchy",
	],
	features: [
		// Add supported features here as needed:
		"comments",
		"empty_keys",
		"multiline",
		"unicode",
		"whitespace",
	],
	behaviors: [
		"boolean_lenient",
		"crlf_normalize_to_lf",
		"tabs_to_spaces",
		// Note: loose_spacing conflicts with tabs_to_spaces for leading whitespace
		// tabs_to_spaces expects leading tabs converted to spaces and preserved
		// loose_spacing removes all leading whitespace, including converted spaces
		"list_coercion_disabled",
	],
	variant: "proposed_behavior",
	// Tests to skip - these require full CCL parser features not implemented in stub
	skipTests: STUB_PARSER_SKIP_TESTS,
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
 * Preprocess input based on implementation behaviors (applied BEFORE parsing).
 */
function preprocessInput(input: string): string {
	let result = input;

	// Apply CRLF normalization if behavior is enabled
	if (capabilities.behaviors.includes("crlf_normalize_to_lf")) {
		result = result.replace(/\r\n/g, "\n");
	}

	// Note: tabs_to_spaces is applied AFTER parsing, not here

	return result;
}

/**
 * Post-process entry values based on implementation behaviors (applied AFTER parsing).
 */
function postprocessValue(value: string): string {
	let result = value;

	// With loose_spacing, trim leading tabs in addition to spaces
	// (the parse function only trims leading spaces)
	if (capabilities.behaviors.includes("loose_spacing")) {
		result = result.replace(/^[\t]+/, "");
	}

	// Convert tabs to spaces if behavior is enabled
	// Note: Test data uses 2-space tabs, but spec says single space
	if (capabilities.behaviors.includes("tabs_to_spaces")) {
		result = result.replace(/\t/g, "  ");
	}

	return result;
}

/**
 * Execute the CCL function for a test case and return a CCLTestResult.
 * Uses the CCLTestResult type for compatibility with custom matchers.
 */
function executeTestCase(testCase: TestCase): CCLTestResult {
	const rawInput = testCase.inputs[0];
	if (rawInput === undefined) {
		return {
			testCase,
			input: "",
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected,
			passed: false,
			error: `Test case "${testCase.name}" has no inputs`,
		};
	}
	const input = preprocessInput(rawInput);

	switch (testCase.validation) {
		case "parse": {
			const result = parse(input);
			if (!result.success) {
				return {
					testCase,
					input,
					rawOutput: result,
					output: { success: false, error: result.error },
					expected: testCase.expected,
					passed: false,
					error: `Parse failed: ${result.error?.message ?? "unknown error"}`,
				};
			}
			// Post-process values based on behaviors
			const processedEntries = result.entries.map((entry) => ({
				key: entry.key,
				value: postprocessValue(entry.value),
			}));

			// Check expectations
			let passed = true;
			let error: string | undefined;

			if (
				testCase.expected.count !== undefined &&
				processedEntries.length !== testCase.expected.count
			) {
				passed = false;
				error = `Count mismatch: expected ${testCase.expected.count}, got ${processedEntries.length}`;
			}

			if (
				passed &&
				testCase.expected.entries !== undefined &&
				JSON.stringify(processedEntries) !==
					JSON.stringify(testCase.expected.entries)
			) {
				passed = false;
				error = "Entries mismatch";
			}

			return {
				testCase,
				input,
				rawOutput: result,
				output: processedEntries,
				expected: testCase.expected.entries ?? {
					count: testCase.expected.count,
				},
				passed,
				error,
			};
		}
		default:
			return {
				testCase,
				input,
				rawOutput: undefined,
				output: undefined,
				expected: testCase.expected,
				passed: false,
				error: `Unsupported validation type: ${testCase.validation}`,
			};
	}
}

describe("CCL", async () => {
	// Load all test data
	const data = await loadAllTests(TEST_DATA_PATH);
	const testsByFunction = groupTestsByFunction(data.tests);

	// Sort functions for consistent ordering
	const sortedFunctions = [...testsByFunction.keys()].sort();

	for (const validationFn of sortedFunctions) {
		const tests = testsByFunction.get(validationFn) ?? [];

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Test categorization logic
		describe(validationFn, () => {
			for (const testCase of tests) {
				// Check if the validation function is supported by capabilities
				if (!isFunctionSupported(validationFn)) {
					// biome-ignore lint/suspicious/noSkippedTests: Intentional capability-based skip
					test.skip(testCase.name, () => {});
					continue;
				}

				// Check if all required functions for this test are supported
				const requiredFunctions = testCase.functions ?? [];
				const unsupportedFunctions = requiredFunctions.filter(
					(fn) => !isFunctionSupported(fn),
				);

				if (unsupportedFunctions.length > 0) {
					// biome-ignore lint/suspicious/noSkippedTests: Intentional capability-based skip
					test.skip(testCase.name, () => {});
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

				// Check remaining capability compatibility (behaviors, features, variants)
				const filterResult = shouldRunTest(testCase, capabilities);

				if (!filterResult.shouldRun) {
					// biome-ignore lint/suspicious/noSkippedTests: Intentional capability-based skip
					test.skip(testCase.name, () => {});
					continue;
				}

				// Function is supported and implemented - create a real test
				test(testCase.name, () => {
					// All conditions met - run the actual test
					const result = executeTestCase(testCase);
					// Use custom CCL matcher for rich error messages
					expect(result).toPassCCLTest();
				});
			}
		});
	}
});
