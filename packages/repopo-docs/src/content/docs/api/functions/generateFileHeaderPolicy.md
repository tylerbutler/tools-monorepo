---
editUrl: false
next: false
prev: false
title: "generateFileHeaderPolicy"
---

> **generateFileHeaderPolicy**(`name`, `config`): [`RepoPolicy`](/api/interfaces/repopolicy/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

Defined in: [policyGenerators/generateFileHeaderPolicy.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generateFileHeaderPolicy.ts#L59)

Given a [FileHeaderGeneratorConfig](../../../../../../api/interfaces/fileheadergeneratorconfig) produces a function that detects correct file headers
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

[`RepoPolicy`](/api/interfaces/repopolicy/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>
