**@tylerbu/xkcd2-api**

***

# @tylerbu/xkcd2-api

TypeScript APIs used in implementations of xkcd2.com.

See [the API summary](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/docs/README.md) for
an overview of the API.

## Interfaces

### Comic

Defined in: comic.ts:6

Comic model

#### Properties

##### alt?

> `optional` **alt**: `string`

Defined in: comic.ts:7

##### day?

> `optional` **day**: `number`

Defined in: comic.ts:8

##### img?

> `optional` **img**: `string`

Defined in: comic.ts:9

##### link?

> `optional` **link**: `URL`

Defined in: comic.ts:10

##### month?

> `optional` **month**: `number`

Defined in: comic.ts:11

##### news?

> `optional` **news**: `string`

Defined in: comic.ts:12

##### num

> **num**: `number`

Defined in: comic.ts:13

##### safe\_title?

> `optional` **safe\_title**: `string`

Defined in: comic.ts:14

##### title?

> `optional` **title**: `string`

Defined in: comic.ts:15

##### transcript?

> `optional` **transcript**: `string`

Defined in: comic.ts:16

##### year?

> `optional` **year**: `number`

Defined in: comic.ts:17

***

### ComicFrameProps

Defined in: comic.ts:23

#### Properties

##### comic

> **comic**: [`Comic`](#comic)

Defined in: comic.ts:24

##### nextId?

> `optional` **nextId**: `string`

Defined in: comic.ts:26

##### previousId

> **previousId**: `string`

Defined in: comic.ts:25

## Functions

### getComicProps()

> **getComicProps**(`comicId?`): `Promise`\<[`ComicFrameProps`](#comicframeprops)\>

Defined in: comic.ts:42

#### Parameters

##### comicId?

The ID of the comic to retrieve. If this is not provided, the most recent comic will be returned.

`string` | `number`

#### Returns

`Promise`\<[`ComicFrameProps`](#comicframeprops)\>

The comic metadata.

***

### getRandomComicId()

> **getRandomComicId**(): `Promise`\<`number`\>

Defined in: comic.ts:73

Returns a random comic ID within the bounds of the currently published comics.

#### Returns

`Promise`\<`number`\>
