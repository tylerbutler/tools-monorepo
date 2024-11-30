[**@tylerbu/fundamentals**](README.md) • **Docs**

***

[@tylerbu/fundamentals](README.md) / index

# index

## References

### addAll

Re-exports [addAll](set.md#addall)

### findGitRootSync

Re-exports [findGitRootSync](git.md#findgitrootsync)

### isSorted

Re-exports [isSorted](array.md#issorted)

## Classes

### KeyAlreadySet

**`Beta`**

An error thrown when trying to update an element in a [WriteOnceMap](index.md#writeoncemapk-v) that has already been set.

#### Extends

- `Error`

#### Constructors

##### new KeyAlreadySet()

> **new KeyAlreadySet**(`key`): [`KeyAlreadySet`](index.md#keyalreadyset)

**`Beta`**

###### Parameters

• **key**: `string`

The Map key that was already set.

###### Returns

[`KeyAlreadySet`](index.md#keyalreadyset)

###### Overrides

`Error.constructor`

###### Defined in

[packages/fundamentals/src/writeOnceMap.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/writeOnceMap.ts#L12)

#### Properties

##### cause?

> `optional` **cause**: `unknown`

**`Beta`**

###### Inherited from

`Error.cause`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2022.error.d.ts:24

##### message

> **message**: `string`

**`Beta`**

###### Inherited from

`Error.message`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es5.d.ts:1077

##### name

> **name**: `string`

**`Beta`**

###### Inherited from

`Error.name`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es5.d.ts:1076

##### stack?

> `optional` **stack**: `string`

**`Beta`**

###### Inherited from

`Error.stack`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es5.d.ts:1078

##### prepareStackTrace()?

> `static` `optional` **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Optional override for formatting stack traces

###### Parameters

• **err**: `Error`

• **stackTraces**: `CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

###### Defined in

node\_modules/.pnpm/@types+node@20.16.10/node\_modules/@types/node/globals.d.ts:98

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

**`Beta`**

###### Inherited from

`Error.stackTraceLimit`

###### Defined in

node\_modules/.pnpm/@types+node@20.16.10/node\_modules/@types/node/globals.d.ts:100

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt`?): `void`

**`Beta`**

###### Parameters

• **targetObject**: `object`

• **constructorOpt?**: `Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

###### Defined in

node\_modules/.pnpm/@types+node@20.16.10/node\_modules/@types/node/globals.d.ts:91

***

### WriteOnceMap\<K, V\>

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

**`Beta`**

###### Parameters

• **entries?**: `null` \| readonly readonly [`K`, `V`][]

###### Returns

[`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

###### Inherited from

`Map<K, V>.constructor`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:50

##### new WriteOnceMap()

> **new WriteOnceMap**\<`K`, `V`\>(`iterable`?): [`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

**`Beta`**

###### Parameters

• **iterable?**: `null` \| `Iterable`\<readonly [`K`, `V`]\>

###### Returns

[`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

###### Inherited from

`Map<K, V>.constructor`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:49

#### Properties

##### \[toStringTag\]

> `readonly` **\[toStringTag\]**: `string`

**`Beta`**

###### Inherited from

`Map.[toStringTag]`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:137

##### size

> `readonly` **size**: `number`

**`Beta`**

###### Inherited from

`Map.size`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:45

##### \[species\]

> `readonly` `static` **\[species\]**: `MapConstructor`

**`Beta`**

###### Inherited from

`Map.[species]`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:319

#### Methods

##### \[iterator\]()

> **\[iterator\]**(): `IterableIterator`\<[`K`, `V`]\>

**`Beta`**

###### Returns

`IterableIterator`\<[`K`, `V`]\>

###### Inherited from

`Map.[iterator]`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:119

##### clear()

> **clear**(): `void`

**`Beta`**

###### Returns

`void`

###### Inherited from

`Map.clear`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:20

##### delete()

> **delete**(`key`): `boolean`

**`Beta`**

###### Parameters

• **key**: `K`

###### Returns

`boolean`

true if an element in the Map existed and has been removed, or false if the element does not exist.

###### Inherited from

`Map.delete`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:24

##### entries()

> **entries**(): `IterableIterator`\<[`K`, `V`]\>

**`Beta`**

###### Returns

`IterableIterator`\<[`K`, `V`]\>

###### Inherited from

`Map.entries`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:124

##### forEach()

> **forEach**(`callbackfn`, `thisArg`?): `void`

**`Beta`**

###### Parameters

• **callbackfn**

• **thisArg?**: `any`

###### Returns

`void`

###### Inherited from

`Map.forEach`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:28

##### get()

> **get**(`key`): `undefined` \| `V`

**`Beta`**

###### Parameters

• **key**: `K`

###### Returns

`undefined` \| `V`

Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.

###### Inherited from

`Map.get`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:33

##### has()

> **has**(`key`): `boolean`

**`Beta`**

###### Parameters

• **key**: `K`

###### Returns

`boolean`

boolean indicating whether an element with the specified key exists or not.

###### Inherited from

`Map.has`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.collection.d.ts:37

##### keys()

> **keys**(): `IterableIterator`\<`K`\>

**`Beta`**

###### Returns

`IterableIterator`\<`K`\>

###### Inherited from

`Map.keys`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:129

##### set()

> **set**(`key`, `value`, `force`): [`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

**`Beta`**

###### Parameters

• **key**: `K`

The key to set.

• **value**: `V`

The value to set.

• **force**: `boolean` = `false`

Set to true to force a Map element to be updated whether it has previously been set or not.

###### Returns

[`WriteOnceMap`](index.md#writeoncemapk-v)\<`K`, `V`\>

###### Overrides

`Map.set`

###### Defined in

[packages/fundamentals/src/writeOnceMap.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/fundamentals/src/writeOnceMap.ts#L36)

##### values()

> **values**(): `IterableIterator`\<`V`\>

**`Beta`**

###### Returns

`IterableIterator`\<`V`\>

###### Inherited from

`Map.values`

###### Defined in

node\_modules/.pnpm/typescript@5.5.4/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:134
