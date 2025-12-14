import { describe, expect, it } from "vitest";
import { createCapabilities } from "../../src/capabilities.js";
import { getBundledTestDataPath } from "../../src/download.js";
import {
	getTestStats,
	groupTestsByFunction,
	loadAllTests,
	loadTestData,
} from "../../src/test-data.js";

// Test data path - uses bundled data that ships with the package
const TEST_DATA_PATH = getBundledTestDataPath();

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
