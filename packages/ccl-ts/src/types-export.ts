/**
 * CCL type exports with Result types from true-myth.
 *
 * This entrypoint provides all CCL types and the Result type utilities
 * for functional error handling. Import from 'ccl-ts/types' to use.
 *
 * @example
 * ```typescript
 * import { Entry, CCLObject, Result, ok, err } from 'ccl-ts/types';
 * ```
 *
 * @packageDocumentation
 */

export type { Err, Ok } from "true-myth/result";

// Result types from true-myth
// biome-ignore lint/performance/noBarrelFile: This is an intentional re-export entrypoint
export { err, ok, Result } from "true-myth/result";
// Core CCL types
export type {
	AccessError,
	CCLObject,
	CCLValue,
	Entry,
	ParseError,
} from "./types.js";
