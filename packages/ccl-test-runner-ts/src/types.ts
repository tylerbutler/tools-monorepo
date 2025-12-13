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
 * Result type for parse operations.
 * Either returns entries or a parse error.
 */
export type ParseResult =
	| { success: true; entries: Entry[] }
	| { success: false; error: ParseError };

/**
 * Result type for buildHierarchy operations.
 * Either returns a CCL object or an error.
 */
export type HierarchyResult =
	| { success: true; object: CCLObject }
	| { success: false; error: ParseError };
