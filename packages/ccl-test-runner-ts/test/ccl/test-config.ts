/**
 * Shared test configuration for ccl-test-runner-ts.
 *
 * This file contains shared configuration for the test suite including
 * the path to test data and the list of tests to skip. This is internal
 * to the test suite and not exported to consumers of the package.
 */

import { createRequire } from "node:module";
import { dirname, join } from "pathe";

const require = createRequire(import.meta.url);

/**
 * Resolves the path to the ccl-test-data package's data directory.
 * Uses require.resolve to find the workspace package.
 */
function resolveTestDataPath(): string {
	// Resolve the package.json of ccl-test-data, then get the data directory
	const packageJsonPath = require.resolve(
		"@tylerbu/ccl-test-data/package.json",
	);
	return join(dirname(packageJsonPath), "data");
}

/**
 * Path to the shared test data directory from @tylerbu/ccl-test-data package.
 * All test files should import this constant instead of hardcoding the path.
 */
export const TEST_DATA_PATH = resolveTestDataPath();

/**
 * Tests to skip - these require full CCL parser features not implemented in the stub.
 *
 * The stub parser is intentionally minimal and doesn't handle:
 * - Multiline key handling (newlines before =)
 * - Nested list parsing
 * - Complex whitespace/tab handling edge cases
 * - Round-trip normalization
 */
export const STUB_PARSER_SKIP_TESTS: string[] = [
	// Multiline key handling (newlines before =)
	"key_with_newline_before_equals_parse",
	"complex_multi_newline_whitespace_parse",
	// Nested list parsing
	"deeply_nested_list_parse",
	// Whitespace/tab handling edge cases
	"spacing_loose_mixed_whitespace_parse",
	"tabs_to_spaces_in_value_parse",
	"spacing_and_tabs_combined_loose_to_spaces_parse",
	"tabs_to_spaces_leading_tab_parse",
	"tabs_to_spaces_multiple_tabs_parse",
	// Round-trip normalization
	"round_trip_whitespace_normalization_parse",
];
