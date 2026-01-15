/**
 * ccl-ts - TypeScript CCL (Categorical Configuration Language) parser.
 *
 * This package provides a CCL parser implementation in TypeScript.
 * See https://ccl.tylerbutler.com for the CCL specification.
 *
 * @packageDocumentation
 */

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
// Core types
export type {
	CCLObject,
	CCLValue,
	Entry,
	HierarchyResult,
	ParseError,
	ParseResult,
} from "./types.js";
