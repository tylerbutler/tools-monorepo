---
editUrl: false
next: false
prev: false
title: "isPolicyFailure"
---

> **isPolicyFailure**(`toCheck`): `toCheck is PolicyFailure`

Defined in: [policy.ts:365](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L365)

Type guard to check if a result is a [PolicyFailure](/api/interfaces/policyfailure/) (legacy format).

:::caution[Deprecated]
Use [isPolicyError](/api/functions/ispolicyerror/) instead when working with the new [PolicyError](/api/interfaces/policyerror/) format.
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Parameters

### toCheck

`any`

## Returns

`toCheck is PolicyFailure`
