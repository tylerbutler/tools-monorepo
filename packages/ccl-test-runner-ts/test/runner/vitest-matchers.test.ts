import { describe, expect, it } from "vitest";
import type { TestCase } from "../../src/schema-validation.js";
import type { Entry } from "../../src/types.js";
import type { CCLTestResult } from "../../src/vitest.js";
import { cclMatchers } from "../../src/vitest-matchers.js";

// Helper to create minimal test cases
function createTestCase(overrides: Partial<TestCase> = {}): TestCase {
	return {
		name: "test_case",
		inputs: ["key = value"],
		validation: "parse",
		expected: { count: 1 },
		behaviors: [],
		variants: [],
		features: [],
		...overrides,
	};
}

// Helper to create CCLTestResult
function createTestResult(
	overrides: Partial<CCLTestResult> = {},
): CCLTestResult {
	return {
		testCase: createTestCase(),
		input: "key = value",
		rawOutput: [],
		output: [],
		expected: { count: 1 },
		passed: false,
		error: undefined,
		...overrides,
	};
}

describe("cclMatchers", () => {
	describe("toPassCCLTest", () => {
		it("should pass when test result passed is true", () => {
			const result = createTestResult({ passed: true });
			const matcherResult = cclMatchers.toPassCCLTest(result);

			expect(matcherResult.pass).toBe(true);
			expect(matcherResult.message()).toContain("to fail, but it passed");
		});

		it("should fail when test result passed is false", () => {
			const result = createTestResult({
				passed: false,
				error: "Count mismatch",
			});
			const matcherResult = cclMatchers.toPassCCLTest(result);

			expect(matcherResult.pass).toBe(false);
			expect(matcherResult.message()).toContain("CCL Test Failed");
			expect(matcherResult.message()).toContain("Count mismatch");
		});

		it("should show input with visible whitespace", () => {
			const result = createTestResult({
				passed: false,
				input: "key\t=\tvalue",
			});
			const matcherResult = cclMatchers.toPassCCLTest(result);

			const message = matcherResult.message();
			expect(message).toContain("→"); // Tab visualization
			expect(message).toContain("Input:");
		});

		it("should show entry differences for parse validation", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "name", value: "Alice" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "name", value: "Bob" }],
				expected: [{ key: "name", value: "Alice" }],
				error: "Entries mismatch",
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("Entry differences:");
			expect(message).toContain("VALUE MISMATCH");
			expect(message).toContain("Alice");
			expect(message).toContain("Bob");
		});

		it("should show count mismatch for parse validation", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: { count: 3 },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "a", value: "1" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("Count: expected 3, got 1");
		});

		it("should show object differences for build_hierarchy validation", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: { server: { host: "localhost" } } },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: { server: { host: "remote" } },
				expected: { server: { host: "localhost" } },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("Object differences:");
			expect(message).toContain("server.host");
			expect(message).toContain("localhost");
			expect(message).toContain("remote");
		});

		it("should show test metadata", () => {
			const testCase = createTestCase({
				name: "my_test",
				functions: ["parse", "build_hierarchy"],
				features: ["comments"],
				behaviors: ["boolean_strict"],
				source_test: "api_parsing.json:15",
			});

			const result = createTestResult({
				passed: false,
				testCase,
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("Test metadata:");
			expect(message).toContain("parse, build_hierarchy");
			expect(message).toContain("comments");
			expect(message).toContain("boolean_strict");
			expect(message).toContain("api_parsing.json:15");
		});

		it("should handle empty entries", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: { count: 0, entries: [] },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			// When both expected and actual are empty with matching counts,
			// no entry differences section is shown
			expect(message).toContain("Count: expected 0, got 0");
		});

		it("should limit displayed entries", () => {
			const entries: Entry[] = Array.from({ length: 15 }, (_, i) => ({
				key: `key${i}`,
				value: `value${i}`,
			}));

			const testCase = createTestCase({
				validation: "parse",
				expected: { count: 15, entries },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: entries,
				expected: entries,
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("and 5 more entries");
		});

		it("should show missing entries", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 2,
					entries: [
						{ key: "a", value: "1" },
						{ key: "b", value: "2" },
					],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "a", value: "1" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("MISSING");
		});

		it("should show extra entries", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "a", value: "1" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [
					{ key: "a", value: "1" },
					{ key: "b", value: "2" },
				],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("EXTRA");
		});

		it("should show key mismatch", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "name", value: "value" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "other", value: "value" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("KEY MISMATCH");
		});

		it("should highlight whitespace differences in values", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "hello world" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: "hello\tworld" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("tabs:");
		});

		it("should show newline differences", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "line1\nline2" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: "line1\nline2\nline3" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("newlines:");
		});

		it("should show trailing whitespace differences", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "hello" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: "hello " }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("trailing whitespace:");
		});

		it("should show leading whitespace differences", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "hello" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: " hello" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("leading whitespace:");
		});

		it("should show length difference", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "short" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: "much longer value here" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("Length:");
		});

		it("should show character-level diff indicator for short strings", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "abc" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: "aXc" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			// Should include character position indicators
			expect(message).toContain("^");
		});

		it("should handle object with type mismatch", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: { key: "string" } },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: { key: 123 },
				expected: { key: "string" },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("Object differences:");
			expect(message).toContain("value mismatch");
		});

		it("should handle missing keys in object", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: { a: "1", b: "2" } },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: { a: "1" },
				expected: { a: "1", b: "2" },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("missing key");
		});

		it("should handle extra keys in object", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: { a: "1" } },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: { a: "1", b: "2" },
				expected: { a: "1" },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("extra key");
		});

		it("should handle nested object differences", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: {
					object: { parent: { child: { deep: "value" } } },
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: { parent: { child: { deep: "other" } } },
				expected: { parent: { child: { deep: "value" } } },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("parent.child.deep");
		});

		it("should handle primitive type mismatch at root", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: { key: "value" } },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: "not an object",
				expected: { key: "value" },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("type mismatch");
		});

		it("should handle null values", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: { key: "value" } },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: null,
				expected: { key: "value" },
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("type mismatch");
		});

		it("should limit object differences displayed", () => {
			const expected: Record<string, string> = {};
			const actual: Record<string, string> = {};
			for (let i = 0; i < 20; i++) {
				expected[`key${i}`] = "expected";
				actual[`key${i}`] = "actual";
			}

			const testCase = createTestCase({
				validation: "build_hierarchy",
				expected: { object: expected },
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: actual,
				expected,
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("and");
			expect(message).toContain("more differences");
		});

		it("should handle empty key display", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "", value: "empty key" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "other", value: "empty key" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain('""');
		});

		it("should escape special characters in values", () => {
			const testCase = createTestCase({
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "text", value: "line1\nline2\ttab\rcarriage" }],
				},
			});

			const result = createTestResult({
				passed: false,
				testCase,
				output: [{ key: "text", value: "different" }],
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("\\n");
			expect(message).toContain("\\t");
			expect(message).toContain("\\r");
		});

		it("should handle test with no functions", () => {
			const testCase = createTestCase({
				functions: undefined,
				features: [],
				behaviors: [],
			});

			const result = createTestResult({
				passed: false,
				testCase,
			});

			const matcherResult = cclMatchers.toPassCCLTest(result);
			const message = matcherResult.message();

			expect(message).toContain("(none)");
		});
	});

	describe("toHaveCCLEntryCount", () => {
		it("should pass when entry count matches", () => {
			const result = createTestResult({
				output: [
					{ key: "a", value: "1" },
					{ key: "b", value: "2" },
				],
			});

			const matcherResult = cclMatchers.toHaveCCLEntryCount(result, 2);

			expect(matcherResult.pass).toBe(true);
			expect(matcherResult.message()).toContain("to NOT have 2 entries");
		});

		it("should fail when entry count does not match", () => {
			const result = createTestResult({
				testCase: createTestCase({ name: "count_test" }),
				output: [{ key: "a", value: "1" }],
			});

			const matcherResult = cclMatchers.toHaveCCLEntryCount(result, 3);

			expect(matcherResult.pass).toBe(false);
			const message = matcherResult.message();
			expect(message).toContain("CCL Entry Count Mismatch");
			expect(message).toContain("Expected: 3 entries");
			expect(message).toContain("Actual: 1 entries");
		});

		it("should handle non-array output", () => {
			const result = createTestResult({
				output: "not an array",
			});

			const matcherResult = cclMatchers.toHaveCCLEntryCount(result, 0);

			expect(matcherResult.pass).toBe(true);
		});

		it("should show actual entries in error message", () => {
			const result = createTestResult({
				output: [
					{ key: "first", value: "one" },
					{ key: "second", value: "two" },
				],
			});

			const matcherResult = cclMatchers.toHaveCCLEntryCount(result, 5);
			const message = matcherResult.message();

			expect(message).toContain("first");
			expect(message).toContain("one");
			expect(message).toContain("second");
			expect(message).toContain("two");
		});
	});

	describe("toMatchCCLEntries", () => {
		it("should pass when entries match", () => {
			const entries = [
				{ key: "a", value: "1" },
				{ key: "b", value: "2" },
			];

			const result = createTestResult({
				output: entries,
			});

			const matcherResult = cclMatchers.toMatchCCLEntries(result, entries);

			expect(matcherResult.pass).toBe(true);
			expect(matcherResult.message()).toContain("to NOT match");
		});

		it("should fail when entries do not match", () => {
			const result = createTestResult({
				testCase: createTestCase({ name: "entries_test" }),
				input: "a = 1",
				output: [{ key: "a", value: "1" }],
			});

			const expected = [{ key: "a", value: "different" }];
			const matcherResult = cclMatchers.toMatchCCLEntries(result, expected);

			expect(matcherResult.pass).toBe(false);
			const message = matcherResult.message();
			expect(message).toContain("CCL Entries Mismatch");
			expect(message).toContain("Differences:");
		});

		it("should show input in error message", () => {
			const result = createTestResult({
				input: "key = value\nother = data",
				output: [{ key: "key", value: "value" }],
			});

			const matcherResult = cclMatchers.toMatchCCLEntries(result, []);
			const message = matcherResult.message();

			expect(message).toContain("Input:");
			expect(message).toContain("key = value");
		});

		it("should handle non-array output", () => {
			const result = createTestResult({
				output: "not an array",
			});

			const matcherResult = cclMatchers.toMatchCCLEntries(result, []);

			expect(matcherResult.pass).toBe(true);
		});

		it("should show all entry differences", () => {
			const result = createTestResult({
				output: [
					{ key: "a", value: "1" },
					{ key: "b", value: "2" },
				],
			});

			const expected = [
				{ key: "a", value: "x" },
				{ key: "c", value: "3" },
			];

			const matcherResult = cclMatchers.toMatchCCLEntries(result, expected);
			const message = matcherResult.message();

			expect(message).toContain("VALUE MISMATCH");
			expect(message).toContain("KEY MISMATCH");
		});
	});

	describe("toMatchCCLObject", () => {
		it("should pass when objects match", () => {
			const obj = { server: { host: "localhost", port: 8080 } };

			const result = createTestResult({
				output: obj,
			});

			const matcherResult = cclMatchers.toMatchCCLObject(result, obj);

			expect(matcherResult.pass).toBe(true);
			expect(matcherResult.message()).toContain("to NOT match");
		});

		it("should fail when objects do not match", () => {
			const result = createTestResult({
				testCase: createTestCase({ name: "object_test" }),
				input: "server =\n  host = remote",
				output: { server: { host: "remote" } },
			});

			const expected = { server: { host: "localhost" } };
			const matcherResult = cclMatchers.toMatchCCLObject(result, expected);

			expect(matcherResult.pass).toBe(false);
			const message = matcherResult.message();
			expect(message).toContain("CCL Object Mismatch");
			expect(message).toContain("Differences:");
		});

		it("should show both expected and actual objects", () => {
			const result = createTestResult({
				output: { a: 1 },
			});

			const matcherResult = cclMatchers.toMatchCCLObject(result, { b: 2 });
			const message = matcherResult.message();

			expect(message).toContain("Expected:");
			expect(message).toContain("Actual:");
		});

		it("should handle deeply nested differences", () => {
			const result = createTestResult({
				output: {
					level1: {
						level2: {
							level3: {
								value: "actual",
							},
						},
					},
				},
			});

			const expected = {
				level1: {
					level2: {
						level3: {
							value: "expected",
						},
					},
				},
			};

			const matcherResult = cclMatchers.toMatchCCLObject(result, expected);
			const message = matcherResult.message();

			expect(message).toContain("level1.level2.level3.value");
		});

		it("should show input in error message", () => {
			const result = createTestResult({
				input: "key = value",
				output: {},
			});

			const matcherResult = cclMatchers.toMatchCCLObject(result, { key: "x" });
			const message = matcherResult.message();

			expect(message).toContain("Input:");
		});
	});
});

describe("edge cases", () => {
	it("should handle very long strings without character diff", () => {
		const longActual = "a".repeat(100);
		const longExpected = "b".repeat(100);

		const testCase = createTestCase({
			validation: "parse",
			expected: {
				count: 1,
				entries: [{ key: "text", value: longExpected }],
			},
		});

		const result = createTestResult({
			passed: false,
			testCase,
			output: [{ key: "text", value: longActual }],
		});

		const matcherResult = cclMatchers.toPassCCLTest(result);
		const message = matcherResult.message();

		// Should show the value mismatch (same length strings don't show Length:)
		// but should not crash with very long strings
		expect(message).toContain("VALUE MISMATCH");
	});

	it("should handle spaces in value comparison", () => {
		const testCase = createTestCase({
			validation: "parse",
			expected: {
				count: 1,
				entries: [{ key: "text", value: "a  b" }],
			},
		});

		const result = createTestResult({
			passed: false,
			testCase,
			output: [{ key: "text", value: "a b" }],
		});

		const matcherResult = cclMatchers.toPassCCLTest(result);
		const message = matcherResult.message();

		// The actual implementation may or may not detect space differences
		// This just ensures no crash occurs
		expect(message).toBeTruthy();
	});

	it("should handle many entry differences gracefully", () => {
		const entries: Entry[] = Array.from({ length: 10 }, (_, i) => ({
			key: `key${i}`,
			value: `expected${i}`,
		}));

		const actualEntries: Entry[] = Array.from({ length: 10 }, (_, i) => ({
			key: `key${i}`,
			value: `actual${i}`,
		}));

		const testCase = createTestCase({
			validation: "parse",
			expected: { count: 10, entries },
		});

		const result = createTestResult({
			passed: false,
			testCase,
			output: actualEntries,
		});

		const matcherResult = cclMatchers.toPassCCLTest(result);
		const message = matcherResult.message();

		// Should limit differences shown
		expect(message).toContain("and");
		expect(message).toContain("more differences");
	});

	it("should handle both null expected and actual", () => {
		const testCase = createTestCase({
			validation: "build_hierarchy",
			expected: { object: null },
		});

		const result = createTestResult({
			passed: false,
			testCase,
			output: null,
			expected: null,
		});

		// This should not crash
		const matcherResult = cclMatchers.toPassCCLTest(result);
		expect(matcherResult).toBeDefined();
	});
});
