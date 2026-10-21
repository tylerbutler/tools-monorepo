---
editUrl: false
next: false
prev: false
title: "isPolicyFailure"
---

> **isPolicyFailure**(`toCheck`): `toCheck is PolicyFailure`

Defined in: [policy.ts:513](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L513)

Type guard to check if a result is a [PolicyFailure](/api/interfaces/policyfailure/) (legacy format).

:::caution[Deprecated]
Use [isPolicyError](/api/functions/ispolicyerror/) instead when working with the new [PolicyError](/api/interfaces/policyerror/) format.
:::

## Parameters

### toCheck

`any`

Value to inspect.

## Returns

`toCheck is PolicyFailure`

Whether the value is a non-null object with an `errorMessages` array.
