/**
 * Checks if an array is sorted according to a provided comparison function.
 *
 * @remarks
 * The function iterates over the array elements, comparing each pair of consecutive elements
 * to determine if they are in the correct order as defined by the comparison function.
 * If any pair of elements is found to be out of order, the function immediately returns false,
 * indicating that the array is not sorted. Otherwise, it returns true.
 *
 * @param arr - The array to check if it is sorted.
 * @param compareFn - A comparison function similar to the comparison function used by Array.prototype.sort.
 * @returns True if the array is sorted according to the comparison function, false otherwise.
 *
 * @beta
 *
 * @example
 * ```ts
 * const numbers = [1, 2, 3, 4, 5];
 * const isNumSorted = isSorted(numbers, (a, b) => a - b);
 * console.log(isNumSorted); // true
 * ```
 *
 * @example
 * ```ts
 * const words = ['apple', 'banana', 'grape'];
 * const isWordsSorted = isSorted(words, (a, b) => a.localeCompare(b));
 * console.log(isWordsSorted); // true
 * ```
 *
 * @privateRemarks
 * The function uses a non-null assertion (!) for `arr[i]` inside the comparison,
 * which is safe in this context because the iteration is over a slice of the original array,
 * ensuring `i` will always be a valid index in the array. However, this might raise linting warnings
 * or errors depending on your project's configuration.
 */
export function isSorted<T>(
	arr: T[],
	compareFn: (a: T, b: T) => number,
): boolean {
	return (
		arr
			// This creates a copy of the array that we will iterate over.
			// By starting at the second item in the array, we can easily create pairs to compare.
			.slice(1)
			// We're iterating over every element in the slice, so the item at i=0 is arr[1].
			// More generally, item === arr[i+1], and arr[i] is the previous item in the array.
			// We check each pair, and if any pair is out of ordered, return immediately
			.every((item, i) => {
				// arr[i] is the previous item in the array.
				// We expect it to be less than or equal the current item, or the array isn't sorted.
				// biome-ignore lint/style/noNonNullAssertion: we're iterating over a slice of arr, so i will always be indexable
				return compareFn(arr[i]!, item) <= 0;
			})
	);
}

/**
 * A comparison function for sorting numbers in ascending order.
 *
 * @param a - First number to compare
 * @param b - Second number to compare
 * @returns Negative if a \< b, positive if a \> b, zero if equal
 *
 * @internal
 */
export const numberSort = (a: number, b: number) => a - b;

/**
 * A comparison function for sorting strings using locale-aware comparison.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns Negative if a < b, positive if a > b, zero if equal
 *
 * @internal
 */
export const wordSort = (a: string, b: string) => a.localeCompare(b);
