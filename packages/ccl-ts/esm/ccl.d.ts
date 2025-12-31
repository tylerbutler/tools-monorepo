/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 */
import type { Entry } from "ccl-test-runner-ts/types";
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
export declare function parse(text: string): Entry[];
//# sourceMappingURL=ccl.d.ts.map