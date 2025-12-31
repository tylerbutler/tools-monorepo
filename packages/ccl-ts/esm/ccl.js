/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 */
/**
 * Count leading whitespace characters (spaces and tabs).
 */
function countIndentation(line) {
    let count = 0;
    for (const char of line) {
        if (char === " " || char === "\t") {
            count++;
        }
        else {
            break;
        }
    }
    return count;
}
/**
 * Trim leading and trailing spaces only (preserving tabs).
 * This matches CCL behavior where tabs are preserved in values.
 */
function trimSpacesOnly(str) {
    // Trim leading spaces only (not tabs)
    let start = 0;
    while (start < str.length && str[start] === " ") {
        start++;
    }
    // Trim trailing spaces only (not tabs)
    let end = str.length;
    while (end > start && str[end - 1] === " ") {
        end--;
    }
    return str.slice(start, end);
}
/**
 * Parse CCL text into flat key-value entries.
 *
 * CCL is a simple configuration format where:
 * - Lines with `=` define key-value pairs
 * - Indented lines (more indentation than the entry start) continue the previous value
 * - Keys are trimmed; values have leading/trailing spaces trimmed
 * - Tabs in values are preserved
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
    const entries = [];
    // Split on LF only; CR is treated as content per spec
    const lines = text.split("\n");
    // Track the indentation level of the current entry
    let currentEntryIndent = 0;
    for (const line of lines) {
        // Skip empty lines
        if (line.length === 0) {
            continue;
        }
        const lineIndent = countIndentation(line);
        // Find first equals sign (split on first = only)
        const eqIndex = line.indexOf("=");
        // Check if this is a continuation line:
        // - Must have previous entry
        // - Must have more indentation than the entry's starting line
        // - OR has no equals sign (implicit continuation)
        const prev = entries[entries.length - 1];
        if (prev !== undefined && lineIndent > currentEntryIndent) {
            // This is a continuation line - append to previous value
            prev.value = prev.value + "\n" + line;
            continue;
        }
        if (eqIndex === -1) {
            // No equals sign and not a continuation - append to previous if exists
            if (prev !== undefined) {
                prev.value = prev.value + "\n" + line;
            }
            // If no previous entry, ignore the line (invalid CCL)
            continue;
        }
        // New entry - extract key and value
        const rawKey = line.slice(0, eqIndex);
        const rawValue = line.slice(eqIndex + 1);
        // Key: trim whitespace on both sides
        const key = rawKey.trim();
        // Value: trim leading/trailing spaces (preserving tabs)
        const value = trimSpacesOnly(rawValue);
        entries.push({ key, value });
        // Track the indentation of this entry's starting line
        currentEntryIndent = lineIndent;
    }
    return entries;
}
/**
 * Build a hierarchical object from flat entries.
 *
 * Takes a flat list of entries (from `parse`) and recursively
 * parses any nested CCL syntax in the values to build a hierarchical object.
 *
 * The algorithm uses recursive fixed-point parsing:
 * - If a value contains '=', it's recursively parsed as CCL
 * - If a value has no '=', it's stored as a terminal string
 * - Empty keys ('') indicate list items
 *
 * @param entries - The flat entries from a parse operation
 * @returns A hierarchical CCL object
 *
 * @example
 * ```typescript
 * const entries = parse("server =\n  host = localhost\n  port = 8080");
 * const obj = buildHierarchy(entries);
 * // { server: { host: "localhost", port: "8080" } }
 * ```
 */
export function buildHierarchy(entries) {
    const result = {};
    const listItems = [];
    for (const entry of entries) {
        const { key, value } = entry;
        if (key === "") {
            // Empty key = list item
            listItems.push(value);
            continue;
        }
        // Check if value contains nested CCL (has an equals sign)
        if (value.includes("=")) {
            // Recursively parse the value
            const nestedEntries = parse(value);
            const nestedObject = buildHierarchy(nestedEntries);
            result[key] = nestedObject;
        }
        else {
            // Terminal value - store as string
            result[key] = value;
        }
    }
    // If we collected list items, add them under a special key or return as-is
    // Per CCL spec, list items without keys become an array
    if (listItems.length > 0) {
        // If there's only list items and no other keys, the behavior depends on context
        // For now, store them as an array under the empty string key
        // This matches how CCL handles lists at the top level
        result[""] = listItems;
    }
    return result;
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