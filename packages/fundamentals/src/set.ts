/**
 * Adds all elements from an iterable collection to a specified set.
 *
 * @remarks
 * This function iterates over all elements in the provided iterable collection
 * and adds each element to the specified set. It is a generic function that can
 * work with any type of elements as long as the set and the iterable collection
 * contain elements of the same type. After all elements from the iterable have
 * been added to the set, the modified set is returned, allowing for chaining or
 * further manipulation.
 *
 * @param theSet - The set to which elements from the iterable will be added. This set
 *                 will be modified in place and also returned by the function.
 * @param items - An iterable collection of elements to be added to the set. This could
 *                be an array, another set, or any object implementing the Iterable
 *                interface.
 * @returns The modified set with the new elements added.
 *
 * @typeParam T - The type of elements in the set and iterable collection.
 *
 * @example
 * // Example usage with a set of numbers and an array
 * const numberSet = new Set<number>();
 * addAll(numberSet, [1, 2, 3]);
 * console.log(numberSet); // Output: Set { 1, 2, 3 }
 *
 * @example
 * // Example usage with a set of strings and another set
 * const stringSet = new Set<string>(['hello']);
 * addAll(stringSet, new Set<string>(['world']));
 * console.log(stringSet); // Output: Set { 'hello', 'world' }
 */
export function addAll<T>(theSet: Set<T>, items: Iterable<T>): Set<T> {
	for (const item of items) {
		theSet.add(item);
	}
	return theSet;
}
