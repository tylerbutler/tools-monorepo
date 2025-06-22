**@tylerbu/xkcd2-api**

***

# @tylerbu/xkcd2-api

TypeScript APIs used in implementations of xkcd2.com.

See [the API summary](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/docs/README.md) for
an overview of the API.

TypeScript APIs for interacting with XKCD comics and implementing xkcd2.com functionality.

## Remarks

This package provides types and functions for fetching XKCD comic data from the official API
and includes utilities for building comic viewing applications.

## Interfaces

### Comic

Defined in: comic.ts:6
Defined in: [comic.ts:13](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L13)

Comic model representing an XKCD comic with all its metadata.

#### Properties

##### alt?

> `optional` **alt**: `string`

Defined in: comic.ts:8
Defined in: [comic.ts:15](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L15)

The alt text for the comic image

##### day?

> `optional` **day**: `number`

Defined in: comic.ts:10
Defined in: [comic.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L17)

The day of the month the comic was published

##### img?

> `optional` **img**: `string`

Defined in: comic.ts:12
Defined in: [comic.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L19)

The URL of the comic image

##### link?

> `optional` **link**: `URL`

Defined in: comic.ts:14
Defined in: [comic.ts:21](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L21)

A link related to the comic (if any)

##### month?

> `optional` **month**: `number`

Defined in: comic.ts:16
Defined in: [comic.ts:23](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L23)

The month the comic was published

##### news?

> `optional` **news**: `string`

Defined in: comic.ts:18
Defined in: [comic.ts:25](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L25)

News or additional information about the comic

##### num

> **num**: `number`

Defined in: comic.ts:20
Defined in: [comic.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L27)

The comic number/ID (required)

##### safe\_title?

> `optional` **safe\_title**: `string`

Defined in: comic.ts:22
Defined in: [comic.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L29)

A URL-safe version of the comic title

##### title?

> `optional` **title**: `string`

Defined in: comic.ts:24
Defined in: [comic.ts:31](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L31)

The title of the comic

##### transcript?

> `optional` **transcript**: `string`

Defined in: comic.ts:26
Defined in: [comic.ts:33](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L33)

The transcript text of the comic

##### year?

> `optional` **year**: `number`

Defined in: comic.ts:28
Defined in: [comic.ts:35](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L35)

The year the comic was published

***

### ComicFrameProps

Defined in: comic.ts:36
Defined in: [comic.ts:43](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L43)

Properties for rendering a comic frame with navigation information.

#### Properties

##### comic

> **comic**: [`Comic`](#comic)

Defined in: comic.ts:38
Defined in: [comic.ts:45](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L45)

The comic data to display

##### nextId?

> `optional` **nextId**: `string`

Defined in: comic.ts:42
Defined in: [comic.ts:49](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L49)

The ID of the next comic for navigation (if available)

##### previousId

> **previousId**: `string`

Defined in: comic.ts:40
Defined in: [comic.ts:47](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L47)

The ID of the previous comic for navigation

## Functions

### getComicProps()

> **getComicProps**(`comicId?`): `Promise`\<[`ComicFrameProps`](#comicframeprops)\>

Defined in: [comic.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L58)

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

Defined in: [comic.ts:89](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/xkcd2-api/src/comic.ts#L89)

Returns a random comic ID within the bounds of the currently published comics.

#### Returns

`Promise`\<`number`\>
