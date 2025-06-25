import { describe, expect, it } from "vitest";

import { addAll } from "../src/set.js";

describe("set APIs", () => {
	describe("addAll", () => {
		it("add from array", () => {
			const input = [1, 2, 3];
			const theSet: Set<number> = new Set();
			const actual = [...addAll(theSet, input)];
			for (const item of input) {
				expect(actual).toContain(item);
			}
			expect(actual).toHaveLength(3);
		});

		it("add from generator", () => {
			const input = range(1, 5);
			const theSet: Set<number> = new Set();
			const actual = [...addAll(theSet, input)];
			for (const item of input) {
				expect(actual).toContain(item);
			}
			expect(actual).toHaveLength(5);
		});

		it("handles duplicate inputs", () => {
			const theSet: Set<number> = new Set(range(1, 5));
			const actual = [...addAll(theSet, range(0, 3))];
			for (const item of range(0, 5)) {
				expect(actual).toContain(item);
			}
			expect(actual).toHaveLength(6);
		});
	});
});

/**
 * A generator function that yields integers between two values, inclusive.
 *
 * This function generates a sequence of integers starting from the `start` value
 * and ending at the `end` value, inclusive. It uses a `for` loop to yield each
 * integer in the range.
 *
 * @param start - The starting integer value of the range.
 * @param end - The ending integer value of the range.
 * @yields The next integer in the range from `start` to `end`.
 *
 * @example
 * // Usage example:
 * for (const num of range(1, 5)) {
 *   console.log(num); // Output: 1, 2, 3, 4, 5
 * }
 */
function* range(start: number, end: number): Generator<number, void, unknown> {
	for (let i = start; i <= end; i++) {
		yield i;
	}
}
