---
editUrl: false
next: false
prev: false
title: "DillOptions"
---

Defined in: [types.ts:8](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L8)

Options used to control dill's behavior.

## Properties

### downloadDir?

> `optional` **downloadDir**: `string`

Defined in: [types.ts:21](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L21)

The directory to download the file. If undefined, uses the current working directory.
Must be an existing directory if provided.

#### Default Value

```ts
current working directory
```

***

### extract?

> `optional` **extract**: `boolean`

Defined in: [types.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L14)

If set to `true`, try extracting the file using [`fflate`](https://www.npmjs.com/package/fflate).

#### Default Value

`false`

***

### filename?

> `optional` **filename**: `string`

Defined in: [types.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L27)

The filename to download the file to, including extensions.
If not provided, uses Content-Disposition header or `dill-download.<EXTENSION>`.

***

### noFile?

> `optional` **noFile**: `boolean`

Defined in: [types.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L34)

If true, the file will not be saved to the file system.
Useful for testing or programmatic use.

#### Default Value

`false`
