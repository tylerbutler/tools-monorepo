[**@tylerbu/fundamentals**](README.md)

***

[@tylerbu/fundamentals](README.md) / array

# array

## Functions

### isSorted()

> **isSorted**\<`T`\>(`arr`, `compareFn`): `boolean`

Defined in: [packages/fundamentals/src/array.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/array.ts#L36)

**`Beta`**

Checks if an array is sorted according to a provided comparison function.

#### Type Parameters

##### T

`T`

#### Parameters

##### arr

`T`[]

The array to check if it is sorted.

##### compareFn

(`a`, `b`) => `number`

A comparison function similar to the comparison function used by Array.prototype.sort.

#### Returns

`boolean`

True if the array is sorted according to the comparison function, false otherwise.

#### Remarks

The function iterates over the array elements, comparing each pair of consecutive elements
to determine if they are in the correct order as defined by the comparison function.
If any pair of elements is found to be out of order, the function immediately returns false,
indicating that the array is not sorted. Otherwise, it returns true.

#### Examples

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

***

### numberSort()

> **numberSort**(`a`, `b`): `number`

Defined in: [packages/fundamentals/src/array.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/array.ts#L66)

**`Internal`**

A comparison function for sorting numbers in ascending order.

#### Parameters

##### a

`number`

First number to compare

##### b

`number`

Second number to compare

#### Returns

`number`

Negative if a \< b, positive if a \> b, zero if equal

***

### wordSort()

> **wordSort**(`a`, `b`): `number`

Defined in: [packages/fundamentals/src/array.ts:77](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/array.ts#L77)

**`Internal`**

A comparison function for sorting strings using locale-aware comparison.

#### Parameters

##### a

`string`

First string to compare

##### b

`string`

Second string to compare

#### Returns

`number`

Negative if a \< b, positive if a \> b, zero if equal
