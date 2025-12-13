import { NotYetImplementedError } from "./errors.js";
import type { Entry, HierarchyResult, ParseResult } from "./types.js";

/**
 * Parse CCL text into flat key-value entries.
 *
 * This is the fundamental CCL parsing operation. It takes raw CCL text
 * and returns a flat list of key-value entries.
 *
 * @param text - The CCL text to parse
 * @returns A result containing either the parsed entries or a parse error
 *
 * @example
 * ```typescript
 * const result = parse("name = Alice\nage = 42");
 * if (result.success) {
 *   console.log(result.entries);
 *   // [{ key: "name", value: "Alice" }, { key: "age", value: "42" }]
 * }
 * ```
 */
export function parse(_text: string): ParseResult {
	throw new NotYetImplementedError("parse");
}

/**
 * Parse CCL text with indentation normalization.
 *
 * This function is similar to `parse`, but it first normalizes indentation
 * by calculating the common leading whitespace and stripping it from all lines.
 * This is similar to Python's `textwrap.dedent`.
 *
 * This function is used internally by `buildHierarchy` when parsing nested values.
 *
 * @param text - The CCL text to parse (with potentially inconsistent indentation)
 * @returns A result containing either the parsed entries or a parse error
 *
 * @example
 * ```typescript
 * const result = parseIndented(`
 *     name = Alice
 *     age = 42
 * `);
 * if (result.success) {
 *   console.log(result.entries);
 *   // [{ key: "name", value: "Alice" }, { key: "age", value: "42" }]
 * }
 * ```
 */
export function parseIndented(_text: string): ParseResult {
	throw new NotYetImplementedError("parseIndented");
}

/**
 * Build a hierarchical object from flat entries.
 *
 * This function takes a flat list of entries (from `parse`) and recursively
 * parses any nested CCL syntax in the values to build a hierarchical object.
 *
 * The algorithm uses fixed-point termination: it continues parsing until
 * no more CCL syntax is found in the values.
 *
 * @param entries - The flat entries from a parse operation
 * @returns A result containing either the hierarchical object or an error
 *
 * @example
 * ```typescript
 * const parseResult = parse("server =\n  host = localhost\n  port = 5432");
 * if (parseResult.success) {
 *   const hierarchyResult = buildHierarchy(parseResult.entries);
 *   if (hierarchyResult.success) {
 *     console.log(hierarchyResult.object);
 *     // { server: { host: "localhost", port: "5432" } }
 *   }
 * }
 * ```
 */
export function buildHierarchy(_entries: Entry[]): HierarchyResult {
	throw new NotYetImplementedError("buildHierarchy");
}

/**
 * Convenience function that parses CCL text directly to a hierarchical object.
 *
 * This combines `parse` and `buildHierarchy` into a single operation.
 *
 * @param text - The CCL text to parse
 * @returns A result containing either the hierarchical object or an error
 */
export function parseToObject(text: string): HierarchyResult {
	const parseResult = parse(text);
	if (!parseResult.success) {
		return parseResult;
	}
	return buildHierarchy(parseResult.entries);
}

/**
 * Get a list of all CCL function names that are currently implemented.
 * Functions that throw NotYetImplementedError are not included.
 */
export function getImplementedFunctions(): string[] {
	// Currently no functions are implemented
	return [];
}

/**
 * Get a list of all CCL function names.
 */
export function getAllFunctions(): string[] {
	return ["parse", "parseIndented", "buildHierarchy"];
}
