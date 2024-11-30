---
editUrl: false
next: false
prev: false
title: "DillOptions"
---

Options used to control dill's behavior.

## Properties

### downloadDir?

> `optional` **downloadDir**: `string`

The directory to download the file. If this path is undefined, then the current working directory will be used.

If provided, this path must be to a directory that exists.

#### Defined in

[api.ts:51](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L51)

***

### extract?

> `optional` **extract**: `boolean`

If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate).

#### Default Value

`false`

#### Defined in

[api.ts:44](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L44)

***

### filename?

> `optional` **filename**: `string`

If provided, the filename to download the file to, including file extensions if applicable. If this is not
provided, the downloaded file will use the name in the Content-Disposition response header, if available. Otherwise
it will use `dill-download.<EXTENSION>`.

#### Defined in

[api.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L58)

***

### noFile?

> `optional` **noFile**: `boolean`

If true, the file will not be saved to the file system. The file contents will be returned by the function call,
but it will otherwise not be saved.

#### Default Value

`false`

#### Defined in

[api.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L66)
