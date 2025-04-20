---
editUrl: false
next: false
prev: false
title: "dill-cli"
---

# dill API

## Interfaces

### DillOptions

Defined in: [api.ts:38](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L38)

Options used to control dill's behavior.

#### Properties

##### downloadDir?

> `optional` **downloadDir**: `string`

Defined in: [api.ts:51](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L51)

The directory to download the file. If this path is undefined, then the current working directory will be used.

If provided, this path must be to a directory that exists.

##### extract?

> `optional` **extract**: `boolean`

Defined in: [api.ts:44](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L44)

If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate).

###### Default Value

`false`

##### filename?

> `optional` **filename**: `string`

Defined in: [api.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L58)

If provided, the filename to download the file to, including file extensions if applicable. If this is not
provided, the downloaded file will use the name in the Content-Disposition response header, if available. Otherwise
it will use `dill-download.<EXTENSION>`.

##### noFile?

> `optional` **noFile**: `boolean`

Defined in: [api.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L66)

If true, the file will not be saved to the file system. The file contents will be returned by the function call,
but it will otherwise not be saved.

###### Default Value

`false`

***

### DownloadResponse

Defined in: [api.ts:93](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L93)

A response returned by the `download` function.

#### Properties

##### data

> **data**: [`Uint8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)

Defined in: [api.ts:97](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L97)

The raw file data.

##### writtenTo

> **writtenTo**: `undefined` \| `string`

Defined in: [api.ts:102](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L102)

The path that the downloaded file(s) were written to.

## Functions

### download()

> **download**(`url`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`DownloadResponse`](/api/readme/#downloadresponse)\>

Defined in: [api.ts:113](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L113)

Downloads a file from a URL.

#### Parameters

##### url

The URL to download.

`string` | `URL`

##### options?

[`DillOptions`](/api/readme/#dilloptions)

Options to use.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`DownloadResponse`](/api/readme/#downloadresponse)\>
