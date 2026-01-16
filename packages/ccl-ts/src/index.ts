/**
 * ccl-ts - TypeScript CCL (Categorical Configuration Language) parser.
 *
 * This package provides a CCL parser implementation in TypeScript.
 * See https://ccl.tylerbutler.com for the CCL specification.
 *
 * All functions that can fail return Result types from true-myth.
 * Use `.isOk` / `.isErr` to check success, or `.match()` for pattern matching.
 *
 * @packageDocumentation
 */

export type { Err, Ok } from "true-myth/result";
// Re-export Result types and constructors from true-myth for convenience
export { err, ok, Result } from "true-myth/result";
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
