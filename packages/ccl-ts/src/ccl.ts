/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 */

import type { CCLObject, Entry } from "./types.js";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CCL parsing inherently requires complex control flow for handling multiline values, continuation lines, and indentation
export function parse(text: string): Entry[] {
	const entries: Entry[] = [];

	// Work with the text as a whole, finding '=' separators
	let pos = 0;

	while (pos < text.length) {
		// Find the next '='
		const eqIndex = text.indexOf("=", pos);

		if (eqIndex === -1) {
			// No more '=' in the text - we're done
			break;
		}

		// Key is everything from current position to '=', with all whitespace trimmed
		const rawKey = text.slice(pos, eqIndex);
		const key = rawKey.replace(/\s+/g, " ").trim();

		// Find the line containing the '=' to determine base indentation
		const lineStart = findLineStart(text, eqIndex);
		const baseIndent = countLeadingWhitespace(text.slice(lineStart));

		// Value starts after '='
		const valueStart = eqIndex + 1;

		// Find the end of the value by looking for the next entry
		// An entry ends when we find a line with equal or less indentation that contains '='
		// or when we reach the end of text

		// First, get the rest of the current line after '='
		let lineEnd = text.indexOf("\n", valueStart);
		if (lineEnd === -1) {
			lineEnd = text.length;
		}

		const rawFirstLine = text.slice(valueStart, lineEnd);
		const firstLineValue = rawFirstLine.trimStart();
		const valueLines: string[] = [];
		const firstLineEmpty = firstLineValue.length === 0;

		if (!firstLineEmpty) {
			valueLines.push(firstLineValue);
		}

		// Move past the first line
		let scanPos = lineEnd + 1;

		// Now look at subsequent lines
		while (scanPos < text.length) {
			const nextLineStart = scanPos;
			let nextLineEnd = text.indexOf("\n", scanPos);
			if (nextLineEnd === -1) {
				nextLineEnd = text.length;
			}

			const nextLine = text.slice(nextLineStart, nextLineEnd);
			const nextIndent = countLeadingWhitespace(nextLine);
			const isEmpty = nextLine.trim() === "";

			if (isEmpty) {
				// Empty line - check ahead to see if there are more continuation lines
				let hasMoreContinuation = false;
				let lookAhead = nextLineEnd + 1;
				while (lookAhead < text.length) {
					let futureEnd = text.indexOf("\n", lookAhead);
					if (futureEnd === -1) {
						futureEnd = text.length;
					}
					const futureLine = text.slice(lookAhead, futureEnd);
					if (futureLine.trim() === "") {
						lookAhead = futureEnd + 1;
						continue;
					}
					const futureIndent = countLeadingWhitespace(futureLine);
					if (futureIndent > baseIndent) {
						hasMoreContinuation = true;
					}
					break;
				}
				if (hasMoreContinuation) {
					valueLines.push("");
					scanPos = nextLineEnd + 1;
					continue;
				}
				// No more continuation - stop here
				break;
			}

			// Check if this is a continuation line (greater indentation than base)
			if (nextIndent > baseIndent) {
				// This is a continuation line - preserve the full line content
				valueLines.push(nextLine);
				scanPos = nextLineEnd + 1;
			} else {
				// Not a continuation - new entry begins
				break;
			}
		}

		// Build the final value
		let value: string;
		if (valueLines.length === 0) {
			value = "";
		} else if (valueLines.length === 1 && !firstLineEmpty) {
			// Single line value - just trim trailing whitespace
			// biome-ignore lint/style/noNonNullAssertion: length check above guarantees element exists
			value = valueLines[0]!.trimEnd();
		} else {
			// Multiline value
			// If first line was empty, prepend a newline
			const allLines = firstLineEmpty ? ["", ...valueLines] : valueLines;
			// Join with newlines, trim trailing whitespace from last line only
			const processed = allLines.map((l, idx, arr) =>
				idx === arr.length - 1 ? l.trimEnd() : l,
			);
			value = processed.join("\n");
		}

		entries.push({ key, value });

		// Move position past this entry
		pos = scanPos;
	}

	return entries;
}

/**
 * Find the start of the line containing the given position.
 */
function findLineStart(text: string, pos: number): number {
	let lineStart = pos;
	while (lineStart > 0 && text[lineStart - 1] !== "\n") {
		lineStart--;
	}
	return lineStart;
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
