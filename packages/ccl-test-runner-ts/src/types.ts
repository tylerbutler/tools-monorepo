// ============================================================================
// Core CCL Types
// ============================================================================
// These types are duplicated from ccl-ts to avoid a cyclic dependency.
// The canonical source of truth is ccl-ts/src/types.ts.
// ============================================================================

import { err, ok, type Result } from "true-myth/result";

export type { Err, Ok } from "true-myth/result";
// Re-export Result types from true-myth
// biome-ignore lint/performance/noBarrelFile: This is an intentional re-export entrypoint
export { err, ok, Result } from "true-myth/result";

// ============================================================================
// Core CCL Types (duplicated from ccl-ts to avoid cyclic dependency)
// ============================================================================

/**
 * A single key-value entry from CCL parsing.
 * Represents a parsed line in CCL format.
 */
export interface Entry {
	key: string;
	value: string;
}

/**
 * Possible values in a CCL object.
 */
export type CCLValue = string | string[] | CCLObject;

/**
 * A nested object structure built from CCL entries.
 */
export interface CCLObject {
	[key: string]: CCLValue;
}

/**
 * Error type for parse operations.
 */
export interface ParseError {
	message: string;
	line?: number;
	column?: number;
}

/**
 * Error type for typed access operations.
 */
export interface AccessError {
	message: string;
	path: string[];
}

// ============================================================================
// Legacy Result Types (for backwards compatibility)
// ============================================================================
// These types are used by the normalization utilities to support implementations
// that return custom result objects instead of true-myth Results.

/**
 * Legacy result type for parse operations.
 * Either returns entries or a parse error.
 *
 * @deprecated Use true-myth Result<Entry[], ParseError> instead
 */
export type ParseResult =
	| { success: true; entries: Entry[] }
	| { success: false; error: ParseError };

/**
 * Legacy result type for buildHierarchy operations.
 * Either returns a CCL object or an error.
 *
 * @deprecated Use true-myth Result<CCLObject, ParseError> instead
 */
export type HierarchyResult =
	| { success: true; object: CCLObject }
	| { success: false; error: ParseError };

// ============================================================================
// Simple Function Types (Throwing Pattern)
// ============================================================================
// These are the function signatures for implementations that throw on errors.

/**
 * Parse function that throws on error.
 */
export type ParseFn = (input: string) => Entry[];

/**
 * Build_hierarchy function that throws on error.
 */
export type BuildHierarchyFn = (entries: Entry[]) => CCLObject;

/**
 * Typed access function that throws on error.
 * Path is specified as variadic arguments: get_string(obj, "server", "host")
 */
export type GetStringFn = (obj: CCLObject, ...pathParts: string[]) => string;
export type GetIntFn = (obj: CCLObject, ...pathParts: string[]) => number;
export type GetBoolFn = (obj: CCLObject, ...pathParts: string[]) => boolean;
export type GetFloatFn = (obj: CCLObject, ...pathParts: string[]) => number;
export type GetListFn = (obj: CCLObject, ...pathParts: string[]) => string[];

/**
 * Filter function.
 */
export type FilterFn = (
	entries: Entry[],
	predicate: (entry: Entry) => boolean,
) => Entry[];

/**
 * Compose function.
 */
export type ComposeFn = (base: Entry[], overlay: Entry[]) => Entry[];

// ============================================================================
// Result-Returning Function Types (true-myth Result Pattern)
// ============================================================================
// These types support implementations that use true-myth Result types.

/**
 * Parse function that returns a true-myth Result.
 */
export type ParseResultFn = (input: string) => Result<Entry[], ParseError>;

/**
 * Build hierarchy function that returns a true-myth Result.
 */
export type BuildHierarchyResultFn = (
	entries: Entry[],
) => Result<CCLObject, ParseError>;

// ============================================================================
// Legacy Result-Returning Function Types (custom result objects)
// ============================================================================
// These types support implementations that return custom { success, ... } objects.

/**
 * Parse function that returns a legacy ParseResult.
 * @deprecated Use ParseResultFn (true-myth Result) instead
 */
export type LegacyParseResultFn = (input: string) => ParseResult;

/**
 * Build hierarchy function that returns a legacy HierarchyResult.
 * @deprecated Use BuildHierarchyResultFn (true-myth Result) instead
 */
export type LegacyBuildHierarchyResultFn = (
	entries: Entry[],
) => HierarchyResult;

// ============================================================================
// Union Types (Accept Any Pattern)
// ============================================================================

/**
 * Parse function accepting throwing, true-myth Result, or legacy result pattern.
 */
export type AnyParseFn = ParseFn | ParseResultFn | LegacyParseResultFn;

/**
 * Build hierarchy function accepting any pattern.
 */
export type AnyBuildHierarchyFn =
	| BuildHierarchyFn
	| BuildHierarchyResultFn
	| LegacyBuildHierarchyResultFn;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a true-myth Result.
 */
export function isResult<T, E>(value: unknown): value is Result<T, E> {
	return (
		typeof value === "object" &&
		value !== null &&
		("isOk" in value || "isErr" in value) &&
		typeof (value as Result<T, E>).isOk === "boolean"
	);
}

/**
 * Check if a value is a legacy ParseResult (has success property).
 */
export function isLegacyParseResult(value: unknown): value is ParseResult {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		typeof (value as ParseResult).success === "boolean" &&
		!("isOk" in value) // Not a true-myth Result
	);
}

/**
 * Check if a value is a legacy HierarchyResult.
 */
export function isLegacyHierarchyResult(
	value: unknown,
): value is HierarchyResult {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		typeof (value as HierarchyResult).success === "boolean" &&
		!("isOk" in value) // Not a true-myth Result
	);
}

/**
 * Check if a value is a ParseResult (legacy).
 * @deprecated Use isLegacyParseResult or isResult instead
 */
export function isParseResult(value: unknown): value is ParseResult {
	return isLegacyParseResult(value);
}

/**
 * Check if a value is a HierarchyResult (legacy).
 * @deprecated Use isLegacyHierarchyResult or isResult instead
 */
export function isHierarchyResult(value: unknown): value is HierarchyResult {
	return isLegacyHierarchyResult(value);
}

// ============================================================================
// Normalization Utilities
// ============================================================================
// These utilities normalize any function pattern to a consistent Result type.

/**
 * Normalize a parse function to always return a true-myth Result.
 * Handles:
 * - Throwing functions (wraps in try/catch)
 * - true-myth Result-returning functions (pass through)
 * - Legacy ParseResult-returning functions (converts to Result)
 */
export function normalizeParseFunction(
	fn: AnyParseFn,
): (input: string) => Result<Entry[], ParseError> {
	return (input: string): Result<Entry[], ParseError> => {
		try {
			const result = fn(input);

			// Check if it's a true-myth Result
			if (isResult<Entry[], ParseError>(result)) {
				return result;
			}

			// Check if it's a legacy ParseResult
			if (isLegacyParseResult(result)) {
				if (result.success) {
					return ok(result.entries);
				}
				return err(result.error);
			}

			// Otherwise it's Entry[], wrap in ok()
			return ok(result as Entry[]);
		} catch (error) {
			return err({
				message: error instanceof Error ? error.message : String(error),
			});
		}
	};
}

/**
 * Normalize a build_hierarchy function to always return a true-myth Result.
 * Handles:
 * - Throwing functions (wraps in try/catch)
 * - true-myth Result-returning functions (pass through)
 * - Legacy HierarchyResult-returning functions (converts to Result)
 */
export function normalizeBuildHierarchyFunction(
	fn: AnyBuildHierarchyFn,
): (entries: Entry[]) => Result<CCLObject, ParseError> {
	return (entries: Entry[]): Result<CCLObject, ParseError> => {
		try {
			const result = fn(entries);

			// Check if it's a true-myth Result
			if (isResult<CCLObject, ParseError>(result)) {
				return result;
			}

			// Check if it's a legacy HierarchyResult
			if (isLegacyHierarchyResult(result)) {
				if (result.success) {
					return ok(result.object);
				}
				return err(result.error);
			}

			// Otherwise it's CCLObject, wrap in ok()
			return ok(result as CCLObject);
		} catch (error) {
			return err({
				message: error instanceof Error ? error.message : String(error),
			});
		}
	};
}
