---
editUrl: false
next: false
prev: false
title: "FileHeaderGeneratorConfig"
---

Defined in: policyDefiners/defineFileHeaderPolicy.ts:35

Configuration for generating file headers with specific formatting rules.

## Remarks

This interface extends FileHeaderPolicyConfig and adds formatting-specific
properties to control how headers are inserted into different file types.

## Extends

- [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/)\>

## Properties

### autoGenText?

> `optional` **autoGenText?**: `string`

Defined in: policyDefiners/defineFileHeaderPolicy.ts:23

An optional string that will be appended to the headerText.

#### Inherited from

[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/).[`autoGenText`](/api/index/interfaces/fileheaderpolicyconfig/#autogentext)

***

### headerEnd?

> `optional` **headerEnd?**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:58

Regex matching the header postfix.

***

### headerStart?

> `optional` **headerStart?**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:43

Regex matching the header prefix, such as a block-comment opener.

***

### headerText?

> `optional` **headerText?**: `string`

Defined in: policyDefiners/defineFileHeaderPolicy.ts:18

The text to use as the header.

#### Inherited from

[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/).[`headerText`](/api/index/interfaces/fileheaderpolicyconfig/#headertext)

***

### lineEnd

> **lineEnd**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:53

Regex matching the end of each line (e.g., `\r?\n`)

***

### lineStart

> **lineStart**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:48

Regex matching beginning of each line (e.g. ' * ')

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: policyDefiners/defineFileHeaderPolicy.ts:38

Regular expression that matches files this header generator applies to

***

### replacer

> **replacer**: (`content`, `config`) => `string`

Defined in: policyDefiners/defineFileHeaderPolicy.ts:67

Function that generates the properly formatted header content for insertion into files.

#### Parameters

##### content

`string`

The original file content

##### config

[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/)

The file header policy configuration

#### Returns

`string`

The formatted header string to insert
