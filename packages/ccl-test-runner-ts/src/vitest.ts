/**
 * Vitest integration for CCL test runner.
 *
 * Provides a declarative API for CCL implementers to wire up their
 * implementations and automatically run the CCL test suite.
 *
 * Test data must be downloaded first using the `ccl-download-tests` CLI.
 *
 * @example
 * ```typescript
 * // First, download test data:
 * // npx ccl-download-tests --output ./ccl-test-data
 *
 * // ccl.test.ts
 * import { defineCCLTests, Behavior, Variant } from 'ccl-test-runner-ts/vitest';
 * import { parse, buildHierarchy } from './my-ccl-impl';
 *
 * export const cclConfig = defineCCLTests({
 *   name: 'my-ccl-ts',
 *   version: '0.1.0',
 *   testDataPath: './ccl-test-data',  // Required: path to downloaded test data
 *   functions: {
 *     parse,
 *     build_hierarchy: buildHierarchy,
 *   },
 *   behaviors: [Behavior.BooleanLenient, Behavior.CRLFNormalize],
 *   variant: Variant.ProposedBehavior,
 * });
 * ```
 */

import type { Result } from "true-myth/result";
import type {
	CCLBehavior,
	CCLFeature,
	CCLFunction,
	CCLVariant,
	ImplementationCapabilities,
} from "./capabilities.js";
import {
	DefaultBehaviors,
	Variant,
	validateCapabilities,
} from "./capabilities.js";
import type { TestCase } from "./schema-validation.js";
import { loadAllTests, shouldRunTest } from "./test-data.js";
import type {
	AccessError,
	AnyBuildHierarchyFn,
	AnyParseFn,
	CCLObject,
	Entry,
	ParseError,
} from "./types.js";
import {
	isResult,
	normalizeBuildHierarchyFunction,
	normalizeParseFunction,
} from "./types.js";

// Pre-compiled regex patterns for performance
const LEADING_TABS_REGEX = /^[\t]+/;
const TAB_REGEX = /\t/g;
const CRLF_REGEX = /\r\n/g;

/**
 * Function signatures for CCL implementations.
 *
 * Functions can use any of these patterns:
 * 1. **Throwing**: Return values directly, throw on errors
 * 2. **true-myth Result**: Return Result<T, E> from true-myth
 * 3. **Legacy Result**: Return { success: true, ... } or { success: false, error: ... }
 *
 * The test runner automatically handles all patterns.
 *
 * @example Throwing pattern
 * ```typescript
 * functions: {
 *   parse: (input) => parseEntries(input),  // throws on error
 *   build_hierarchy: (entries) => buildObject(entries),
 * }
 * ```
 *
 * @example true-myth Result pattern
 * ```typescript
 * import { ok, err } from 'true-myth/result';
 * functions: {
 *   parse: (input) => ok(parseEntries(input)),
 *   build_hierarchy: (entries) => ok(buildObject(entries)),
 * }
 * ```
 */
export interface CCLFunctions {
	/** Parse CCL text into flat key-value entries */
	parse?: AnyParseFn;

	/** Parse CCL text with indentation normalization */
	parse_indented?: AnyParseFn;

	/** Filter entries based on predicate */
	filter?: (entries: Entry[], predicate: (entry: Entry) => boolean) => Entry[];

	/** Compose two entry lists */
	compose?: (base: Entry[], overlay: Entry[]) => Entry[];

	/** Expand dotted keys into nested structure */
	expand_dotted?: (entries: Entry[]) => Entry[];

	/** Build hierarchical object from flat entries */
	build_hierarchy?: AnyBuildHierarchyFn;

	/** Get string value at path (returns value, Result, throws, or returns undefined) */
	get_string?: (
		obj: CCLObject,
		...pathParts: string[]
	) => string | undefined | Result<string, AccessError>;

	/** Get integer value at path (returns value, Result, throws, or returns undefined) */
	get_int?: (
		obj: CCLObject,
		...pathParts: string[]
	) => number | undefined | Result<number, AccessError>;

	/** Get boolean value at path (returns value, Result, throws, or returns undefined) */
	get_bool?: (
		obj: CCLObject,
		...pathParts: string[]
	) => boolean | undefined | Result<boolean, AccessError>;

	/** Get float value at path (returns value, Result, throws, or returns undefined) */
	get_float?: (
		obj: CCLObject,
		...pathParts: string[]
	) => number | undefined | Result<number, AccessError>;

	/** Get list value at path (returns value, Result, throws, or returns undefined) */
	get_list?: (
		obj: CCLObject,
		...pathParts: string[]
	) => string[] | undefined | Result<string[], AccessError>;

	/** Print entries to CCL format */
	print?: (entries: Entry[]) => string;

	/** Format to canonical CCL representation (may return string or Result) */
	canonical_format?: (input: string) => string | Result<string, ParseError>;

	/** Load and parse CCL from string */
	load?: (input: string) => CCLObject;

	/** Round-trip: parse, build, print */
	round_trip?: (input: string) => string;
}

/**
 * Configuration for the CCL test suite.
 */
export interface CCLTestConfig {
	/** Name of the implementation */
	name: string;

	/** Version of the implementation */
	version?: string;

	/** Implemented CCL functions */
	functions: CCLFunctions;

	/**
	 * Functions planned but not yet implemented.
	 * Tests for these functions will be marked as `todo` instead of `skip`.
	 */
	todoFunctions?: CCLFunction[];

	/** Supported optional features */
	features?: CCLFeature[];

	/** Behavioral choices (defaults to DefaultBehaviors) */
	behaviors?: CCLBehavior[];

	/** Specification variant (defaults to ProposedBehavior) */
	variant?: CCLVariant;

	/**
	 * Path to test data directory.
	 * Download test data first using: npx ccl-download-tests --output ./ccl-test-data
	 */
	testDataPath: string;

	/** Tests to skip by name */
	skipTests?: string[];
}

/**
 * Result of running a single CCL test case.
 * Exposes intermediate values for transparent assertions.
 */
export interface CCLTestResult {
	/** The test case that was run */
	testCase: TestCase;

	/** Preprocessed input (after CRLF normalization, etc.) */
	input: string;

	/** Raw output from the CCL function */
	rawOutput: unknown;

	/** Processed output (after post-processing behaviors) */
	output: unknown;

	/** Expected value from test case */
	expected: unknown;

	/** Whether the test passed */
	passed: boolean;

	/** Error message if test failed (undefined if passed) */
	error: string | undefined;
}

/**
 * Test suite metadata and statistics.
 */
export interface CCLTestSuiteInfo {
	/** Implementation capabilities derived from config */
	capabilities: ImplementationCapabilities;

	/** Functions that are wired up (have implementations) */
	implementedFunctions: CCLFunction[];

	/** Functions declared but not wired up */
	declaredButNotImplemented: CCLFunction[];

	/** Total tests in suite */
	totalTests: number;

	/** Tests that will run (matching capabilities) */
	runnableTests: number;

	/** Tests that will be skipped */
	skippedTests: number;

	/** Tests marked as todo (function not implemented) */
	todoTests: number;
}

/**
 * Internal context for test execution.
 */
interface TestContext {
	config: CCLTestConfig;
	capabilities: ImplementationCapabilities;
	implementedFunctions: Set<string>;
}

/**
 * Check if an error indicates a function is not yet implemented.
 * Matches both NotYetImplementedError class and generic "Not yet implemented" messages.
 */
function isNotYetImplementedError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return (
		error.name === "NotYetImplementedError" ||
		error.message.toLowerCase().includes("not yet implemented") ||
		error.message.toLowerCase().includes("not implemented")
	);
}

/**
 * Probe a function with minimal input to check if it's actually implemented.
 * Returns true if the function appears implemented, false if it throws "not implemented".
 */
function probeFunction(fn: unknown, probeArgs: unknown[]): boolean {
	if (typeof fn !== "function") {
		return false;
	}
	try {
		fn(...probeArgs);
		return true; // Succeeded = implemented
	} catch (error) {
		if (isNotYetImplementedError(error)) {
			return false; // Stub that throws "not implemented"
		}
		// Other errors mean the function has real logic (just failed on probe input)
		return true;
	}
}

/**
 * Infer which CCL functions are actually implemented (have non-undefined values).
 * Also probes functions to detect stubs that throw "Not yet implemented".
 */
function getImplementedFunctionNames(functions: CCLFunctions): CCLFunction[] {
	const implemented: CCLFunction[] = [];

	// Map of function names to their keys and probe arguments
	const functionProbes: Array<{
		name: CCLFunction;
		key: keyof CCLFunctions;
		probeArgs: unknown[];
	}> = [
		{ name: "parse", key: "parse", probeArgs: [""] },
		{ name: "parse_indented", key: "parse_indented", probeArgs: [""] },
		{ name: "filter", key: "filter", probeArgs: [[], () => true] },
		{ name: "compose", key: "compose", probeArgs: [[], []] },
		{ name: "expand_dotted", key: "expand_dotted", probeArgs: [[]] },
		{ name: "build_hierarchy", key: "build_hierarchy", probeArgs: [[]] },
		{ name: "get_string", key: "get_string", probeArgs: [{}, ""] },
		{ name: "get_int", key: "get_int", probeArgs: [{}, ""] },
		{ name: "get_bool", key: "get_bool", probeArgs: [{}, ""] },
		{ name: "get_float", key: "get_float", probeArgs: [{}, ""] },
		{ name: "get_list", key: "get_list", probeArgs: [{}, ""] },
		{ name: "print", key: "print", probeArgs: [[]] },
		{ name: "canonical_format", key: "canonical_format", probeArgs: [""] },
		{ name: "load", key: "load", probeArgs: [""] },
		{ name: "round_trip", key: "round_trip", probeArgs: [""] },
	];

	for (const { name, key, probeArgs } of functionProbes) {
		const fn = functions[key];
		if (fn !== undefined && probeFunction(fn, probeArgs)) {
			implemented.push(name);
		}
	}

	return implemented;
}

/**
 * Get all declared function names (present in the functions object, whether implemented or not).
 */
function getDeclaredFunctionNames(functions: CCLFunctions): CCLFunction[] {
	const declared: CCLFunction[] = [];

	const functionMap: Record<string, keyof CCLFunctions> = {
		parse: "parse",
		parse_indented: "parse_indented",
		filter: "filter",
		compose: "compose",
		expand_dotted: "expand_dotted",
		build_hierarchy: "build_hierarchy",
		get_string: "get_string",
		get_int: "get_int",
		get_bool: "get_bool",
		get_float: "get_float",
		get_list: "get_list",
		print: "print",
		canonical_format: "canonical_format",
		load: "load",
		round_trip: "round_trip",
	};

	for (const [name, key] of Object.entries(functionMap)) {
		if (functions[key] !== undefined) {
			declared.push(name as CCLFunction);
		}
	}

	return declared;
}

/**
 * Build ImplementationCapabilities from CCLTestConfig.
 *
 * Functions are automatically detected:
 * - Declared = present in the functions object
 * - Implemented = declared AND doesn't throw "Not yet implemented" when probed
 *
 * This enables automatic todo detection: if you pass a stub function that throws
 * "Not yet implemented", tests for that function will be marked as "todo" (not "skip").
 *
 * You can also explicitly add functions to todoFunctions for the same effect.
 */
function buildCapabilities(config: CCLTestConfig): ImplementationCapabilities {
	const declaredFunctions = getDeclaredFunctionNames(config.functions);
	const todoFunctions = config.todoFunctions ?? [];

	// Combine declared + explicit todo functions for capability declaration
	// This makes todo functions show as "todo" (declared but not implemented)
	// rather than "skip" (not declared at all)
	const allDeclaredFunctions = [
		...declaredFunctions,
		...todoFunctions.filter((fn) => !declaredFunctions.includes(fn)),
	];

	const capabilities: ImplementationCapabilities = {
		name: config.name,
		version: config.version ?? "0.0.0",
		functions: allDeclaredFunctions,
		features: config.features ?? [],
		behaviors: config.behaviors ?? [...DefaultBehaviors],
		variant: config.variant ?? Variant.ProposedBehavior,
	};

	// Only add skipTests if defined
	if (config.skipTests !== undefined) {
		capabilities.skipTests = config.skipTests;
	}

	// Validate for conflicts
	validateCapabilities(capabilities);

	return capabilities;
}

/**
 * Preprocess input based on implementation behaviors.
 */
function preprocessInput(
	input: string,
	capabilities: ImplementationCapabilities,
): string {
	let result = input;

	if (capabilities.behaviors.includes("crlf_normalize_to_lf")) {
		result = result.replace(CRLF_REGEX, "\n");
	}

	return result;
}

/**
 * Post-process entry values based on implementation behaviors.
 */
function postprocessValue(
	value: string,
	capabilities: ImplementationCapabilities,
): string {
	let result = value;

	if (capabilities.behaviors.includes("loose_spacing")) {
		result = result.replace(LEADING_TABS_REGEX, "");
	}

	if (capabilities.behaviors.includes("tabs_to_spaces")) {
		result = result.replace(TAB_REGEX, "  ");
	}

	return result;
}

/**
 * Validation result from a handler.
 */
interface ValidationResult {
	rawOutput: unknown;
	output: unknown;
	expected: unknown;
	passed: boolean;
	error?: string;
}

/**
 * Handle parse validation.
 */
function handleParseValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
	capabilities: ImplementationCapabilities,
): ValidationResult {
	const rawFn = functions.parse;
	if (!rawFn) {
		throw new Error("parse function not implemented");
	}

	const fn = normalizeParseFunction(rawFn);
	const result = fn(input);

	if (result.isErr) {
		return {
			rawOutput: result,
			output: { success: false, error: result.error },
			expected: testCase.expected,
			passed: false,
			error: `Parse failed: ${result.error.message}`,
		};
	}

	const processedEntries = result.value.map((entry: Entry) => ({
		key: entry.key,
		value: postprocessValue(entry.value, capabilities),
	}));

	const { passed, error } = checkParseExpectations(testCase, processedEntries);

	return {
		rawOutput: result,
		output: processedEntries,
		expected: testCase.expected.entries ?? { count: testCase.expected.count },
		passed,
		...(error !== undefined && { error }),
	};
}

/**
 * Check parse expectations against processed entries.
 */
function checkParseExpectations(
	testCase: TestCase,
	processedEntries: Array<{ key: string; value: string }>,
): { passed: boolean; error?: string } {
	if (
		testCase.expected.count !== undefined &&
		processedEntries.length !== testCase.expected.count
	) {
		return {
			passed: false,
			error: `Count mismatch: expected ${testCase.expected.count}, got ${processedEntries.length}`,
		};
	}

	if (testCase.expected.entries !== undefined) {
		const entriesMatch =
			JSON.stringify(processedEntries) ===
			JSON.stringify(testCase.expected.entries);
		if (!entriesMatch) {
			return { passed: false, error: "Entries mismatch" };
		}
	}

	return { passed: true };
}

/**
 * Handle build_hierarchy validation.
 */
function handleBuildHierarchyValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const rawParseFn = functions.parse;
	const rawBuildFn = functions.build_hierarchy;
	if (!(rawParseFn && rawBuildFn)) {
		throw new Error("parse and build_hierarchy functions required");
	}

	const parseFn = normalizeParseFunction(rawParseFn);
	const buildFn = normalizeBuildHierarchyFunction(rawBuildFn);

	const parseResult = parseFn(input);
	if (parseResult.isErr) {
		throw new Error(`Parse failed: ${parseResult.error.message}`);
	}

	const hierarchyResult = buildFn(parseResult.value);

	if (hierarchyResult.isErr) {
		return {
			rawOutput: hierarchyResult,
			output: { success: false, error: hierarchyResult.error },
			expected: testCase.expected.object,
			passed: false,
			error: `Build hierarchy failed: ${hierarchyResult.error.message}`,
		};
	}

	const passed =
		JSON.stringify(hierarchyResult.value) ===
		JSON.stringify(testCase.expected.object);

	return {
		rawOutput: hierarchyResult,
		output: hierarchyResult.value,
		expected: testCase.expected.object,
		passed,
		...(passed ? {} : { error: "Object mismatch" }),
	};
}

/**
 * Build a CCL object from input using parse and build_hierarchy.
 * Helper for typed access validation handlers.
 */
function buildObjectFromInput(
	input: string,
	functions: CCLFunctions,
): CCLObject {
	const rawParseFn = functions.parse;
	const rawBuildFn = functions.build_hierarchy;
	if (!(rawParseFn && rawBuildFn)) {
		throw new Error("parse and build_hierarchy functions required");
	}

	const parseFn = normalizeParseFunction(rawParseFn);
	const buildFn = normalizeBuildHierarchyFunction(rawBuildFn);

	const parseResult = parseFn(input);
	if (parseResult.isErr) {
		throw new Error(`Parse failed: ${parseResult.error.message}`);
	}

	const hierarchyResult = buildFn(parseResult.value);
	if (hierarchyResult.isErr) {
		throw new Error(`Build hierarchy failed: ${hierarchyResult.error.message}`);
	}

	return hierarchyResult.value;
}

/**
 * Get the path arguments from test case args.
 * Test data uses an array of path components.
 */
function getPathArgsFromTestCase(testCase: TestCase): string[] {
	const args = testCase.args;
	if (!args || args.length === 0) {
		throw new Error(`Test case "${testCase.name}" has no args for path`);
	}
	return args;
}

/**
 * Unwrap a typed access result that may be a Result or a direct value.
 * Returns { value, isError } to handle both patterns uniformly.
 */
function unwrapTypedAccessResult<T>(result: T | Result<T, AccessError>): {
	value: T | undefined;
	isError: boolean;
	errorMessage?: string;
} {
	if (isResult<T, AccessError>(result)) {
		if (result.isErr) {
			return {
				value: undefined,
				isError: true,
				errorMessage: result.error.message,
			};
		}
		return { value: result.value, isError: false };
	}
	return { value: result as T, isError: false };
}

/**
 * Handle get_string validation.
 */
function handleGetStringValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const fn = functions.get_string;
	if (!fn) {
		throw new Error("get_string function not implemented");
	}

	const obj = buildObjectFromInput(input, functions);
	const pathArgs = getPathArgsFromTestCase(testCase);

	// Check if we expect an error
	if (testCase.expected.error === true) {
		try {
			const rawResult = fn(obj, ...pathArgs);
			const unwrapped = unwrapTypedAccessResult(rawResult);
			if (unwrapped.isError) {
				return {
					rawOutput: rawResult,
					output: { error: true },
					expected: { error: true },
					passed: true,
				};
			}
			return {
				rawOutput: rawResult,
				output: unwrapped.value,
				expected: { error: true },
				passed: false,
				error: "Expected error but function succeeded",
			};
		} catch {
			return {
				rawOutput: undefined,
				output: { error: true },
				expected: { error: true },
				passed: true,
			};
		}
	}

	try {
		const rawResult = fn(obj, ...pathArgs);
		const unwrapped = unwrapTypedAccessResult(rawResult);
		if (unwrapped.isError) {
			return {
				rawOutput: rawResult,
				output: undefined,
				expected: testCase.expected.value,
				passed: false,
				error: unwrapped.errorMessage ?? "Unknown error",
			};
		}
		const result = unwrapped.value;
		const expected = testCase.expected.value;
		const passed = result === expected;

		return {
			rawOutput: rawResult,
			output: result,
			expected,
			passed,
			...(passed ? {} : { error: `Expected "${expected}", got "${result}"` }),
		};
	} catch (e) {
		return {
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected.value,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Handle get_int validation.
 */
function handleGetIntValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const fn = functions.get_int;
	if (!fn) {
		throw new Error("get_int function not implemented");
	}

	const obj = buildObjectFromInput(input, functions);
	const pathArgs = getPathArgsFromTestCase(testCase);

	// Check if we expect an error
	if (testCase.expected.error === true) {
		try {
			const rawResult = fn(obj, ...pathArgs);
			const unwrapped = unwrapTypedAccessResult(rawResult);
			if (unwrapped.isError) {
				return {
					rawOutput: rawResult,
					output: { error: true },
					expected: { error: true },
					passed: true,
				};
			}
			return {
				rawOutput: rawResult,
				output: unwrapped.value,
				expected: { error: true },
				passed: false,
				error: "Expected error but function succeeded",
			};
		} catch {
			return {
				rawOutput: undefined,
				output: { error: true },
				expected: { error: true },
				passed: true,
			};
		}
	}

	try {
		const rawResult = fn(obj, ...pathArgs);
		const unwrapped = unwrapTypedAccessResult(rawResult);
		if (unwrapped.isError) {
			return {
				rawOutput: rawResult,
				output: undefined,
				expected: testCase.expected.value,
				passed: false,
				error: unwrapped.errorMessage ?? "Unknown error",
			};
		}
		const result = unwrapped.value;
		const expected = testCase.expected.value;
		const passed = result === expected;

		return {
			rawOutput: rawResult,
			output: result,
			expected,
			passed,
			...(passed ? {} : { error: `Expected ${expected}, got ${result}` }),
		};
	} catch (e) {
		return {
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected.value,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Handle get_bool validation.
 */
function handleGetBoolValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const fn = functions.get_bool;
	if (!fn) {
		throw new Error("get_bool function not implemented");
	}

	const obj = buildObjectFromInput(input, functions);
	const pathArgs = getPathArgsFromTestCase(testCase);

	// Check if we expect an error
	if (testCase.expected.error === true) {
		try {
			const rawResult = fn(obj, ...pathArgs);
			const unwrapped = unwrapTypedAccessResult(rawResult);
			if (unwrapped.isError) {
				return {
					rawOutput: rawResult,
					output: { error: true },
					expected: { error: true },
					passed: true,
				};
			}
			return {
				rawOutput: rawResult,
				output: unwrapped.value,
				expected: { error: true },
				passed: false,
				error: "Expected error but function succeeded",
			};
		} catch {
			return {
				rawOutput: undefined,
				output: { error: true },
				expected: { error: true },
				passed: true,
			};
		}
	}

	try {
		const rawResult = fn(obj, ...pathArgs);
		const unwrapped = unwrapTypedAccessResult(rawResult);
		if (unwrapped.isError) {
			return {
				rawOutput: rawResult,
				output: undefined,
				expected: testCase.expected.value,
				passed: false,
				error: unwrapped.errorMessage ?? "Unknown error",
			};
		}
		const result = unwrapped.value;
		const expected = testCase.expected.value;
		const passed = result === expected;

		return {
			rawOutput: rawResult,
			output: result,
			expected,
			passed,
			...(passed ? {} : { error: `Expected ${expected}, got ${result}` }),
		};
	} catch (e) {
		return {
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected.value,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Handle get_float validation.
 */
function handleGetFloatValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const fn = functions.get_float;
	if (!fn) {
		throw new Error("get_float function not implemented");
	}

	const obj = buildObjectFromInput(input, functions);
	const pathArgs = getPathArgsFromTestCase(testCase);

	// Check if we expect an error
	if (testCase.expected.error === true) {
		try {
			const rawResult = fn(obj, ...pathArgs);
			const unwrapped = unwrapTypedAccessResult(rawResult);
			if (unwrapped.isError) {
				return {
					rawOutput: rawResult,
					output: { error: true },
					expected: { error: true },
					passed: true,
				};
			}
			return {
				rawOutput: rawResult,
				output: unwrapped.value,
				expected: { error: true },
				passed: false,
				error: "Expected error but function succeeded",
			};
		} catch {
			return {
				rawOutput: undefined,
				output: { error: true },
				expected: { error: true },
				passed: true,
			};
		}
	}

	try {
		const rawResult = fn(obj, ...pathArgs);
		const unwrapped = unwrapTypedAccessResult(rawResult);
		if (unwrapped.isError) {
			return {
				rawOutput: rawResult,
				output: undefined,
				expected: testCase.expected.value,
				passed: false,
				error: unwrapped.errorMessage ?? "Unknown error",
			};
		}
		const result = unwrapped.value;
		const expected = testCase.expected.value;
		const passed = result === expected;

		return {
			rawOutput: rawResult,
			output: result,
			expected,
			passed,
			...(passed ? {} : { error: `Expected ${expected}, got ${result}` }),
		};
	} catch (e) {
		return {
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected.value,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Handle get_list validation.
 */
function handleGetListValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const fn = functions.get_list;
	if (!fn) {
		throw new Error("get_list function not implemented");
	}

	const obj = buildObjectFromInput(input, functions);
	const pathArgs = getPathArgsFromTestCase(testCase);

	// Check if we expect an error
	if (testCase.expected.error === true) {
		try {
			const rawResult = fn(obj, ...pathArgs);
			const unwrapped = unwrapTypedAccessResult(rawResult);
			if (unwrapped.isError) {
				return {
					rawOutput: rawResult,
					output: { error: true },
					expected: { error: true },
					passed: true,
				};
			}
			return {
				rawOutput: rawResult,
				output: unwrapped.value,
				expected: { error: true },
				passed: false,
				error: "Expected error but function succeeded",
			};
		} catch {
			return {
				rawOutput: undefined,
				output: { error: true },
				expected: { error: true },
				passed: true,
			};
		}
	}

	try {
		const rawResult = fn(obj, ...pathArgs);
		const unwrapped = unwrapTypedAccessResult(rawResult);
		if (unwrapped.isError) {
			return {
				rawOutput: rawResult,
				output: undefined,
				expected: testCase.expected.list ?? testCase.expected.value,
				passed: false,
				error: unwrapped.errorMessage ?? "Unknown error",
			};
		}
		const result = unwrapped.value;
		const expected = testCase.expected.list ?? testCase.expected.value;
		const passed = JSON.stringify(result) === JSON.stringify(expected);

		return {
			rawOutput: rawResult,
			output: result,
			expected,
			passed,
			...(passed
				? {}
				: {
						error: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`,
					}),
		};
	} catch (e) {
		return {
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected.list ?? testCase.expected.value,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Handle print validation.
 */
function handlePrintValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const rawParseFn = functions.parse;
	const printFn = functions.print;
	if (!(rawParseFn && printFn)) {
		throw new Error("parse and print functions required");
	}

	const parseFn = normalizeParseFunction(rawParseFn);

	const parseResult = parseFn(input);
	if (parseResult.isErr) {
		throw new Error(`Parse failed: ${parseResult.error.message}`);
	}

	const result = printFn(parseResult.value);
	const expected = testCase.expected.value;
	const passed = result === expected;

	return {
		rawOutput: result,
		output: result,
		expected,
		passed,
		...(passed ? {} : { error: `Expected "${expected}", got "${result}"` }),
	};
}

/**
 * Handle canonical_format validation.
 */
function handleCanonicalFormatValidation(
	testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const fn = functions.canonical_format;
	if (!fn) {
		throw new Error("canonical_format function not implemented");
	}

	try {
		const rawResult = fn(input);
		// Handle both Result-returning and direct-returning functions
		if (isResult<string, ParseError>(rawResult)) {
			if (rawResult.isErr) {
				return {
					rawOutput: rawResult,
					output: undefined,
					expected: testCase.expected.value,
					passed: false,
					error: rawResult.error.message,
				};
			}
			const result = rawResult.value;
			const expected = testCase.expected.value;
			const passed = result === expected;
			return {
				rawOutput: rawResult,
				output: result,
				expected,
				passed,
				...(passed ? {} : { error: `Expected "${expected}", got "${result}"` }),
			};
		}
		// Direct string return
		const result = rawResult;
		const expected = testCase.expected.value;
		const passed = result === expected;
		return {
			rawOutput: result,
			output: result,
			expected,
			passed,
			...(passed ? {} : { error: `Expected "${expected}", got "${result}"` }),
		};
	} catch (e) {
		return {
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected.value,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Handle round_trip validation.
 * Checks if print(parse(input)) == input.
 */
function handleRoundTripValidation(
	_testCase: TestCase,
	input: string,
	functions: CCLFunctions,
): ValidationResult {
	const rawParseFn = functions.parse;
	const printFn = functions.print;
	if (!(rawParseFn && printFn)) {
		throw new Error("parse and print functions required for round_trip");
	}

	const parseFn = normalizeParseFunction(rawParseFn);

	const parseResult = parseFn(input);
	if (parseResult.isErr) {
		throw new Error(`Parse failed: ${parseResult.error.message}`);
	}

	const roundTripped = printFn(parseResult.value);
	const passed = roundTripped === input;

	return {
		rawOutput: roundTripped,
		output: passed,
		expected: true,
		passed,
		...(passed
			? {}
			: {
					error: `Round-trip mismatch:\nInput: "${input}"\nOutput: "${roundTripped}"`,
				}),
	};
}

/**
 * Run a single CCL test case and return detailed results.
 * This is the hybrid approach - returns values for vitest assertions.
 */
export function runCCLTest(
	testCase: TestCase,
	functions: CCLFunctions,
	capabilities: ImplementationCapabilities,
): CCLTestResult {
	const rawInput = testCase.inputs[0];
	if (rawInput === undefined) {
		throw new Error(`Test case "${testCase.name}" has no inputs`);
	}
	const input = preprocessInput(rawInput, capabilities);

	try {
		let result: ValidationResult;

		switch (testCase.validation) {
			case "parse":
				result = handleParseValidation(
					testCase,
					input,
					functions,
					capabilities,
				);
				break;

			case "build_hierarchy":
				result = handleBuildHierarchyValidation(testCase, input, functions);
				break;

			case "get_string":
				result = handleGetStringValidation(testCase, input, functions);
				break;

			case "get_int":
				result = handleGetIntValidation(testCase, input, functions);
				break;

			case "get_bool":
				result = handleGetBoolValidation(testCase, input, functions);
				break;

			case "get_float":
				result = handleGetFloatValidation(testCase, input, functions);
				break;

			case "get_list":
				result = handleGetListValidation(testCase, input, functions);
				break;

			case "print":
				result = handlePrintValidation(testCase, input, functions);
				break;

			case "canonical_format":
				result = handleCanonicalFormatValidation(testCase, input, functions);
				break;

			case "round_trip":
				result = handleRoundTripValidation(testCase, input, functions);
				break;

			default:
				throw new Error(`Unsupported validation type: ${testCase.validation}`);
		}

		return {
			testCase,
			input,
			rawOutput: result.rawOutput,
			output: result.output,
			expected: result.expected,
			passed: result.passed,
			error: result.error,
		};
	} catch (e) {
		return {
			testCase,
			input,
			rawOutput: undefined,
			output: undefined,
			expected: testCase.expected,
			passed: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

/**
 * Categorize a test case for vitest execution.
 */
export type TestCategorization =
	| { type: "run"; testCase: TestCase }
	| { type: "skip"; testCase: TestCase; reason: string }
	| { type: "todo"; testCase: TestCase; reason: string };

/**
 * Composite validations that require multiple functions.
 * TODO: Remove this workaround once ccl-test-data is fixed to list actual
 * required functions instead of composite function names.
 * See: https://github.com/CatConfLang/ccl-test-data/issues/60
 */
const compositeValidations: Record<string, string[]> = {
	round_trip: ["parse", "print"],
};

type FunctionCheckResult =
	| { status: "implemented" }
	| { status: "todo"; reason: string }
	| { status: "skip"; reason: string };

/**
 * Check if a function is implemented or should be skipped/todo.
 */
function checkFunctionStatus(
	fn: string,
	implementedFunctions: Set<string>,
	capabilities: ImplementationCapabilities,
	reasonContext?: string,
): FunctionCheckResult {
	if (implementedFunctions.has(fn)) {
		return { status: "implemented" };
	}
	const contextSuffix = reasonContext ? ` ${reasonContext}` : "";
	if (capabilities.functions.includes(fn as CCLFunction)) {
		return {
			status: "todo",
			reason: `function:${fn}${contextSuffix} declared but not implemented`,
		};
	}
	return {
		status: "skip",
		reason: `function:${fn}${contextSuffix} not supported`,
	};
}

/**
 * Check if a composite function's dependencies are all implemented.
 */
function areCompositeDepsImplemented(
	fn: string,
	implementedFunctions: Set<string>,
): boolean {
	const compositeDeps = compositeValidations[fn];
	if (!compositeDeps) {
		return false;
	}
	return compositeDeps.every((dep) => implementedFunctions.has(dep));
}

/**
 * Check validation function requirements for a test case.
 */
function checkValidationFunction(
	validationFn: string,
	implementedFunctions: Set<string>,
	capabilities: ImplementationCapabilities,
): FunctionCheckResult {
	const requiredForValidation = compositeValidations[validationFn];
	if (requiredForValidation) {
		// Composite validation - check all required functions
		for (const fn of requiredForValidation) {
			const result = checkFunctionStatus(
				fn,
				implementedFunctions,
				capabilities,
				`(required for ${validationFn})`,
			);
			if (result.status !== "implemented") {
				return result;
			}
		}
		return { status: "implemented" };
	}
	// Simple validation - check single function
	return checkFunctionStatus(validationFn, implementedFunctions, capabilities);
}

/**
 * Check required functions for a test case.
 */
function checkRequiredFunctions(
	requiredFunctions: string[],
	implementedFunctions: Set<string>,
	capabilities: ImplementationCapabilities,
): FunctionCheckResult {
	for (const fn of requiredFunctions) {
		// Check if this function is satisfied by composite implementation
		if (areCompositeDepsImplemented(fn, implementedFunctions)) {
			continue; // Composite requirements satisfied
		}

		const result = checkFunctionStatus(
			fn,
			implementedFunctions,
			capabilities,
			"required",
		);
		if (result.status !== "implemented") {
			return result;
		}
	}
	return { status: "implemented" };
}

/**
 * Categorize a test case based on implementation capabilities.
 */
export function categorizeTest(
	testCase: TestCase,
	context: TestContext,
): TestCategorization {
	const { capabilities, implementedFunctions } = context;

	// Check if test is explicitly skipped
	if (capabilities.skipTests?.includes(testCase.name)) {
		return {
			type: "skip",
			testCase,
			reason: "Explicitly skipped via skipTests",
		};
	}

	// Check if validation function is implemented
	const validationResult = checkValidationFunction(
		testCase.validation,
		implementedFunctions,
		capabilities,
	);
	if (validationResult.status !== "implemented") {
		return {
			type: validationResult.status,
			testCase,
			reason: validationResult.reason,
		};
	}

	// Check required functions
	const requiredResult = checkRequiredFunctions(
		testCase.functions ?? [],
		implementedFunctions,
		capabilities,
	);
	if (requiredResult.status !== "implemented") {
		return {
			type: requiredResult.status,
			testCase,
			reason: requiredResult.reason,
		};
	}

	// Check remaining capability filters (features, behaviors, variants)
	const filterResult = shouldRunTest(testCase, capabilities);
	if (!filterResult.shouldRun) {
		return {
			type: "skip",
			testCase,
			reason: filterResult.skipReason ?? "Capability mismatch",
		};
	}

	return { type: "run", testCase };
}

/**
 * Get test suite information and statistics.
 */
export async function getCCLTestSuiteInfo(
	config: CCLTestConfig,
): Promise<CCLTestSuiteInfo> {
	const capabilities = buildCapabilities(config);
	const implementedFunctions = getImplementedFunctionNames(config.functions);
	const implementedSet = new Set(implementedFunctions);

	const declaredButNotImplemented = capabilities.functions.filter(
		(fn) => !implementedSet.has(fn),
	);

	const data = await loadAllTests(config.testDataPath);
	const context: TestContext = {
		config,
		capabilities,
		implementedFunctions: implementedSet,
	};

	let runnableTests = 0;
	let skippedTests = 0;
	let todoTests = 0;

	for (const testCase of data.tests) {
		const categorization = categorizeTest(testCase, context);
		switch (categorization.type) {
			case "run":
				runnableTests++;
				break;
			case "skip":
				skippedTests++;
				break;
			case "todo":
				todoTests++;
				break;
			default:
				// Exhaustive check
				break;
		}
	}

	return {
		capabilities,
		implementedFunctions,
		declaredButNotImplemented,
		totalTests: data.tests.length,
		runnableTests,
		skippedTests,
		todoTests,
	};
}

/**
 * Define a CCL test suite for vitest.
 *
 * Returns the config for export and sets up the test suite.
 * Tests are organized by validation function with appropriate
 * skip/todo handling based on implementation state.
 *
 * @example
 * ```typescript
 * export const cclConfig = defineCCLTests({
 *   name: 'my-ccl-ts',
 *   functions: { parse: myParse },
 *   testDataPath: './.test-data',
 * });
 * ```
 */
export function defineCCLTests(config: CCLTestConfig): CCLTestConfig {
	// Validate config and build capabilities
	buildCapabilities(config);

	// Return config for potential export/CLI usage
	return config;
}

/**
 * Create vitest test cases from config.
 * Use with vitest's describe/test or test.each.
 *
 * @example
 * ```typescript
 * const { tests, context } = await createCCLTestCases(config);
 *
 * describe('CCL', () => {
 *   for (const { categorization, run } of tests) {
 *     if (categorization.type === 'skip') {
 *       test.skip(categorization.testCase.name, () => {});
 *     } else if (categorization.type === 'todo') {
 *       test.todo(categorization.testCase.name);
 *     } else {
 *       test(categorization.testCase.name, run);
 *     }
 *   }
 * });
 * ```
 */
export async function createCCLTestCases(config: CCLTestConfig): Promise<{
	tests: Array<{
		categorization: TestCategorization;
		run: () => CCLTestResult;
	}>;
	context: TestContext;
	byFunction: Map<
		string,
		Array<{ categorization: TestCategorization; run: () => CCLTestResult }>
	>;
}> {
	const capabilities = buildCapabilities(config);
	const implementedFunctions = new Set(
		getImplementedFunctionNames(config.functions),
	);

	const context: TestContext = {
		config,
		capabilities,
		implementedFunctions,
	};

	const data = await loadAllTests(config.testDataPath);
	const tests: Array<{
		categorization: TestCategorization;
		run: () => CCLTestResult;
	}> = [];

	const byFunction = new Map<
		string,
		Array<{ categorization: TestCategorization; run: () => CCLTestResult }>
	>();

	for (const testCase of data.tests) {
		const categorization = categorizeTest(testCase, context);
		const run = () => runCCLTest(testCase, config.functions, capabilities);

		const entry = { categorization, run };
		tests.push(entry);

		// Group by validation function
		const fn = testCase.validation;
		const existing = byFunction.get(fn) ?? [];
		existing.push(entry);
		byFunction.set(fn, existing);
	}

	return { tests, context, byFunction };
}
