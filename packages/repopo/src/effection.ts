import type { Operation } from "effection";

/**
 * Type guard to check if a value is an Effection Operation.
 * Based on the Operation interface: must have Symbol.iterator that returns an Iterator.
 *
 * @alpha
 */
// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isOperation(value: any): value is Operation<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		Symbol.iterator in value &&
		typeof value[Symbol.iterator] === "function"
	);
}