---
editUrl: false
next: false
prev: false
title: "FileHeaderGeneratorConfig"
---

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:33](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L33)

Configuration for generating file headers with specific formatting rules.

## Remarks

This interface extends FileHeaderPolicyConfig and adds formatting-specific
properties to control how headers are inserted into different file types.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

## Properties

### autoGenText?

> `optional` **autoGenText**: `string`

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:21](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L21)

An optional string that will be appended to the headerText.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/).[`autoGenText`](/api/interfaces/fileheaderpolicyconfig/#autogentext)

***

### headerEnd?

> `optional` **headerEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:56](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L56)

Regex matching the header postfix.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### headerStart?

> `optional` **headerStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:41](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L41)

Regex matching header prefix (e.g. `/*!\r?\n`)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### headerText?

> `optional` **headerText**: `string`

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L16)

The text to use as the header.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/).[`headerText`](/api/interfaces/fileheaderpolicyconfig/#headertext)

***

### lineEnd

> **lineEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:51](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L51)

Regex matching the end of each line (e.g., `\r?\n`)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### lineStart

> **lineStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:46](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L46)

Regex matching beginning of each line (e.g. ' * ')

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L36)

Regular expression that matches files this header generator applies to

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### replacer()

> **replacer**: (`content`, `config`) => `string`

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:65](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L65)

Function that generates the properly formatted header content for insertion into files.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### content

`string`

The original file content

##### config

[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)

The file header policy configuration

#### Returns

`string`

The formatted header string to insert
