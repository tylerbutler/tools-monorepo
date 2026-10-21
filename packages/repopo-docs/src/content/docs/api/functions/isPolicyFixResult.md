---
editUrl: false
next: false
prev: false
title: "isPolicyFixResult"
---

> **isPolicyFixResult**(`toCheck`): `toCheck is PolicyFixResult`

Defined in: [policy.ts:479](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L479)

Type guard to check if a result is a [PolicyFixResult](/api/interfaces/policyfixresult/) (legacy).

:::caution[Deprecated]
Use [isPolicyError](/api/functions/ispolicyerror/) instead when working with the new [PolicyError](/api/interfaces/policyerror/) format.
:::

## Parameters

### toCheck

`any`

Value to inspect.

## Returns

`toCheck is PolicyFixResult`

Whether the value is a non-null object with a `resolved` property.
