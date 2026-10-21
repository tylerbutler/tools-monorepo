---
editUrl: false
next: false
prev: false
title: "PolicyResult"
---

> **PolicyResult** = `true` \| [`PolicyError`](/api/interfaces/policyerror/)

Defined in: [policy.ts:92](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L92)

The result of a policy handler.
Returns `true` if the file passes the policy, or a [PolicyError](/api/interfaces/policyerror/) if it fails.
