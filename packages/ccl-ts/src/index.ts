/**
 * ccl-ts - TypeScript CCL (Categorical Configuration Language) parser.
 *
 * This package provides a CCL parser implementation in TypeScript.
 * See https://ccl.tylerbutler.com for the CCL specification.
 *
 * Types and Result utilities can be imported from 'ccl-ts/types':
 * @example
 * ```typescript
 * import { Entry, CCLObject, Result, ok, err } from 'ccl-ts/types';
 * ```
 *
 * @packageDocumentation
 */

// Re-export Result types from true-myth for convenience
export type { Err, Ok, Result } from "true-myth/result";
// CCL functions
export {
	buildHierarchy,
	canonicalFormat,
	getBool,
	getFloat,
	getInt,
	getList,
	getString,
	parse,
	print,
} from "./ccl.js";
// Re-export types that are used in function signatures
export type {
	AccessError,
	CCLObject,
	CCLValue,
	Entry,
	ParseError,
} from "./types.js";
