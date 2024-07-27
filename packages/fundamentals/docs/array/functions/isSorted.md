[**@tylerbu/fundamentals**](../../README.md) • **Docs**

***

[@tylerbu/fundamentals](../../modules.md) / [array](../README.md) / isSorted

# Function: isSorted()

> **isSorted**\<`T`\>(`arr`, `compareFn`): `boolean`

**`Beta`**

Checks if an array is sorted according to a provided comparison function.

## Type Parameters

• **T**

## Parameters

• **arr**: `T`[]

The array to check if it is sorted.

• **compareFn**

A comparison function similar to the comparison function used by Array.prototype.sort.

## Returns

`boolean`

True if the array is sorted according to the comparison function, false otherwise.

## Remarks

The function iterates over the array elements, comparing each pair of consecutive elements
to determine if they are in the correct order as defined by the comparison function.
If any pair of elements is found to be out of order, the function immediately returns false,
indicating that the array is not sorted. Otherwise, it returns true.

## Examples

```ts
const numbers = [1, 2, 3, 4, 5];
const isNumSorted = isSorted(numbers, (a, b) => a - b);
console.log(isNumSorted); // true
```

```ts
const words = ['apple', 'banana', 'grape'];
const isWordsSorted = isSorted(words, (a, b) => a.localeCompare(b));
console.log(isWordsSorted); // true
```

## Defined in

[array.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/e5c9b5f5c8bbad1b778226ca5d92ed07cf78f962/packages/fundamentals/src/array.ts#L36)
