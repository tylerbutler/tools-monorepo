---
editUrl: false
next: false
prev: false
title: "PolicyResult"
---

> **PolicyResult** = `true` \| [`PolicyError`](/api/interfaces/policyerror/)

Defined in: [policy.ts:83](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L83)

The result of a policy handler.
Returns `true` if the file passes the policy, or a [PolicyError](/api/interfaces/policyerror/) if it fails.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::
