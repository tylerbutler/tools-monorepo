---
editUrl: false
next: false
prev: false
title: "PolicyInstanceSettings"
---

Defined in: [policy.ts:425](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L425)

Settings for configuring a policy instance.

## Type Parameters

### C

`C`

## Properties

### config?

> `optional` **config?**: `C`

Defined in: [policy.ts:443](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L443)

The config that is applied to the policy instance.

***

### excludeFiles?

> `optional` **excludeFiles?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:438](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L438)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from policy.

Paths will be matched relative to the root of the repo.
Strings are case-insensitive regular expressions; RegExp values retain their flags.

***

### instanceId?

> `optional` **instanceId?**: `string`

Defined in: [policy.ts:429](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L429)

A stable identifier for this configured policy instance.
