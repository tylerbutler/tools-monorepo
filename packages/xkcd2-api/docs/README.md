**@tylerbu/xkcd2-api** • **Docs**

***

# @tylerbu/xkcd2-api

TypeScript APIs used in implementations of xkcd2.com.

See [the API summary](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/docs/README.md) for
an overview of the API.

## Interfaces

### Comic

Comic model

#### Properties

##### alt?

> `optional` **alt**: `string`

###### Defined in

[comic.ts:7](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L7)

##### day?

> `optional` **day**: `number`

###### Defined in

[comic.ts:8](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L8)

##### img?

> `optional` **img**: `string`

###### Defined in

[comic.ts:9](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L9)

##### link?

> `optional` **link**: `URL`

###### Defined in

[comic.ts:10](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L10)

##### month?

> `optional` **month**: `number`

###### Defined in

[comic.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L11)

##### news?

> `optional` **news**: `string`

###### Defined in

[comic.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L12)

##### num

> **num**: `number`

###### Defined in

[comic.ts:13](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L13)

##### safe\_title?

> `optional` **safe\_title**: `string`

###### Defined in

[comic.ts:15](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L15)

##### title?

> `optional` **title**: `string`

###### Defined in

[comic.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L16)

##### transcript?

> `optional` **transcript**: `string`

###### Defined in

[comic.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L17)

##### year?

> `optional` **year**: `number`

###### Defined in

[comic.ts:18](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L18)

***

### ComicFrameProps

#### Properties

##### comic

> **comic**: [`Comic`](README.md#comic)

###### Defined in

[comic.ts:25](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L25)

##### nextId?

> `optional` **nextId**: `string`

###### Defined in

[comic.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L27)

##### previousId

> **previousId**: `string`

###### Defined in

[comic.ts:26](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L26)

## Functions

### getComicProps()

> **getComicProps**(`comicId`?): `Promise`\<[`ComicFrameProps`](README.md#comicframeprops)\>

#### Parameters

• **comicId?**: `string` \| `number`

The ID of the comic to retrieve.

#### Returns

`Promise`\<[`ComicFrameProps`](README.md#comicframeprops)\>

The comic metadata.

#### Defined in

[comic.ts:43](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L43)
