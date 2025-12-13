import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it, test } from "vitest";
import {
	createCapabilities,
	getStubCapabilities,
	type ImplementationCapabilities,
} from "../src/capabilities.js";
import { buildHierarchy, parse, parseIndented } from "../src/ccl.js";
import { downloadTestData, getDefaultTestDataPath } from "../src/download.js";
import { NotYetImplementedError } from "../src/errors.js";
import type { TestCase } from "../src/schema-validation.js";
import {
	getTestStats,
	groupTestsByFunction,
	type LoadedTestData,
	loadAllTests,
	loadTestData,
	shouldRunTest,
} from "../src/test-data.js";

// Test data path
const TEST_DATA_PATH = getDefaultTestDataPath();

// Ensure test data is downloaded before running tests
beforeAll(async () => {
	if (!existsSync(TEST_DATA_PATH)) {
		console.log("Downloading test data...");
		await downloadTestData({ outputDir: TEST_DATA_PATH });
	}
});

describe("CCL Test Suite", () => {
	describe("Test Data Loading", () => {
		it("should load all test data from the downloaded files", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			expect(data.tests.length).toBeGreaterThan(0);
			expect(data.fileMap.size).toBeGreaterThan(0);
		});

		it("should filter tests by capabilities", async () => {
			// Create capabilities that only support parse
			const capabilities = createCapabilities({
				name: "test-impl",
				functions: ["parse"],
				features: [],
				behaviors: [
					"boolean_lenient",
					"crlf_normalize_to_lf",
					"tabs_to_spaces",
					"loose_spacing",
					"list_coercion_disabled",
				],
				variant: "proposed_behavior",
			});

			const data = await loadTestData({
				testDataPath: TEST_DATA_PATH,
				capabilities,
			});

			// All loaded tests should only require the parse function
			for (const testCase of data.tests) {
				const functions = testCase.functions ?? [];
				expect(functions).toContain("parse");
				// Should not have functions we don't support
				const unsupportedFns = functions.filter(
					(fn) => !capabilities.functions.includes(fn as never),
				);
				expect(unsupportedFns).toHaveLength(0);
			}
		});

		it("should skip tests with conflicting behaviors", async () => {
			// Create capabilities with boolean_lenient
			const capabilities = createCapabilities({
				name: "test-impl",
				functions: ["parse", "build_hierarchy", "get_bool"],
				features: [],
				behaviors: [
					"boolean_lenient", // We use lenient
					"crlf_normalize_to_lf",
					"tabs_to_spaces",
					"loose_spacing",
					"list_coercion_disabled",
				],
				variant: "proposed_behavior",
			});

			// Create a mock test that requires boolean_strict
			const testCase: TestCase = {
				name: "test_boolean_strict",
				inputs: ["enabled = true"],
				validation: "get_bool",
				expected: { count: 1, value: true },
				functions: ["parse", "build_hierarchy", "get_bool"],
				features: [],
				behaviors: ["boolean_strict"], // Requires strict
				variants: [],
				source_test: "test_source",
			};

			const result = shouldRunTest(testCase, capabilities);
			expect(result.shouldRun).toBe(false);
			expect(result.skipReason).toContain("Behavior conflict");
		});

		it("should skip tests with variant mismatch", async () => {
			const capabilities = createCapabilities({
				name: "test-impl",
				functions: ["parse"],
				features: [],
				behaviors: [],
				variant: "proposed_behavior",
			});

			// Create a mock test that requires reference_compliant
			const testCase: TestCase = {
				name: "test_reference",
				inputs: ["key = value"],
				validation: "parse",
				expected: { count: 1 },
				functions: ["parse"],
				features: [],
				behaviors: [],
				variants: ["reference_compliant"], // Requires reference
				source_test: "test_source",
			};

			const result = shouldRunTest(testCase, capabilities);
			expect(result.shouldRun).toBe(false);
			expect(result.skipReason).toContain("Variant mismatch");
		});

		it("should group tests by function", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			const groups = groupTestsByFunction(data.tests);

			expect(groups.size).toBeGreaterThan(0);
			// Each group should have at least one test
			for (const tests of groups.values()) {
				expect(tests.length).toBeGreaterThan(0);
			}
		});

		it("should calculate test statistics", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			const stats = getTestStats(data);

			expect(stats.totalTests).toBe(data.totalCount);
			expect(stats.testsByFunction.size).toBeGreaterThan(0);
		});
	});

	describe("Schema Type Validation", () => {
		it("should validate TestCase structure matches actual JSON data", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			expect(data.tests.length).toBeGreaterThan(0);

			const testCase = data.tests[0];
			expect(testCase).toBeDefined();
			if (!testCase) {
				return;
			}

			// Validate TestCase required fields
			expect(testCase).toHaveProperty("name");
			expect(testCase).toHaveProperty("inputs");
			expect(testCase).toHaveProperty("validation");
			expect(testCase).toHaveProperty("expected");
			expect(testCase).toHaveProperty("functions");
			expect(testCase).toHaveProperty("features");
			expect(testCase).toHaveProperty("behaviors");
			expect(testCase).toHaveProperty("variants");
			expect(testCase).toHaveProperty("source_test");

			// Validate types
			expect(typeof testCase.name).toBe("string");
			expect(Array.isArray(testCase.inputs)).toBe(true);
			expect(typeof testCase.validation).toBe("string");
			expect(typeof testCase.expected).toBe("object");
			expect(Array.isArray(testCase.functions)).toBe(true);
			expect(Array.isArray(testCase.features)).toBe(true);
			expect(Array.isArray(testCase.behaviors)).toBe(true);
			expect(Array.isArray(testCase.variants)).toBe(true);
			expect(typeof testCase.source_test).toBe("string");
		});

		it("should validate TestExpected structure for parse tests", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			const parseTest = data.tests.find((t) => t.validation === "parse");

			expect(parseTest).toBeDefined();
			if (!parseTest) {
				return;
			}

			expect(parseTest.expected).toHaveProperty("count");
			expect(typeof parseTest.expected.count).toBe("number");

			// Parse tests should have entries
			if (parseTest.expected.entries) {
				expect(Array.isArray(parseTest.expected.entries)).toBe(true);
				const entry = parseTest.expected.entries[0];
				if (entry) {
					expect(entry).toHaveProperty("key");
					expect(entry).toHaveProperty("value");
					expect(typeof entry.key).toBe("string");
					expect(typeof entry.value).toBe("string");
				}
			}
		});

		it("should validate TestExpected structure for hierarchy tests", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			const hierarchyTest = data.tests.find(
				(t) => t.validation === "build_hierarchy",
			);

			expect(hierarchyTest).toBeDefined();
			if (!hierarchyTest) {
				return;
			}

			expect(hierarchyTest.expected).toHaveProperty("count");
			if (hierarchyTest.expected.object !== undefined) {
				expect(typeof hierarchyTest.expected.object).toBe("object");
			}
		});

		it("should validate all test validation functions are known", async () => {
			const data = await loadAllTests(TEST_DATA_PATH);
			const knownValidations = new Set([
				"parse",
				"parse_indented",
				"filter",
				"compose",
				"build_hierarchy",
				"get_string",
				"get_int",
				"get_bool",
				"get_float",
				"get_list",
				"print",
				"canonical_format",
				"load",
				"round_trip",
				"compose_associative",
				"identity_left",
				"identity_right",
			]);

			const unknownValidations = new Set<string>();
			for (const testItem of data.tests) {
				if (!knownValidations.has(testItem.validation)) {
					unknownValidations.add(testItem.validation);
				}
			}

			if (unknownValidations.size > 0) {
				console.warn(
					`Unknown validation functions found: ${[...unknownValidations].join(", ")}`,
				);
			}
			// Allow unknown validations but warn about them
			expect(unknownValidations.size).toBeLessThanOrEqual(5);
		});
	});

	describe("CCL Functions (Stub Implementations)", () => {
		it("parse should throw NotYetImplementedError", () => {
			expect(() => parse("key = value")).toThrow(NotYetImplementedError);
		});

		it("parseIndented should throw NotYetImplementedError", () => {
			expect(() => parseIndented("key = value")).toThrow(
				NotYetImplementedError,
			);
		});

		it("buildHierarchy should throw NotYetImplementedError", () => {
			expect(() => buildHierarchy([])).toThrow(NotYetImplementedError);
		});
	});

	describe("Capability Configuration", () => {
		it("getStubCapabilities should return empty functions", () => {
			const caps = getStubCapabilities();
			expect(caps.functions).toHaveLength(0);
			expect(caps.features).toHaveLength(0);
		});

		it("createCapabilities should merge with defaults", () => {
			const caps = createCapabilities({
				name: "my-impl",
				functions: ["parse"],
			});

			expect(caps.name).toBe("my-impl");
			expect(caps.functions).toContain("parse");
			// Should have default behaviors
			expect(caps.behaviors.length).toBeGreaterThan(0);
		});
	});
});

// Dynamic test generation from test data
// This demonstrates how tests will be run once the CCL functions are implemented
describe("CCL Generated Tests (Preview)", async () => {
	let testData: LoadedTestData;
	let stubCapabilities: ImplementationCapabilities;

	beforeAll(async () => {
		if (!existsSync(TEST_DATA_PATH)) {
			await downloadTestData({ outputDir: TEST_DATA_PATH });
		}
		stubCapabilities = getStubCapabilities();
		testData = await loadAllTests(TEST_DATA_PATH);
	});

	it("should have loaded test data for dynamic test generation", async () => {
		// This test verifies the test data is available
		// Once CCL functions are implemented, each test case will become an individual test
		if (!testData) {
			testData = await loadAllTests(TEST_DATA_PATH);
		}

		const stats = getTestStats(testData);

		console.log(
			`\n📊 Test Data Summary: ${stats.totalTests} tests across ${stats.testsByFunction.size} functions`,
		);
		for (const [fn, count] of stats.testsByFunction) {
			console.log(`   ${fn}: ${count} tests`);
		}

		// Show filtering info for stub implementation
		const filteredData = await loadTestData({
			testDataPath: TEST_DATA_PATH,
			capabilities: stubCapabilities,
		});

		console.log(
			`\n🔧 Stub Implementation: ${filteredData.totalCount} compatible tests (${filteredData.skippedCount} skipped)`,
		);

		expect(testData.totalCount).toBeGreaterThan(0);
	});

	// Example of how dynamic tests will work once CCL is implemented
	// biome-ignore lint/suspicious/noSkippedTests: Intentional - demonstrates future test structure
	describe.skip("parse tests (skipped - not yet implemented)", () => {
		// When CCL functions are implemented, these tests will be enabled
		test("basic_key_value_pairs_parse", () => {
			const input = "name = Alice\nage = 42";
			const result = parse(input);

			if (!result.success) {
				throw new Error(`Parse failed: ${result.error.message}`);
			}

			expect(result.entries.length).toBe(2);
			expect(result.entries[0]).toEqual({ key: "name", value: "Alice" });
			expect(result.entries[1]).toEqual({ key: "age", value: "42" });
		});
	});

	// biome-ignore lint/suspicious/noSkippedTests: Intentional - demonstrates future test structure
	describe.skip("build_hierarchy tests (skipped - not yet implemented)", () => {
		test("basic_object_construction_build_hierarchy", () => {
			const input = "name = Alice\nage = 42";
			const parseResult = parse(input);

			if (!parseResult.success) {
				throw new Error(`Parse failed: ${parseResult.error.message}`);
			}

			const result = buildHierarchy(parseResult.entries);

			if (!result.success) {
				throw new Error(`BuildHierarchy failed: ${result.error.message}`);
			}

			expect(result.object).toEqual({
				name: "Alice",
				age: "42",
			});
		});
	});
});
