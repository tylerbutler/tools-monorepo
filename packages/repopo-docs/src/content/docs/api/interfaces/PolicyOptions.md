---
editUrl: false
next: false
prev: false
title: "PolicyOptions"
---

Defined in: [makePolicy.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L29)

Options for configuring a policy instance.

## Properties

### exclude?

> `optional` **exclude?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [makePolicy.ts:43](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L43)

File paths matching these patterns will be excluded from this policy.
Patterns are matched against repo-relative paths.
Strings are case-insensitive regular expressions, not globs.
RegExp values retain their explicit flags.

***

### instanceId?

> `optional` **instanceId?**: `string`

Defined in: [makePolicy.ts:35](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L35)

A stable identifier for this configured policy instance.

This is required when the same policy definition is configured more than once.
