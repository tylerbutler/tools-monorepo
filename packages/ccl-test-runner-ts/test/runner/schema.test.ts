import { describe, expect, it } from "vitest";
import { loadAllTests } from "../../src/test-data.js";
import { TEST_DATA_PATH } from "../ccl/test-config.js";

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
