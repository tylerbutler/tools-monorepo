[**@tylerbu/fundamentals**](README.md)

***

[@tylerbu/fundamentals](README.md) / index

# index

## Classes

### KeyAlreadySet

Defined in: [packages/fundamentals/src/writeOnceMap.ts:6](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/writeOnceMap.ts#L6)

**`Beta`**

An error thrown when trying to update an element in a [WriteOnceMap](index.md#writeoncemapk-v) that has already been set.

#### Extends

- `Error`

#### Constructors

##### new KeyAlreadySet()

> **new KeyAlreadySet**(`key`): [`KeyAlreadySet`](index.md#keyalreadyset)

Defined in: [packages/fundamentals/src/writeOnceMap.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/writeOnceMap.ts#L12)

**`Beta`**

###### Parameters

###### key

`string`

The Map key that was already set.

###### Returns

[`KeyAlreadySet`](index.md#keyalreadyset)

###### Overrides

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause**: `unknown`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2022.error.d.ts:24

**`Beta`**

###### Inherited from

`Error.cause`

##### message

> **message**: `string`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es5.d.ts:1077

**`Beta`**

###### Inherited from

`Error.message`

##### name

> **name**: `string`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es5.d.ts:1076

**`Beta`**

###### Inherited from

`Error.name`

##### stack?

> `optional` **stack**: `string`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es5.d.ts:1078

**`Beta`**

###### Inherited from

`Error.stack`

##### prepareStackTrace()?

> `static` `optional` **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Defined in: node\_modules/.pnpm/@types+node@20.16.10/node\_modules/@types/node/globals.d.ts:98

**`Beta`**

Optional override for formatting stack traces

###### Parameters

###### err

`Error`

###### stackTraces

`CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: node\_modules/.pnpm/@types+node@20.16.10/node\_modules/@types/node/globals.d.ts:100

**`Beta`**

###### Inherited from

`Error.stackTraceLimit`

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt`?): `void`

Defined in: node\_modules/.pnpm/@types+node@20.16.10/node\_modules/@types/node/globals.d.ts:91

**`Beta`**

###### Parameters

###### targetObject

`object`

###### constructorOpt?

`Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

***

### WriteOnceMap\<K, V\>

Defined in: [packages/fundamentals/src/writeOnceMap.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/writeOnceMap.ts#L27)

**`Beta`**

A WriteOnceMap is a Map whose keys can only be written once. Once a key is set, subsequent attempts to update it will
throw a [KeyAlreadySet](index.md#keyalreadyset) error unless the `force` parameter is used.

#### Extends

- `Map`\<`K`, `V`\>

#### Type Parameters

• **K**

type of the Map key.

• **V**

type of the Map value.

#### Constructors

##### new WriteOnceMap()

> **new WriteOnceMap**\<`K`, `V`\>(`entries`?): [`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:50

**`Beta`**

###### Parameters

###### entries?

`null` | readonly readonly \[`K`, `V`\][]

###### Returns

[`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

###### Inherited from

`Map<K, V>.constructor`

##### new WriteOnceMap()

> **new WriteOnceMap**\<`K`, `V`\>(`iterable`?): [`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:49

**`Beta`**

###### Parameters

###### iterable?

`null` | `Iterable`\<readonly \[`K`, `V`\]\>

###### Returns

[`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

###### Inherited from

`Map<K, V>.constructor`

#### Properties

##### \[toStringTag\]

> `readonly` **\[toStringTag\]**: `string`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:137

**`Beta`**

###### Inherited from

`Map.[toStringTag]`

##### size

> `readonly` **size**: `number`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:45

**`Beta`**

###### Returns

the number of elements in the Map.

###### Inherited from

`Map.size`

##### \[species\]

> `readonly` `static` **\[species\]**: `MapConstructor`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:319

**`Beta`**

###### Inherited from

`Map.[species]`

#### Methods

##### \[iterator\]()

> **\[iterator\]**(): `IterableIterator`\<\[`K`, `V`\]\>

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:119

**`Beta`**

###### Returns

`IterableIterator`\<\[`K`, `V`\]\>

###### Inherited from

`Map.[iterator]`

##### clear()

> **clear**(): `void`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:20

**`Beta`**

###### Returns

`void`

###### Inherited from

`Map.clear`

##### delete()

> **delete**(`key`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:24

**`Beta`**

###### Parameters

###### key

`K`

###### Returns

`boolean`

true if an element in the Map existed and has been removed, or false if the element does not exist.

###### Inherited from

`Map.delete`

##### entries()

> **entries**(): `IterableIterator`\<\[`K`, `V`\]\>

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:124

**`Beta`**

###### Returns

`IterableIterator`\<\[`K`, `V`\]\>

###### Inherited from

`Map.entries`

##### forEach()

> **forEach**(`callbackfn`, `thisArg`?): `void`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:28

**`Beta`**

###### Parameters

###### callbackfn

(`value`, `key`, `map`) => `void`

###### thisArg?

`any`

###### Returns

`void`

###### Inherited from

`Map.forEach`

##### get()

> **get**(`key`): `undefined` \| `V`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:33

**`Beta`**

###### Parameters

###### key

`K`

###### Returns

`undefined` \| `V`

Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.

###### Inherited from

`Map.get`

##### has()

> **has**(`key`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:37

**`Beta`**

###### Parameters

###### key

`K`

###### Returns

`boolean`

boolean indicating whether an element with the specified key exists or not.

###### Inherited from

`Map.has`

##### keys()

> **keys**(): `IterableIterator`\<`K`\>

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:129

**`Beta`**

###### Returns

`IterableIterator`\<`K`\>

###### Inherited from

`Map.keys`

##### set()

> **set**(`key`, `value`, `force`): [`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

Defined in: [packages/fundamentals/src/writeOnceMap.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/writeOnceMap.ts#L36)

**`Beta`**

###### Parameters

###### key

`K`

The key to set.

###### value

`V`

The value to set.

###### force

`boolean` = `false`

Set to true to force a Map element to be updated whether it has previously been set or not.

###### Returns

[`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

###### Overrides

`Map.set`

##### values()

> **values**(): `IterableIterator`\<`V`\>

Defined in: node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:134

**`Beta`**

###### Returns

`IterableIterator`\<`V`\>

###### Inherited from

`Map.values`

## References

### addAll

Re-exports [addAll](set.md#addall)

### findGitRootSync

Re-exports [findGitRootSync](git.md#findgitrootsync)

### isSorted

Re-exports [isSorted](array.md#issorted)
