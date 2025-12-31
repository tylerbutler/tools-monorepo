/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 */
import type { CCLObject, Entry } from "ccl-test-runner-ts/types";
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
export declare function parse(text: string): Entry[];
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
export declare function buildHierarchy(entries: Entry[]): CCLObject;
//# sourceMappingURL=ccl.d.ts.map