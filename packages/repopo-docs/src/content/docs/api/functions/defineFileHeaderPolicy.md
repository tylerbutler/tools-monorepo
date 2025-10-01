---
editUrl: false
next: false
prev: false
title: "defineFileHeaderPolicy"
---

> **defineFileHeaderPolicy**(`name`, `config`): [`PolicyDefinition`](/api/interfaces/policydefinition/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L63)

Given a [FileHeaderPolicyConfig](/api/interfaces/fileheaderpolicyconfig/), produces a function that detects correct file headers
and returns an error string if the header is missing or incorrect.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Parameters

### name

`string`

### config

[`FileHeaderGeneratorConfig`](/api/interfaces/fileheadergeneratorconfig/)

## Returns

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>
