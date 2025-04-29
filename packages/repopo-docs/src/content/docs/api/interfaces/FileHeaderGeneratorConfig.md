---
editUrl: false
next: false
prev: false
title: "FileHeaderGeneratorConfig"
---

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:30](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L30)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

## Properties

### autoGenText?

> `optional` **autoGenText**: `string`

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:24](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L24)

An optional string that will be appended to the headerText.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Partial.autoGenText`

***

### headerEnd?

> `optional` **headerEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L52)

Regex matching the header postfix.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### headerStart?

> `optional` **headerStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:37](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L37)

Regex matching header prefix (e.g. `/*!\r?\n`)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### headerText?

> `optional` **headerText**: `string`

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L19)

The text to use as the header.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Partial.headerText`

***

### lineEnd

> **lineEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:47](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L47)

Regex matching the end of each line (e.g., `\r?\n`)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### lineStart

> **lineStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:42](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L42)

Regex matching beginning of each line (e.g. ' * ')

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:32](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L32)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### replacer()

> **replacer**: (`content`, `config`) => `string`

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:54](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L54)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### content

`string`

##### config

[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)

#### Returns

`string`
