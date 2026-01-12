/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 */

import type { CCLObject, Entry } from "./types.js";

/**
 * Parse CCL text into a flat list of entries.
 *
 * Each entry contains a key-value pair extracted from the CCL input.
 * The parser handles multiline values, continuation lines, and indentation-based nesting.
 *
 * @param text - The CCL text to parse
 * @returns An array of entries with key-value pairs
 *
 * @example
 * ```ts
 * const entries = parse("name=Alice\nage=30");
 * // => [{ key: "name", value: "Alice" }, { key: "age", value: "30" }]
 * ```
 *
 * @beta
 */
export function parse(text: string): Entry[] {
	const baseline = determineBaseline(text);
	const entries: Entry[] = [];
	let pos = 0;

	while (pos < text.length) {
		const entryResult = getNextEntry(text, pos, baseline);
		if (!entryResult) {
			break;
		}

		const { key, value, nextPos } = entryResult;
		entries.push({ key, value });
		pos = nextPos;
	}

	return entries;
}

/**
 * Determine the baseline indentation for parsing.
 *
 * Finds the first non-empty line and uses its indentation as the baseline.
 * This enables correct parsing of both top-level content and nested content
 * where all entries share a common indentation level.
 */
function determineBaseline(text: string): number {
	let pos = 0;
	while (pos < text.length) {
		const line = getLineAt(text, pos);
		if (line === null) {
			break;
		}
		if (!isEmptyLine(line)) {
			return countLeadingWhitespace(line);
		}
		pos = skipLine(text, pos);
	}
	return 0;
}

/**
 * Extract the next entry from the text starting at the given position.
 */
function getNextEntry(
	text: string,
	startPos: number,
	baseline: number,
): (Entry & { nextPos: number }) | null {
	// Find the next '='
	const eqIndex = text.indexOf("=", startPos);
	if (eqIndex === -1) {
		return null;
	}

	// Extract and trim the key
	const rawKey = text.slice(startPos, eqIndex);
	const key = rawKey.replace(/\s+/g, " ").trim();

	// Collect value lines
	const valueStart = eqIndex + 1;
	const { valueLines, nextPos } = collectValueLines(text, valueStart, baseline);

	// Build the final value
	const value = buildValue(valueLines);

	return { key, value, nextPos };
}

/**
 * Collect value lines for an entry, handling continuation lines.
 */
function collectValueLines(
	text: string,
	startPos: number,
	baseline: number,
): { valueLines: string[]; nextPos: number } {
	const valueLines: string[] = [];
	let pos = startPos;

	// Get the first line of the value
	const firstLine = getLineAt(text, pos);
	if (firstLine !== null) {
		valueLines.push(trimLeadingSpacesAndTabs(firstLine));
		pos = skipLine(text, pos);
	}

	// Collect continuation lines
	while (pos < text.length) {
		const line = getLineAt(text, pos);
		if (line === null) {
			break;
		}

		if (isEmptyLine(line)) {
			// Empty line - check if there are more continuation lines
			if (hasMoreContinuations(text, pos, baseline)) {
				valueLines.push("");
				pos = skipLine(text, pos);
				continue;
			}
			break;
		}

		const indent = countLeadingWhitespace(line);
		if (indent > baseline) {
			// Continuation line - preserve full content
			valueLines.push(line);
			pos = skipLine(text, pos);
		} else {
			// New entry begins
			break;
		}
	}

	return { valueLines, nextPos: pos };
}

/**
 * Trim only leading spaces and tabs from a string, preserving \r for CRLF handling.
 */
function trimLeadingSpacesAndTabs(s: string): string {
	let start = 0;
	while (start < s.length) {
		const char = s[start];
		if (char === " " || char === "\t") {
			start++;
		} else {
			break;
		}
	}
	return s.slice(start);
}

/**
 * Trim only trailing spaces and tabs from a string, preserving \r for CRLF handling.
 */
function trimTrailingSpacesAndTabs(s: string): string {
	let end = s.length;
	while (end > 0) {
		const char = s[end - 1];
		if (char === " " || char === "\t") {
			end--;
		} else {
			break;
		}
	}
	return s.slice(0, end);
}

/**
 * Build the final value string from collected lines.
 */
function buildValue(valueLines: string[]): string {
	if (valueLines.length === 0) {
		return "";
	}
	if (valueLines.length === 1) {
		return trimTrailingSpacesAndTabs(valueLines[0]!);
	}

	// Multiline value - join with newlines, trim trailing spaces/tabs from last line only
	const processed = valueLines.map((l, idx, arr) =>
		idx === arr.length - 1 ? trimTrailingSpacesAndTabs(l) : l,
	);
	return processed.join("\n");
}

/**
 * Check if a line is empty (contains only whitespace or nothing).
 */
function isEmptyLine(line: string): boolean {
	return line.trim() === "";
}

/**
 * Check if there are more continuation lines after the current position.
 */
function hasMoreContinuations(
	text: string,
	pos: number,
	baseline: number,
): boolean {
	let checkPos = pos;

	while (checkPos < text.length) {
		const line = getLineAt(text, checkPos);
		if (line === null) {
			break;
		}

		if (!isEmptyLine(line)) {
			const indent = countLeadingWhitespace(line);
			return indent > baseline;
		}

		checkPos = skipLine(text, checkPos);
	}

	return false;
}

/**
 * Get the line at the given position, or null if at end.
 */
function getLineAt(text: string, pos: number): string | null {
	if (pos >= text.length) {
		return null;
	}

	const end = text.indexOf("\n", pos);
	return end === -1 ? text.slice(pos) : text.slice(pos, end);
}

/**
 * Skip past the current line and return the position of the next line.
 */
function skipLine(text: string, pos: number): number {
	const end = text.indexOf("\n", pos);
	return end === -1 ? text.length : end + 1;
}

/**
 * Count leading whitespace characters (spaces and tabs).
 */
function countLeadingWhitespace(line: string): number {
	let count = 0;
	for (const char of line) {
		if (char === " " || char === "\t") {
			count++;
		} else {
			break;
		}
	}
	return count;
}

/**
 * Build a hierarchical object from flat entries.
 *
 * Takes a flat list of entries (from `parse`) and recursively
 * parses any nested CCL syntax in the values to build a hierarchical object.
 *
 * Algorithm:
 * 1. Initialize an empty result map
 * 2. Iterate through each entry in the input list
 * 3. Classify each entry:
 *    - Empty key ("") → add to list collection
 *    - Value contains "=" → recursively parse as nested CCL
 *    - Otherwise → store as terminal string value
 * 4. Return the constructed hierarchy
 *
 * @param entries - The flat entries from a parse operation
 * @returns A hierarchical CCL object
 *
 * @example
 * ```ts
 * const entries = parse("server=\n  host=localhost\n  port=8080");
 * const obj = buildHierarchy(entries);
 * // => { server: { host: "localhost", port: "8080" } }
 * ```
 *
 * @beta
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Hierarchy building requires handling multiple entry types (empty keys, nested CCL, terminals) and duplicate key merging
export function buildHierarchy(entries: Entry[]): CCLObject {
	const result: CCLObject = {};

	for (const entry of entries) {
		const { key, value } = entry;

		if (key === "") {
			// Empty key → add to list collection at the empty key
			addToList(result, "", value);
		} else if (containsCCLSyntax(value)) {
			// Value contains "=" → recursively parse as nested CCL
			const nestedEntries = parse(value);
			const nestedObj = buildHierarchy(nestedEntries);

			// Check if key already exists
			const existing = result[key];
			if (existing === undefined) {
				// First occurrence
				result[key] = nestedObj;
			} else if (isPlainObject(existing)) {
				// Merge with existing object
				result[key] = mergeObjects(existing, nestedObj);
			}
			// If existing is a string or array, nested object takes precedence
			// (this is an edge case that shouldn't happen with valid CCL)
		} else {
			// Terminal string value - handle duplicates by converting to list
			const existing = result[key];
			if (existing === undefined) {
				// First occurrence - store as string
				result[key] = value;
			} else if (Array.isArray(existing)) {
				// Already an array - append
				existing.push(value);
			} else if (typeof existing === "string") {
				// Second occurrence - convert to array
				result[key] = [existing, value];
			}
			// If it's a nested object, we ignore duplicate string
		}
	}

	return result;
}

/**
 * Check if a value is a plain object (not array, not null).
 */
function isPlainObject(value: unknown): value is CCLObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Merge two CCL objects, combining their properties.
 * When both have the same key:
 * - If both are objects, merge recursively
 * - If both are strings, convert to array
 * - If both are arrays, concatenate
 * - Otherwise, the second value takes precedence
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Object merging requires handling all type combinations (object+object, array+array, string+string, mixed types)
function mergeObjects(base: CCLObject, overlay: CCLObject): CCLObject {
	const result: CCLObject = { ...base };

	for (const [key, value] of Object.entries(overlay)) {
		const existing = result[key];

		if (existing === undefined) {
			result[key] = value;
		} else if (isPlainObject(existing) && isPlainObject(value)) {
			// Both are objects - merge recursively
			result[key] = mergeObjects(existing, value);
		} else if (Array.isArray(existing) && Array.isArray(value)) {
			// Both are arrays - concatenate
			result[key] = [...existing, ...value];
		} else if (typeof existing === "string" && typeof value === "string") {
			// Both are strings - convert to array
			result[key] = [existing, value];
		} else if (Array.isArray(existing) && typeof value === "string") {
			// Existing is array, new is string - append
			result[key] = [...existing, value];
		} else if (typeof existing === "string" && Array.isArray(value)) {
			// Existing is string, new is array - prepend existing to array
			result[key] = [existing, ...value];
		} else {
			// Different types or edge cases - overlay takes precedence
			result[key] = value;
		}
	}

	return result;
}

/**
 * Check if a value contains CCL syntax (indicating nested structure that should be parsed).
 *
 * A value contains CCL syntax if:
 * - It contains an `=` character, AND
 * - There is a newline before the `=` (meaning it's a multi-line value with nested entries)
 *
 * Single-line values like "foo=bar" or "<>=+" are treated as literal strings,
 * not as nested CCL structures.
 */
function containsCCLSyntax(value: string): boolean {
	const eqIndex = value.indexOf("=");
	if (eqIndex === -1) {
		return false;
	}

	// Check if there's a newline before the equals sign
	// This distinguishes multi-line nested values from single-line literal strings
	const beforeEquals = value.slice(0, eqIndex);
	return beforeEquals.includes("\n");
}

/**
 * Add a value to a list at the given key in the result object.
 * If the key doesn't exist, creates an array with the value.
 * If the key exists and is already an array, appends to it.
 * If the key exists and is a string, converts to array with both values.
 */
function addToList(result: CCLObject, key: string, value: string): void {
	const existing = result[key];

	if (existing === undefined) {
		// First value - create array
		result[key] = [value];
	} else if (Array.isArray(existing)) {
		// Already an array - append
		existing.push(value);
	} else if (typeof existing === "string") {
		// Was a single string - convert to array
		result[key] = [existing, value];
	}
	// If it's a nested object, we ignore the attempt to add to list
	// (this shouldn't happen with valid CCL, but handles edge case)
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
