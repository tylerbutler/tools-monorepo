/**
 * A key-value entry from parsing CCL text.
 * This is the output of the `parse` function.
 */
export interface Entry {
	/** The key portion of the entry */
	key: string;
	/** The value portion of the entry (always a string in flat parsing) */
	value: string;
}

/**
 * Recursive CCL object type representing the output of `buildHierarchy`.
 * Values can be:
 * - string: A leaf value
 * - string[]: An array of values (from duplicate keys)
 * - CCLObject: A nested object
 */
export type CCLValue = string | string[] | CCLObject;

/**
 * A CCL object is a record of string keys to CCL values.
 * This is the output of the `buildHierarchy` function.
 */
export interface CCLObject {
	[key: string]: CCLValue;
}

/**
 * Parse error that can occur when parsing CCL text.
 */
export interface ParseError {
	/** Error message */
	message: string;
	/** Line number where the error occurred (1-indexed) */
	line?: number;
	/** Column number where the error occurred (1-indexed) */
	column?: number;
}

/**
 * Result type for parse operations (internal use).
 * Either returns entries or a parse error.
 */
export type ParseResult =
	| { success: true; entries: Entry[] }
	| { success: false; error: ParseError };

/**
 * Result type for buildHierarchy operations (internal use).
 * Either returns a CCL object or an error.
 */
export type HierarchyResult =
	| { success: true; object: CCLObject }
	| { success: false; error: ParseError };

// ============================================================================
// Simple Function Types (Recommended API)
// ============================================================================
// These are the recommended function signatures for CCL implementations.
// Functions should throw on errors (standard JS/TS pattern).

/**
 * Simple parse function that throws on error.
 * This is the recommended API for CCL implementations.
 */
export type ParseFn = (input: string) => Entry[];

/**
 * Simple build_hierarchy function that throws on error.
 */
export type BuildHierarchyFn = (entries: Entry[]) => CCLObject;

/**
 * Simple typed access function that throws on error.
 */
export type GetStringFn = (obj: CCLObject, path: string) => string;
export type GetIntFn = (obj: CCLObject, path: string) => number;
export type GetBoolFn = (obj: CCLObject, path: string) => boolean;
export type GetFloatFn = (obj: CCLObject, path: string) => number;
export type GetListFn = (obj: CCLObject, path: string) => string[];

/**
 * Simple filter function.
 */
export type FilterFn = (
	entries: Entry[],
	predicate: (entry: Entry) => boolean,
) => Entry[];

/**
 * Simple compose function.
 */
export type ComposeFn = (base: Entry[], overlay: Entry[]) => Entry[];

// ============================================================================
// Result-Returning Function Types (Alternative API)
// ============================================================================
// These types support implementations that prefer explicit Result types.

/**
 * Parse function that returns a Result.
 */
export type ParseResultFn = (input: string) => ParseResult;

/**
 * Build hierarchy function that returns a Result.
 */
export type BuildHierarchyResultFn = (entries: Entry[]) => HierarchyResult;

// ============================================================================
// Union Types (Accept Either Pattern)
// ============================================================================

/**
 * Parse function accepting either throwing or Result-returning pattern.
 */
export type AnyParseFn = ParseFn | ParseResultFn;

/**
 * Build hierarchy function accepting either pattern.
 */
export type AnyBuildHierarchyFn = BuildHierarchyFn | BuildHierarchyResultFn;

// ============================================================================
// Normalization Utilities
// ============================================================================

/**
 * Check if a value is a ParseResult (has success property).
 */
export function isParseResult(value: unknown): value is ParseResult {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		typeof (value as ParseResult).success === "boolean"
	);
}

/**
 * Check if a value is a HierarchyResult.
 */
export function isHierarchyResult(value: unknown): value is HierarchyResult {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		typeof (value as HierarchyResult).success === "boolean"
	);
}

/**
 * Normalize a parse function to always return ParseResult.
 * Wraps throwing functions in try/catch.
 */
export function normalizeParseFunction(fn: AnyParseFn): ParseResultFn {
	return (input: string): ParseResult => {
		try {
			const result = fn(input);

			// If it's already a ParseResult, return it
			if (isParseResult(result)) {
				return result;
			}

			// Otherwise it's Entry[], wrap in success result
			return { success: true, entries: result };
		} catch (error) {
			return {
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	};
}

/**
 * Normalize a build_hierarchy function to always return HierarchyResult.
 */
export function normalizeBuildHierarchyFunction(
	fn: AnyBuildHierarchyFn,
): BuildHierarchyResultFn {
	return (entries: Entry[]): HierarchyResult => {
		try {
			const result = fn(entries);

			// If it's already a HierarchyResult, return it
			if (isHierarchyResult(result)) {
				return result;
			}

			// Otherwise it's CCLObject, wrap in success result
			return { success: true, object: result };
		} catch (error) {
			return {
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	};
}
