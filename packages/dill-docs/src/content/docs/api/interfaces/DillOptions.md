---
editUrl: false
next: false
prev: false
title: "DillOptions"
---

Options used to control Dill's behavior.

## Properties

### downloadDir?

> `optional` **downloadDir**: `string`

The directory to download the file. If this path is undefined, then the current working directory will be used.

If provided, this path must be to a directory that exists.

#### Defined in

[api.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L50)

***

### extract?

> `optional` **extract**: `boolean`

If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate). Default value is
false.

#### Defined in

[api.ts:43](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L43)

***

### filename?

> `optional` **filename**: `string`

If provided, the filename to download the file to, including file extensions if applicable. If this is not
provided, the downloaded file will use the name in the Content-Disposition response header, if available. Otherwise
it will use `dill-download.<EXTENSION>`.

#### Defined in

[api.ts:57](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L57)

***

### noFile?

> `optional` **noFile**: `boolean`

If true, the file will not be saved to the file system. The file contents will be returned by the function call,
but it will otherwise not be saved.

#### Defined in

[api.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L63)
