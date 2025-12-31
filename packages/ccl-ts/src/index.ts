/**
 * ccl-ts - TypeScript CCL (Categorical Configuration Language) parser.
 *
 * This package provides a CCL parser implementation in TypeScript.
 * See https://ccl.tylerbutler.com for the CCL specification.
 *
 * @packageDocumentation
 */

// Re-export types from ccl-test-runner-ts for convenience
export type {
	CCLObject,
	CCLValue,
	Entry,
	HierarchyResult,
	ParseError,
	ParseResult,
} from "ccl-test-runner-ts/types";
// CCL functions
export { buildHierarchy, parse } from "./ccl.js";
