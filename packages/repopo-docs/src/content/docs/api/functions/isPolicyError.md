---
editUrl: false
next: false
prev: false
title: "isPolicyError"
---

> **isPolicyError**(`toCheck`): `toCheck is PolicyError`

Defined in: [policy.ts:495](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L495)

Type guard to check if a result is a PolicyError (new format).

## Parameters

### toCheck

`any`

Value to inspect.

## Returns

`toCheck is PolicyError`

Whether the value is a non-null object with a string `error` property.
