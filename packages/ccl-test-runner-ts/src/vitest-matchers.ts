/**
 * Custom vitest matchers for CCL test data validations.
 *
 * These matchers provide rich, contextual error messages when CCL test assertions fail,
 * making it much easier to debug parse and hierarchy validation issues.
 *
 * @example
 * ```typescript
 * // In your vitest setup file
 * import { cclMatchers } from 'ccl-test-runner-ts/vitest-matchers';
 * import { expect } from 'vitest';
 *
 * expect.extend(cclMatchers);
 *
 * // In your tests
 * const result = run();
 * expect(result).toPassCCLTest();
 * ```
 */

import type { Entry } from "./types.js";
import type { CCLTestResult } from "./vitest.js";

// Pre-compiled regex patterns for performance
const TRAILING_WHITESPACE_REGEX = /\s+$/;
const LEADING_WHITESPACE_REGEX = /^\s+/;
const TAB_REGEX = /\t/g;
const SPACE_REGEX = / /g;
const NEWLINE_REGEX = /\n/g;

/**
 * Diff type for entry comparison.
 */
type EntryDiff = {
	index: number;
	actual?: Entry;
	expected?: Entry;
	type: "key" | "value" | "missing" | "extra";
};

/**
 * Format an entry for display in error messages.
 */
function formatEntry(entry: Entry, index: number): string {
	const keyDisplay = entry.key === "" ? '""' : entry.key;
	const valueDisplay = entry.value
		.replaceAll("\n", "\\n")
		.replaceAll("\t", "\\t")
		.replaceAll("\r", "\\r");
	return `  [${index}] key: "${keyDisplay}", value: "${valueDisplay}"`;
}

/**
 * Format a list of entries for display.
 */
function formatEntries(entries: Entry[], label: string, limit = 10): string {
	if (entries.length === 0) {
		return `${label}: (empty)`;
	}

	const lines = entries.slice(0, limit).map((e, i) => formatEntry(e, i));
	if (entries.length > limit) {
		lines.push(`  ... and ${entries.length - limit} more entries`);
	}

	return `${label}:\n${lines.join("\n")}`;
}

/**
 * Find differences between two entry arrays.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Entry diff logic inherently complex
function findEntryDifferences(actual: Entry[], expected: Entry[]): EntryDiff[] {
	const diffs: EntryDiff[] = [];
	const maxLen = Math.max(actual.length, expected.length);

	for (let i = 0; i < maxLen; i++) {
		const act = actual[i];
		const exp = expected[i];

		if (act === undefined && exp !== undefined) {
			diffs.push({ index: i, expected: exp, type: "missing" });
		} else if (act !== undefined && exp === undefined) {
			diffs.push({ index: i, actual: act, type: "extra" });
		} else if (act !== undefined && exp !== undefined) {
			if (act.key !== exp.key) {
				diffs.push({ index: i, actual: act, expected: exp, type: "key" });
			} else if (act.value !== exp.value) {
				diffs.push({ index: i, actual: act, expected: exp, type: "value" });
			}
		}
	}

	return diffs;
}

/**
 * Analyze whitespace characteristics of a string.
 */
function analyzeWhitespace(str: string) {
	return {
		tabs: (str.match(TAB_REGEX) ?? []).length,
		spaces: (str.match(SPACE_REGEX) ?? []).length,
		newlines: (str.match(NEWLINE_REGEX) ?? []).length,
		trailingSpaces: TRAILING_WHITESPACE_REGEX.test(str),
		leadingSpaces: LEADING_WHITESPACE_REGEX.test(str),
	};
}

/**
 * Format value differences for display, highlighting invisible characters.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Detailed error formatting requires many checks
function formatValueDiff(actual: string, expected: string): string {
	const lines: string[] = [];

	// Show raw values
	lines.push(
		`    Expected: "${expected.replaceAll("\n", "\\n").replaceAll("\t", "\\t").replaceAll("\r", "\\r")}"`,
	);
	lines.push(
		`    Actual:   "${actual.replaceAll("\n", "\\n").replaceAll("\t", "\\t").replaceAll("\r", "\\r")}"`,
	);

	// Show character-level differences for short strings
	if (actual.length <= 50 && expected.length <= 50) {
		const maxLen = Math.max(actual.length, expected.length);
		let diffIndicator = "              ";
		for (let i = 0; i < maxLen; i++) {
			diffIndicator += actual[i] !== expected[i] ? "^" : " ";
		}
		if (diffIndicator.trim().length > 0) {
			lines.push(diffIndicator);
		}
	}

	// Show length difference
	if (actual.length !== expected.length) {
		lines.push(`    Length: expected ${expected.length}, got ${actual.length}`);
	}

	// Highlight whitespace differences
	const actualWs = analyzeWhitespace(actual);
	const expectedWs = analyzeWhitespace(expected);

	const wsIssues: string[] = [];
	if (actualWs.tabs !== expectedWs.tabs) {
		wsIssues.push(`tabs: expected ${expectedWs.tabs}, got ${actualWs.tabs}`);
	}
	if (actualWs.newlines !== expectedWs.newlines) {
		wsIssues.push(
			`newlines: expected ${expectedWs.newlines}, got ${actualWs.newlines}`,
		);
	}
	if (actualWs.trailingSpaces !== expectedWs.trailingSpaces) {
		wsIssues.push(
			`trailing whitespace: ${actualWs.trailingSpaces ? "present" : "absent"} (expected ${expectedWs.trailingSpaces ? "present" : "absent"})`,
		);
	}
	if (actualWs.leadingSpaces !== expectedWs.leadingSpaces) {
		wsIssues.push(
			`leading whitespace: ${actualWs.leadingSpaces ? "present" : "absent"} (expected ${expectedWs.leadingSpaces ? "present" : "absent"})`,
		);
	}

	if (wsIssues.length > 0) {
		lines.push(`    Whitespace issues: ${wsIssues.join(", ")}`);
	}

	return lines.join("\n");
}

/**
 * Format object differences for hierarchy comparison.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Recursive object diff inherently complex
function formatObjectDiff(
	actual: unknown,
	expected: unknown,
	path = "",
): string[] {
	const lines: string[] = [];

	if (
		typeof actual !== "object" ||
		typeof expected !== "object" ||
		actual === null ||
		expected === null
	) {
		lines.push(`  ${path || "(root)"}: type mismatch`);
		lines.push(`    Expected: ${JSON.stringify(expected)}`);
		lines.push(`    Actual: ${JSON.stringify(actual)}`);
		return lines;
	}

	const actualObj = actual as Record<string, unknown>;
	const expectedObj = expected as Record<string, unknown>;
	const allKeys = new Set([
		...Object.keys(actualObj),
		...Object.keys(expectedObj),
	]);

	for (const key of allKeys) {
		const currentPath = path ? `${path}.${key}` : key;

		if (!(key in actualObj)) {
			lines.push(`  ${currentPath}: missing key`);
			lines.push(`    Expected: ${JSON.stringify(expectedObj[key])}`);
		} else if (!(key in expectedObj)) {
			lines.push(`  ${currentPath}: extra key`);
			lines.push(`    Actual: ${JSON.stringify(actualObj[key])}`);
		} else if (
			JSON.stringify(actualObj[key]) !== JSON.stringify(expectedObj[key])
		) {
			const actualVal = actualObj[key];
			const expectedVal = expectedObj[key];

			if (
				typeof actualVal === "object" &&
				typeof expectedVal === "object" &&
				actualVal !== null &&
				expectedVal !== null
			) {
				// Recurse for nested objects
				lines.push(...formatObjectDiff(actualVal, expectedVal, currentPath));
			} else {
				lines.push(`  ${currentPath}: value mismatch`);
				lines.push(`    Expected: ${JSON.stringify(expectedVal)}`);
				lines.push(`    Actual: ${JSON.stringify(actualVal)}`);
			}
		}
	}

	return lines;
}

/**
 * Format a diff entry for display.
 */
function formatDiffEntry(diff: EntryDiff): string[] {
	const lines: string[] = [];
	switch (diff.type) {
		case "missing":
			lines.push(
				`  [${diff.index}] MISSING - expected: key="${diff.expected?.key}", value="${diff.expected?.value}"`,
			);
			break;
		case "extra":
			lines.push(
				`  [${diff.index}] EXTRA - got: key="${diff.actual?.key}", value="${diff.actual?.value}"`,
			);
			break;
		case "key":
			lines.push(`  [${diff.index}] KEY MISMATCH`);
			lines.push(`    Expected key: "${diff.expected?.key}"`);
			lines.push(`    Actual key:   "${diff.actual?.key}"`);
			break;
		case "value":
			lines.push(
				`  [${diff.index}] VALUE MISMATCH for key "${diff.expected?.key}"`,
			);
			if (diff.actual && diff.expected) {
				lines.push(formatValueDiff(diff.actual.value, diff.expected.value));
			}
			break;
		default:
			// Exhaustive check - this should never happen with the current diff types
			break;
	}
	return lines;
}

/**
 * Custom matchers for CCL test result validation.
 */
export const cclMatchers = {
	/**
	 * Assert that a CCL test result passed.
	 *
	 * Provides detailed error messages showing:
	 * - Test name and validation type
	 * - Input that was parsed
	 * - Expected vs actual output with diffs
	 * - Specific entry mismatches with value comparisons
	 *
	 * @example
	 * ```typescript
	 * const result = runCCLTest(testCase, functions, capabilities);
	 * expect(result).toPassCCLTest();
	 * ```
	 */
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Error message formatting requires comprehensive checks
	toPassCCLTest(received: CCLTestResult) {
		const { testCase, input, output, expected, passed, error } = received;

		if (passed) {
			return {
				pass: true,
				message: () =>
					`Expected CCL test "${testCase.name}" to fail, but it passed`,
			};
		}

		// Build detailed error message
		const lines: string[] = [
			"",
			`CCL Test Failed: ${testCase.name}`,
			`Validation: ${testCase.validation}`,
			"",
		];

		// Show input (with visible whitespace)
		const inputDisplay = input
			.replaceAll("\t", "→")
			.replaceAll(" ", "·")
			.split("\n")
			.map((line, i) => `  ${i + 1}: ${line}`)
			.join("\n");
		lines.push("Input:");
		lines.push(inputDisplay);
		lines.push("");

		// Show error from runner
		if (error) {
			lines.push(`Error: ${error}`);
			lines.push("");
		}

		// Detailed comparison based on validation type
		if (testCase.validation === "parse") {
			const actualEntries = Array.isArray(output) ? (output as Entry[]) : [];
			const expectedEntries = testCase.expected.entries ?? [];

			// Count comparison
			if (testCase.expected.count !== undefined) {
				lines.push(
					`Count: expected ${testCase.expected.count}, got ${actualEntries.length}`,
				);
				lines.push("");
			}

			// Entry comparison
			if (expectedEntries.length > 0 || actualEntries.length > 0) {
				const diffs = findEntryDifferences(actualEntries, expectedEntries);

				if (diffs.length > 0) {
					lines.push("Entry differences:");
					for (const diff of diffs.slice(0, 5)) {
						lines.push(...formatDiffEntry(diff));
					}
					if (diffs.length > 5) {
						lines.push(`  ... and ${diffs.length - 5} more differences`);
					}
					lines.push("");
				}

				// Show full arrays for reference
				lines.push(formatEntries(expectedEntries, "Expected entries"));
				lines.push("");
				lines.push(formatEntries(actualEntries, "Actual entries"));
			}
		} else if (testCase.validation === "build_hierarchy") {
			const objectDiffs = formatObjectDiff(output, expected);
			if (objectDiffs.length > 0) {
				lines.push("Object differences:");
				lines.push(...objectDiffs.slice(0, 15));
				if (objectDiffs.length > 15) {
					lines.push(`  ... and ${objectDiffs.length - 15} more differences`);
				}
				lines.push("");
			}

			// Show full objects
			lines.push("Expected object:");
			lines.push(
				`  ${JSON.stringify(expected, null, 2).split("\n").join("\n  ")}`,
			);
			lines.push("");
			lines.push("Actual object:");
			lines.push(
				`  ${JSON.stringify(output, null, 2).split("\n").join("\n  ")}`,
			);
		}

		// Add test metadata
		lines.push("");
		lines.push("Test metadata:");
		lines.push(`  Functions: ${testCase.functions?.join(", ") ?? "(none)"}`);
		lines.push(`  Features: ${testCase.features.join(", ") || "(none)"}`);
		lines.push(`  Behaviors: ${testCase.behaviors.join(", ") || "(none)"}`);
		if (testCase.source_test) {
			lines.push(`  Source: ${testCase.source_test}`);
		}

		return {
			pass: false,
			message: () => lines.join("\n"),
		};
	},

	/**
	 * Assert that CCL parse output matches expected entry count.
	 *
	 * @example
	 * ```typescript
	 * expect(result).toHaveCCLEntryCount(5);
	 * ```
	 */
	toHaveCCLEntryCount(received: CCLTestResult, expectedCount: number) {
		const { output, testCase } = received;
		const actualCount = Array.isArray(output) ? output.length : 0;

		if (actualCount === expectedCount) {
			return {
				pass: true,
				message: () =>
					`Expected CCL test "${testCase.name}" to NOT have ${expectedCount} entries, but it does`,
			};
		}

		return {
			pass: false,
			message: () => {
				const entries = Array.isArray(output) ? (output as Entry[]) : [];
				return [
					"",
					`CCL Entry Count Mismatch: ${testCase.name}`,
					`  Expected: ${expectedCount} entries`,
					`  Actual: ${actualCount} entries`,
					"",
					formatEntries(entries, "Actual entries"),
				].join("\n");
			},
		};
	},

	/**
	 * Assert that CCL parse output matches expected entries.
	 *
	 * @example
	 * ```typescript
	 * expect(result).toMatchCCLEntries([
	 *   { key: "foo", value: "bar" },
	 *   { key: "baz", value: "qux" },
	 * ]);
	 * ```
	 */
	toMatchCCLEntries(received: CCLTestResult, expectedEntries: Entry[]) {
		const { output, testCase, input } = received;
		const actualEntries = Array.isArray(output) ? (output as Entry[]) : [];

		const matches =
			JSON.stringify(actualEntries) === JSON.stringify(expectedEntries);

		if (matches) {
			return {
				pass: true,
				message: () =>
					`Expected CCL test "${testCase.name}" entries to NOT match, but they do`,
			};
		}

		const diffs = findEntryDifferences(actualEntries, expectedEntries);

		return {
			pass: false,
			message: () => {
				const lines = [
					"",
					`CCL Entries Mismatch: ${testCase.name}`,
					"",
					"Input:",
					`  ${input.replaceAll("\n", "\\n")}`,
					"",
				];

				if (diffs.length > 0) {
					lines.push("Differences:");
					for (const diff of diffs) {
						lines.push(...formatDiffEntry(diff));
					}
					lines.push("");
				}

				lines.push(formatEntries(expectedEntries, "Expected"));
				lines.push("");
				lines.push(formatEntries(actualEntries, "Actual"));

				return lines.join("\n");
			},
		};
	},

	/**
	 * Assert that CCL hierarchy output matches expected object.
	 *
	 * @example
	 * ```typescript
	 * expect(result).toMatchCCLObject({ foo: "bar", nested: { key: "val" } });
	 * ```
	 */
	toMatchCCLObject(received: CCLTestResult, expectedObject: unknown) {
		const { output, testCase, input } = received;

		const matches = JSON.stringify(output) === JSON.stringify(expectedObject);

		if (matches) {
			return {
				pass: true,
				message: () =>
					`Expected CCL test "${testCase.name}" object to NOT match, but it does`,
			};
		}

		const diffs = formatObjectDiff(output, expectedObject);

		return {
			pass: false,
			message: () => {
				const lines = [
					"",
					`CCL Object Mismatch: ${testCase.name}`,
					"",
					"Input:",
					`  ${input.replaceAll("\n", "\\n")}`,
					"",
				];

				if (diffs.length > 0) {
					lines.push("Differences:");
					lines.push(...diffs);
					lines.push("");
				}

				lines.push("Expected:");
				lines.push(
					`  ${JSON.stringify(expectedObject, null, 2).split("\n").join("\n  ")}`,
				);
				lines.push("");
				lines.push("Actual:");
				lines.push(
					`  ${JSON.stringify(output, null, 2).split("\n").join("\n  ")}`,
				);

				return lines.join("\n");
			},
		};
	},
};

/**
 * Type declarations for custom matchers.
 * Import this in your vitest.d.ts or test setup file.
 */
export interface CCLMatchers<R = unknown> {
	/**
	 * Assert that a CCL test result passed.
	 * Provides detailed error messages for debugging.
	 */
	toPassCCLTest(): R;

	/**
	 * Assert that CCL parse output has the expected entry count.
	 */
	toHaveCCLEntryCount(count: number): R;

	/**
	 * Assert that CCL parse output matches expected entries.
	 */
	toMatchCCLEntries(entries: Entry[]): R;

	/**
	 * Assert that CCL hierarchy output matches expected object.
	 */
	toMatchCCLObject(object: unknown): R;
}
