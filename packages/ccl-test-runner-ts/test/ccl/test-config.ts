/**
 * Shared test configuration for ccl-test-runner-ts.
 *
 * This file contains the list of tests to skip that are not implemented
 * in the stub parser. This is internal to the test suite and not exported
 * to consumers of the package.
 */

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
