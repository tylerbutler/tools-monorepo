---
editUrl: false
next: false
prev: false
title: "FileHeaderGeneratorConfig"
---

Defined in: policyDefiners/defineFileHeaderPolicy.ts:30

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

## Properties

### autoGenText?

> `optional` **autoGenText**: `string`

Defined in: policyDefiners/defineFileHeaderPolicy.ts:24

An optional string that will be appended to the headerText.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Partial.autoGenText`

***

### headerEnd?

> `optional` **headerEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:52

Regex matching the header postfix.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### headerStart?

> `optional` **headerStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:37

Regex matching header prefix (e.g. `/*!\r?\n`)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### headerText?

> `optional` **headerText**: `string`

Defined in: policyDefiners/defineFileHeaderPolicy.ts:19

The text to use as the header.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Partial.headerText`

***

### lineEnd

> **lineEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:47

Regex matching the end of each line (e.g., `\r?\n`)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### lineStart

> **lineStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:42

Regex matching beginning of each line (e.g. ' * ')

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:32

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### replacer()

> **replacer**: (`content`, `config`) => `string`

Defined in: policyDefiners/defineFileHeaderPolicy.ts:54

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
