/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 */
/**
 * Parse CCL text into flat key-value entries.
 *
 * CCL is a simple configuration format where:
 * - Lines with `=` define key-value pairs
 * - Indented lines continue the previous value
 * - Keys are trimmed; values have leading/trailing spaces trimmed (tabs preserved)
 *
 * @param text - The CCL text to parse
 * @returns An array of entries with key-value pairs
 *
 * @example
 * ```typescript
 * const entries = parse("name = Alice\nage = 42");
 * // [{ key: "name", value: "Alice" }, { key: "age", value: "42" }]
 * ```
 */
export function parse(text) {
    // TODO: Implement CCL parsing algorithm
    // For now, return empty array as stub
    return [];
}
// ============================================================================
// Future Functions (commented out stubs)
// ============================================================================
// Uncomment and implement these functions as needed.
// Each function should be added to the test config in test/ccl.test.ts
// and exported from src/index.ts when implemented.
// /**
//  * Parse CCL text with indentation normalization.
//  *
//  * Similar to `parse`, but first normalizes indentation by calculating
//  * the common leading whitespace and stripping it from all lines.
//  * This is similar to Python's `textwrap.dedent`.
//  *
//  * @param text - The CCL text to parse (with potentially inconsistent indentation)
//  * @returns An array of entries with key-value pairs
//  */
// export function parseIndented(text: string): Entry[] {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Build a hierarchical object from flat entries.
//  *
//  * Takes a flat list of entries (from `parse`) and recursively
//  * parses any nested CCL syntax in the values to build a hierarchical object.
//  *
//  * @param entries - The flat entries from a parse operation
//  * @returns A hierarchical CCL object
//  */
// export function buildHierarchy(entries: Entry[]): CCLObject {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Get a string value at the specified path.
//  *
//  * @param obj - The CCL object to query
//  * @param path - The path to the value (e.g., "server.host")
//  * @returns The string value, or undefined if not found
//  */
// export function getString(obj: CCLObject, path: string): string | undefined {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Get an integer value at the specified path.
//  *
//  * @param obj - The CCL object to query
//  * @param path - The path to the value
//  * @returns The integer value, or undefined if not found/invalid
//  */
// export function getInt(obj: CCLObject, path: string): number | undefined {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Get a boolean value at the specified path.
//  *
//  * @param obj - The CCL object to query
//  * @param path - The path to the value
//  * @returns The boolean value, or undefined if not found/invalid
//  */
// export function getBool(obj: CCLObject, path: string): boolean | undefined {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Get a float value at the specified path.
//  *
//  * @param obj - The CCL object to query
//  * @param path - The path to the value
//  * @returns The float value, or undefined if not found/invalid
//  */
// export function getFloat(obj: CCLObject, path: string): number | undefined {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Get a list value at the specified path.
//  *
//  * @param obj - The CCL object to query
//  * @param path - The path to the value
//  * @returns The list of strings, or undefined if not found
//  */
// export function getList(obj: CCLObject, path: string): string[] | undefined {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Filter entries based on a predicate.
//  *
//  * @param entries - The entries to filter
//  * @param predicate - A function that returns true for entries to keep
//  * @returns Filtered entries
//  */
// export function filter(
// 	entries: Entry[],
// 	predicate: (entry: Entry) => boolean,
// ): Entry[] {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Compose two entry lists (overlay on base).
//  *
//  * @param base - The base entries
//  * @param overlay - The overlay entries (take precedence)
//  * @returns Composed entries
//  */
// export function compose(base: Entry[], overlay: Entry[]): Entry[] {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Print entries to CCL format.
//  *
//  * @param entries - The entries to format
//  * @returns CCL-formatted string
//  */
// export function print(entries: Entry[]): string {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Format input to canonical CCL representation.
//  *
//  * @param input - The CCL text to canonicalize
//  * @returns Canonicalized CCL string
//  */
// export function canonicalFormat(input: string): string {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Load and parse CCL from string directly to object.
//  *
//  * Convenience function combining parse and buildHierarchy.
//  *
//  * @param input - The CCL text to load
//  * @returns A hierarchical CCL object
//  */
// export function load(input: string): CCLObject {
// 	throw new Error("Not yet implemented");
// }
// /**
//  * Round-trip: parse, build, print.
//  *
//  * @param input - The CCL text to round-trip
//  * @returns The round-tripped CCL string
//  */
// export function roundTrip(input: string): string {
// 	throw new Error("Not yet implemented");
// }
//# sourceMappingURL=ccl.js.map