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

### headers?

> `optional` **headers**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: [types.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L40)

Custom headers to include in the fetch request.
Specify as an object with header name-value pairs.

***

### noFile?

> `optional` **noFile**: `boolean`

Defined in: [types.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L34)

If true, the file will not be saved to the file system.
Useful for testing or programmatic use.

#### Default Value

`false`

***

### strip?

> `optional` **strip**: `number`

Defined in: [types.ts:47](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/src/types.ts#L47)

Number of leading path components to strip from file names during extraction.
Only applies when extract is true.

#### Default Value

`0`
