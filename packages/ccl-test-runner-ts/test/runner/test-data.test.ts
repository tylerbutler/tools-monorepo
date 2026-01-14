import { describe, expect, it } from "vitest";
import { createCapabilities } from "../../src/capabilities.js";
import type { TestCase } from "../../src/schema-validation.js";
import {
	getTestStats,
	groupTestsByFunction,
	groupTestsBySourceTest,
	loadAllTests,
	loadTestData,
} from "../../src/test-data.js";
import { TEST_DATA_PATH } from "../ccl/test-config.js";

// Helper to create mock test cases for unit tests
function createMockTestCase(overrides: Partial<TestCase>): TestCase {
	return {
		name: "mock_test",
		inputs: ["key = value"],
		validation: "parse",
		expected: { count: 1 },
		behaviors: [],
		variants: [],
		features: [],
		...overrides,
	};
}

describe("Test Data Loading", () => {
	it("should load all test data from the bundled files", async () => {
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

	it("should skip tests listed in skipTests", async () => {
		const allData = await loadAllTests(TEST_DATA_PATH);
		const firstTestName = allData.tests[0]?.name;

		if (!firstTestName) {
			throw new Error("No tests available to skip");
		}

		const data = await loadTestData({
			testDataPath: TEST_DATA_PATH,
			skipTests: [firstTestName],
		});

		// The skipped test should not be in the results
		const hasSkippedTest = data.tests.some((t) => t.name === firstTestName);
		expect(hasSkippedTest).toBe(false);
		expect(data.skippedCount).toBeGreaterThan(0);
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

describe("groupTestsByFunction", () => {
	it("should group tests by validation function", () => {
		const tests: TestCase[] = [
			createMockTestCase({ name: "test1", validation: "parse" }),
			createMockTestCase({ name: "test2", validation: "parse" }),
			createMockTestCase({ name: "test3", validation: "build_hierarchy" }),
		];

		const groups = groupTestsByFunction(tests);

		expect(groups.get("parse")).toHaveLength(2);
		expect(groups.get("build_hierarchy")).toHaveLength(1);
	});

	it("should handle empty test array", () => {
		const groups = groupTestsByFunction([]);
		expect(groups.size).toBe(0);
	});
});

describe("groupTestsBySourceTest", () => {
	it("should group tests by source_test", () => {
		const tests: TestCase[] = [
			createMockTestCase({ name: "test1", source_test: "source_a" }),
			createMockTestCase({ name: "test2", source_test: "source_a" }),
			createMockTestCase({ name: "test3", source_test: "source_b" }),
		];

		const groups = groupTestsBySourceTest(tests);

		expect(groups.get("source_a")).toHaveLength(2);
		expect(groups.get("source_b")).toHaveLength(1);
	});

	it("should use 'unknown' for tests without source_test", () => {
		const tests: TestCase[] = [createMockTestCase({ name: "test1" })];

		const groups = groupTestsBySourceTest(tests);

		expect(groups.get("unknown")).toHaveLength(1);
	});
});

describe("getTestStats", () => {
	it("should calculate correct statistics", () => {
		const data = {
			tests: [
				createMockTestCase({
					name: "test1",
					validation: "parse",
					features: ["comments"],
					behaviors: ["boolean_strict"],
					variants: ["proposed_behavior"],
				}),
				createMockTestCase({
					name: "test2",
					validation: "parse",
					features: ["unicode"],
					behaviors: ["boolean_lenient"],
					variants: ["reference_compliant"],
				}),
				createMockTestCase({
					name: "test3",
					validation: "build_hierarchy",
					features: [],
					behaviors: [],
					variants: [],
				}),
			],
			fileMap: new Map(),
			totalCount: 3,
			skippedCount: 1,
		};

		const stats = getTestStats(data);

		expect(stats.totalTests).toBe(3);
		expect(stats.skippedTests).toBe(1);

		// Check testsByFunction
		expect(stats.testsByFunction.get("parse")).toBe(2);
		expect(stats.testsByFunction.get("build_hierarchy")).toBe(1);

		// Check testsByFeature
		expect(stats.testsByFeature.get("comments")).toBe(1);
		expect(stats.testsByFeature.get("unicode")).toBe(1);

		// Check testsByBehavior
		expect(stats.testsByBehavior.get("boolean_strict")).toBe(1);
		expect(stats.testsByBehavior.get("boolean_lenient")).toBe(1);

		// Check testsByVariant
		expect(stats.testsByVariant.get("proposed_behavior")).toBe(1);
		expect(stats.testsByVariant.get("reference_compliant")).toBe(1);
	});

	it("should handle empty test data", () => {
		const data = {
			tests: [],
			fileMap: new Map(),
			totalCount: 0,
			skippedCount: 0,
		};

		const stats = getTestStats(data);

		expect(stats.totalTests).toBe(0);
		expect(stats.testsByFunction.size).toBe(0);
	});

	it("should count multiple features/behaviors per test", () => {
		const data = {
			tests: [
				createMockTestCase({
					name: "test1",
					validation: "parse",
					features: ["comments", "unicode", "multiline"],
					behaviors: ["boolean_strict", "crlf_normalize_to_lf"],
					variants: [],
				}),
			],
			fileMap: new Map(),
			totalCount: 1,
			skippedCount: 0,
		};

		const stats = getTestStats(data);

		expect(stats.testsByFeature.get("comments")).toBe(1);
		expect(stats.testsByFeature.get("unicode")).toBe(1);
		expect(stats.testsByFeature.get("multiline")).toBe(1);
		expect(stats.testsByBehavior.get("boolean_strict")).toBe(1);
		expect(stats.testsByBehavior.get("crlf_normalize_to_lf")).toBe(1);
	});
});
