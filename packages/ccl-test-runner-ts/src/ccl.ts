import { NotYetImplementedError } from "./errors.js";
import type { Entry, HierarchyResult, ParseResult } from "./types.js";

/**
 * Trim spaces (not tabs) from both ends of a string.
 */
function trimSpaces(str: string): string {
	let start = 0;
	let end = str.length;
	while (start < end && str[start] === " ") {
		start++;
	}
	while (end > start && str[end - 1] === " ") {
		end--;
	}
	return str.slice(start, end);
}

/**
 * Get the indentation level (leading whitespace count) of a line.
 */
function getIndent(line: string): number {
	let i = 0;
	while (i < line.length && (line[i] === " " || line[i] === "\t")) {
		i++;
	}
	return i;
}

/**
 * Internal state for the parser.
 */
interface ParseState {
	entries: Entry[];
	currentKey: string | null;
	currentKeyIndent: number;
	valueLines: string[];
	baseIndent: number | null;
}

/**
 * Finalize the current entry and add it to the entries list.
 */
function finalizeEntry(state: ParseState): void {
	if (state.currentKey !== null) {
		const value = state.valueLines.join("\n").trimEnd();
		state.entries.push({ key: state.currentKey, value });
		state.valueLines = [];
	}
}

/**
 * Start a new entry from a line containing `=`.
 */
function startNewEntry(
	state: ParseState,
	trimmed: string,
	indent: number,
): void {
	finalizeEntry(state);

	const eqPos = trimmed.indexOf("=");
	const key = trimmed.slice(0, eqPos).trim();
	const valueRaw = trimmed.slice(eqPos + 1);
	const value = trimSpaces(valueRaw);

	state.currentKey = key;
	state.currentKeyIndent = indent;
	state.valueLines.push(value);
}

/**
 * Handle a standalone key (no `=` sign).
 */
function handleStandaloneKey(
	state: ParseState,
	trimmed: string,
	indent: number,
): void {
	finalizeEntry(state);

	state.currentKey = trimmed;
	state.currentKeyIndent = indent;
	state.valueLines.push("");
}

/**
 * Process a single non-empty line during parsing.
 */
function processLine(
	state: ParseState,
	line: string,
	trimmed: string,
	indent: number,
): void {
	// Set base indentation from first non-empty line
	if (state.baseIndent === null) {
		state.baseIndent = indent;
	}

	const base = state.baseIndent;

	// Check if this line starts a new entry (at/below base level with `=`)
	if (indent <= base && trimmed.includes("=")) {
		startNewEntry(state, trimmed, indent);
	} else if (state.currentKey !== null && indent > state.currentKeyIndent) {
		// Indented more than key - continuation of current value
		state.valueLines.push(line);
	} else if (state.currentKey !== null) {
		// Same or less indentation, no `=` - finalize and treat as standalone key
		handleStandaloneKey(state, trimmed, indent);
	}
}

/**
 * Parse CCL text into flat key-value entries.
 *
 * Algorithm (from https://ccl.tylerbutler.com/parsing-algorithm/):
 * - Lines at base indentation with `=` start new entries
 * - Lines indented MORE than current entry become part of that entry's value
 * - Keys are fully trimmed; values have spaces trimmed (tabs preserved)
 * - Empty lines within a value are preserved
 *
 * @param text - The CCL text to parse
 * @returns A result containing the parsed entries
 */
export function parse(text: string): ParseResult {
	const state: ParseState = {
		entries: [],
		currentKey: null,
		currentKeyIndent: 0,
		valueLines: [],
		baseIndent: null,
	};

	const lines = text.split("\n");

	for (const line of lines) {
		const indent = getIndent(line);
		const trimmed = line.trim();

		// Skip leading empty lines before first content
		if (
			trimmed === "" &&
			state.currentKey === null &&
			state.entries.length === 0
		) {
			continue;
		}

		// Empty line within a value - preserve it
		if (trimmed === "") {
			if (state.currentKey !== null) {
				state.valueLines.push("");
			}
			continue;
		}

		processLine(state, line, trimmed, indent);
	}

	// Finalize last entry
	finalizeEntry(state);

	return { success: true, entries: state.entries };
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
	return ["parse"];
}

/**
 * Get a list of all CCL function names.
 */
export function getAllFunctions(): string[] {
	return ["parse", "parseIndented", "buildHierarchy"];
}
