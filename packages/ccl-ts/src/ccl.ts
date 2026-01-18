/**
 * CCL (Categorical Configuration Language) parser implementation.
 *
 * This module provides the core parsing functionality for CCL.
 * See https://ccl.tylerbutler.com for the CCL specification.
 *
 * All functions that can fail return Result types from true-myth.
 * Use .isOk/.isErr to check success, or .match() for pattern matching.
 */

import { err, ok, type Result } from "true-myth/result";
import type {
	AccessError,
	CCLObject,
	CCLValue,
	Entry,
	ParseError,
} from "./types.js";

// Regex patterns for whitespace trimming (top-level for performance)
const LEADING_WHITESPACE = /^[ \t]+/;
const TRAILING_WHITESPACE = /[ \t]+$/;

/**
 * Parse CCL text into a flat list of entries.
 *
 * Each entry contains a key-value pair extracted from the CCL input.
 * The parser handles multiline values, continuation lines, and indentation-based nesting.
 *
 * @param text - The CCL text to parse
 * @returns A Result containing an array of entries or a parse error
 *
 * @example
 * ```ts
 * const result = parse("name=Alice\nage=30");
 * if (result.isOk) {
 *   console.log(result.value);
 *   // => [{ key: "name", value: "Alice" }, { key: "age", value: "30" }]
 * }
 * ```
 *
 * @beta
 */
export function parse(text: string): Result<Entry[], ParseError> {
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

	return ok(entries);
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
	return s.replace(LEADING_WHITESPACE, "");
}

/**
 * Trim only trailing spaces and tabs from a string, preserving \r for CRLF handling.
 */
function trimTrailingSpacesAndTabs(s: string): string {
	return s.replace(TRAILING_WHITESPACE, "");
}

/**
 * Build the final value string from collected lines.
 */
function buildValue(valueLines: string[]): string {
	if (valueLines.length === 0) {
		return "";
	}

	if (valueLines.length === 1) {
		return trimTrailingSpacesAndTabs(valueLines[0] as string);
	}

	// Multiline value - trim trailing spaces/tabs from last line only
	const lastIndex = valueLines.length - 1;
	const processed = valueLines.map((line, idx) =>
		idx === lastIndex ? trimTrailingSpacesAndTabs(line) : line,
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
 * @returns A Result containing a hierarchical CCL object or a parse error
 *
 * @example
 * ```ts
 * const parseResult = parse("server=\n  host=localhost\n  port=8080");
 * if (parseResult.isOk) {
 *   const objResult = buildHierarchy(parseResult.value);
 *   if (objResult.isOk) {
 *     console.log(objResult.value);
 *     // => { server: { host: "localhost", port: "8080" } }
 *   }
 * }
 * ```
 *
 * @beta
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Hierarchy building requires handling multiple entry types (empty keys, nested CCL, terminals) and duplicate key merging
export function buildHierarchy(
	entries: Entry[],
): Result<CCLObject, ParseError> {
	const result: CCLObject = {};

	for (const entry of entries) {
		const { key, value } = entry;

		if (key === "") {
			// Empty key → add to list collection at the empty key
			addToList(result, "", value);
		} else if (containsCCLSyntax(value)) {
			// Value contains "=" → recursively parse as nested CCL
			const nestedEntriesResult = parse(value);
			if (nestedEntriesResult.isErr) {
				return err(nestedEntriesResult.error);
			}
			const nestedObjResult = buildHierarchy(nestedEntriesResult.value);
			if (nestedObjResult.isErr) {
				return nestedObjResult;
			}
			const nestedObj = nestedObjResult.value;

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

	return ok(result);
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
// Typed Access Functions
// ============================================================================
// These functions provide type-safe access to CCL values.
// CCL values are always strings; type conversion is a library convenience.
// Path navigation uses variadic arguments: getString(obj, "server", "host")

/**
 * Navigate to a value at the specified path in a CCL object.
 *
 * @param obj - The CCL object to navigate
 * @param pathParts - Path components to the value (e.g., "server", "host")
 * @returns The value at the path, or undefined if not found
 */
function navigateToValue(
	obj: CCLObject,
	pathParts: string[],
): CCLValue | undefined {
	if (pathParts.length === 0) {
		// Empty path - return the root object itself is not valid for typed access
		return undefined;
	}

	let current: CCLValue = obj;

	for (const part of pathParts) {
		if (!isPlainObject(current)) {
			// Can't navigate further into a non-object
			return undefined;
		}
		const next: CCLValue | undefined = current[part];
		if (next === undefined) {
			return undefined;
		}
		current = next;
	}

	return current;
}

/**
 * Get a string value at the specified path.
 *
 * Navigates to the path and returns the value if it's a string.
 * Returns an error Result if the path doesn't exist or the value isn't a string.
 *
 * @param obj - The CCL object to query
 * @param pathParts - Path components to the value (e.g., "server", "host")
 * @returns A Result containing the string value or an access error
 *
 * @example
 * ```ts
 * const objResult = buildHierarchy(parse("server=\n  host=localhost").value);
 * if (objResult.isOk) {
 *   const hostResult = getString(objResult.value, "server", "host");
 *   if (hostResult.isOk) {
 *     console.log(hostResult.value); // => "localhost"
 *   }
 * }
 * ```
 *
 * @beta
 */
export function getString(
	obj: CCLObject,
	...pathParts: string[]
): Result<string, AccessError> {
	const value = navigateToValue(obj, pathParts);

	if (value === undefined) {
		return err({ message: "Path not found", path: pathParts });
	}

	if (typeof value !== "string") {
		return err({
			message: `Value is not a string (got ${Array.isArray(value) ? "array" : "object"})`,
			path: pathParts,
		});
	}

	return ok(value);
}

/**
 * Get a trimmed non-empty string for numeric parsing.
 * Returns the original value alongside trimmed for error messages.
 */
function getTrimmedForParsing(
	obj: CCLObject,
	pathParts: string[],
	typeName: string,
): Result<{ original: string; trimmed: string }, AccessError> {
	const strResult = getString(obj, ...pathParts);
	if (strResult.isErr) {
		return err(strResult.error);
	}
	const original = strResult.value;
	const trimmed = original.trim();

	if (trimmed === "") {
		return err({
			message: `Value is empty, cannot parse as ${typeName}`,
			path: pathParts,
		});
	}

	return ok({ original, trimmed });
}

/**
 * Get an integer value at the specified path.
 *
 * Navigates to the path, retrieves the string value, and parses it as an integer.
 * Returns an error Result if the path doesn't exist, value isn't a string, or parsing fails.
 *
 * @param obj - The CCL object to query
 * @param pathParts - Path components to the value
 * @returns A Result containing the integer value or an access error
 *
 * @example
 * ```ts
 * const objResult = buildHierarchy(parse("port=8080").value);
 * if (objResult.isOk) {
 *   const portResult = getInt(objResult.value, "port");
 *   if (portResult.isOk) {
 *     console.log(portResult.value); // => 8080
 *   }
 * }
 * ```
 *
 * @beta
 */
export function getInt(
	obj: CCLObject,
	...pathParts: string[]
): Result<number, AccessError> {
	const prepResult = getTrimmedForParsing(obj, pathParts, "integer");
	if (prepResult.isErr) {
		return err(prepResult.error);
	}
	const { original, trimmed } = prepResult.value;

	const parsed = Number(trimmed);

	if (!Number.isFinite(parsed)) {
		return err({
			message: `Value is not a valid integer: '${original}'`,
			path: pathParts,
		});
	}

	if (!Number.isInteger(parsed)) {
		return err({
			message: `Value is not an integer (has decimal): '${original}'`,
			path: pathParts,
		});
	}

	return ok(parsed);
}

/**
 * Get a boolean value at the specified path.
 *
 * Navigates to the path, retrieves the string value, and parses it as a boolean.
 * Supports lenient parsing: true/false, yes/no, 1/0 (case-insensitive).
 * Returns an error Result if the path doesn't exist, value isn't a string, or not a valid boolean.
 *
 * @param obj - The CCL object to query
 * @param pathParts - Path components to the value
 * @returns A Result containing the boolean value or an access error
 *
 * @example
 * ```ts
 * const objResult = buildHierarchy(parse("enabled=true\ndebug=yes").value);
 * if (objResult.isOk) {
 *   const enabledResult = getBool(objResult.value, "enabled");
 *   if (enabledResult.isOk) {
 *     console.log(enabledResult.value); // => true
 *   }
 * }
 * ```
 *
 * @beta
 */
export function getBool(
	obj: CCLObject,
	...pathParts: string[]
): Result<boolean, AccessError> {
	const strResult = getString(obj, ...pathParts);
	if (strResult.isErr) {
		return err(strResult.error);
	}
	const strValue = strResult.value;

	// Normalize to lowercase and trim for comparison
	const normalized = strValue.trim().toLowerCase();

	// Lenient mode: accept true/false, yes/no, 1/0
	switch (normalized) {
		case "true":
		case "yes":
		case "1":
			return ok(true);
		case "false":
		case "no":
		case "0":
			return ok(false);
		default:
			return err({
				message: `Value is not a valid boolean: '${strValue}'`,
				path: pathParts,
			});
	}
}

/**
 * Get a float value at the specified path.
 *
 * Navigates to the path, retrieves the string value, and parses it as a float.
 * Returns an error Result if the path doesn't exist, value isn't a string, or parsing fails.
 *
 * @param obj - The CCL object to query
 * @param pathParts - Path components to the value
 * @returns A Result containing the float value or an access error
 *
 * @example
 * ```ts
 * const objResult = buildHierarchy(parse("ratio=3.14").value);
 * if (objResult.isOk) {
 *   const ratioResult = getFloat(objResult.value, "ratio");
 *   if (ratioResult.isOk) {
 *     console.log(ratioResult.value); // => 3.14
 *   }
 * }
 * ```
 *
 * @beta
 */
export function getFloat(
	obj: CCLObject,
	...pathParts: string[]
): Result<number, AccessError> {
	const prepResult = getTrimmedForParsing(obj, pathParts, "float");
	if (prepResult.isErr) {
		return err(prepResult.error);
	}
	const { original, trimmed } = prepResult.value;

	const parsed = Number(trimmed);

	if (!Number.isFinite(parsed)) {
		return err({
			message: `Value is not a valid number: '${original}'`,
			path: pathParts,
		});
	}

	return ok(parsed);
}

/**
 * Get a list value at the specified path.
 *
 * Navigates to the path and returns the value if it's an array.
 * If the path points to an object with an empty-key list (bare list syntax),
 * automatically returns that list.
 * Does NOT coerce single values to lists (ListCoercionDisabled behavior).
 * Returns an error Result if the path doesn't exist or the value isn't a list.
 *
 * @param obj - The CCL object to query
 * @param pathParts - Path components to the value
 * @returns A Result containing the array of strings or an access error
 *
 * @example
 * ```ts
 * // Duplicate keys create a list directly
 * const objResult1 = buildHierarchy(parse("colors=red\ncolors=green\ncolors=blue").value);
 * if (objResult1.isOk) {
 *   const listResult = getList(objResult1.value, "colors");
 *   if (listResult.isOk) {
 *     console.log(listResult.value); // => ["red", "green", "blue"]
 *   }
 * }
 *
 * // Bare list syntax (empty keys) also works
 * const objResult2 = buildHierarchy(parse("colors=\n  =red\n  =green\n  =blue").value);
 * if (objResult2.isOk) {
 *   const listResult = getList(objResult2.value, "colors");
 *   if (listResult.isOk) {
 *     console.log(listResult.value); // => ["red", "green", "blue"]
 *   }
 * }
 * ```
 *
 * @beta
 */
export function getList(
	obj: CCLObject,
	...pathParts: string[]
): Result<string[], AccessError> {
	const value = navigateToValue(obj, pathParts);

	if (value === undefined) {
		return err({ message: "Path not found", path: pathParts });
	}

	// Direct array (from duplicate keys)
	if (Array.isArray(value)) {
		return ok(value);
	}

	// Object with empty-key list (bare list syntax)
	if (isPlainObject(value)) {
		const emptyKeyValue = value[""];
		if (Array.isArray(emptyKeyValue)) {
			return ok(emptyKeyValue);
		}
	}

	// ListCoercionDisabled: do not coerce single values to lists
	return err({
		message: `Value is not a list (got ${typeof value === "string" ? "string" : "object"})`,
		path: pathParts,
	});
}

// ============================================================================
// Formatting Functions
// ============================================================================
// These functions convert CCL structures back to text representation.

/**
 * Print entries to CCL format.
 *
 * Converts a flat list of entries back to CCL text format.
 * This function provides structure-preserving round-trip capability:
 * for standard-format inputs, `print(parse(x)) == x`.
 *
 * Output format:
 * - Keys and values separated by " = "
 * - Empty keys formatted as " = value" (space before = for clarity)
 * - Multiline values preserve their content as continuation lines
 * - No trailing newline is added
 *
 * @param entries - The entries to format
 * @returns CCL-formatted string
 *
 * @example
 * ```ts
 * const entries = [
 *   { key: "name", value: "Alice" },
 *   { key: "config", value: "\n  host = localhost\n  port = 8080" }
 * ];
 * print(entries);
 * // => "name = Alice\nconfig = \n  host = localhost\n  port = 8080"
 * ```
 *
 * @beta
 */
export function print(entries: Entry[]): string {
	return entries
		.map(({ key, value }) => {
			// Empty keys get a leading space for clarity
			const keyPart = key === "" ? " " : key;
			// Multiline values: key followed by " =" (value includes newline)
			// Single-line values: key followed by " = value"
			const separator = value.includes("\n") ? " =" : " = ";
			return `${keyPart}${separator}${value}`;
		})
		.join("\n");
}

/**
 * Format input to canonical CCL representation.
 *
 * Parses the input and produces a normalized output with:
 * - Keys sorted alphabetically
 * - Consistent spacing: " = " between key and value
 * - 2-space indentation for nested content
 * - Trailing newline
 * - All values converted to nested structure form
 *
 * This transformation is semantic-preserving but changes structural representation.
 * It enables deterministic output regardless of input ordering.
 *
 * @param input - The CCL text to canonicalize
 * @returns A Result containing the canonicalized CCL string or a parse error
 *
 * @example
 * ```ts
 * const result = canonicalFormat("z = last\na = first\nm = middle");
 * if (result.isOk) {
 *   console.log(result.value);
 *   // => "a =\n  first =\nm =\n  middle =\nz =\n  last =\n"
 * }
 * ```
 *
 * @beta
 */
export function canonicalFormat(input: string): Result<string, ParseError> {
	const entriesResult = parse(input);
	if (entriesResult.isErr) {
		return err(entriesResult.error);
	}
	const objResult = buildHierarchy(entriesResult.value);
	if (objResult.isErr) {
		return err(objResult.error);
	}
	return ok(formatCanonical(objResult.value, 0));
}

/**
 * Recursively format a CCL object in canonical form.
 */
function formatCanonical(obj: CCLObject, depth: number): string {
	const indent = "  ".repeat(depth);
	const childIndent = `${indent}  `;

	const lines = Object.keys(obj)
		.sort()
		.flatMap((key) => {
			const value = obj[key] as CCLValue;
			const keyLine = `${indent}${key} =`;

			if (typeof value === "string") {
				// Empty string: just the key line; non-empty: key line + value line
				return value === "" ? [keyLine] : [keyLine, `${childIndent}${value} =`];
			}
			if (Array.isArray(value)) {
				// List: key line + each item as a child line
				return [keyLine, ...value.map((item) => `${childIndent}${item} =`)];
			}
			// Nested object: key line + recursive content (trim trailing newline)
			return [keyLine, formatCanonical(value, depth + 1).slice(0, -1)];
		});

	return `${lines.join("\n")}\n`;
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
