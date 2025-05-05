---
editUrl: false
next: false
prev: false
title: "DillOptions"
---

Defined in: [api.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L36)

Options used to control dill's behavior.

## Properties

### downloadDir?

> `optional` **downloadDir**: `string`

Defined in: [api.ts:51](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L51)

The directory to download the file. If this path is undefined, then the current working directory will be used.

If provided, this path must be to a directory that exists.

#### Default Value

```ts
current working directory
```

***

### extract?

> `optional` **extract**: `boolean`

Defined in: [api.ts:42](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L42)

If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate).

#### Default Value

`false`

***

### filename?

> `optional` **filename**: `string`

Defined in: [api.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L58)

If provided, the filename to download the file to, including file extensions if applicable. If this is not
provided, the downloaded file will use the name in the Content-Disposition response header, if available. Otherwise
it will use `dill-download.<EXTENSION>`.

***

### noFile?

> `optional` **noFile**: `boolean`

Defined in: [api.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L66)

If true, the file will not be saved to the file system. The file contents will be returned by the function call,
but it will otherwise not be saved. This is useful for testing or when using dill programatically.

#### Default Value

`false`
