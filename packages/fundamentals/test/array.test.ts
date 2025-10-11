import { describe, expect, it } from "vitest";

import { isSorted, numberSort, wordSort } from "../src/array.ts";

const unsortedNumbers: number[] = [2, 3, 4, 1, 8, 28, 4, 12];
const sortedNumbers: number[] = [1, 2, 3, 4, 4, 8, 12, 28];
const unsortedStrings: string[] = [
	"pear",
	"apple",
	"orange",
	"banana",
	"persimmon",
];
const sortedStrings: string[] = [
	"apple",
	"banana",
	"orange",
	"pear",
	"persimmon",
];

describe("array APIs", () => {
	describe("isSorted with numberSort", () => {
		it("unsorted numbers return false", () => {
			const actual = isSorted(unsortedNumbers, numberSort);
			expect(actual).toBe(false);
		});

		it("sorted numbers return true", () => {
			const actual = isSorted(sortedNumbers, numberSort);
			expect(actual).toBe(true);
		});
	});

	describe("isSorted with wordSort", () => {
		it("unsorted numbers return false", () => {
			const actual = isSorted(unsortedStrings, wordSort);
			expect(actual).toBe(false);
		});

		it("sorted numbers return true", () => {
			const actual = isSorted(sortedStrings, wordSort);
			expect(actual).toBe(true);
		});
	});
});
