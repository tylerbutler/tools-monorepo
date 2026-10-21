---
editUrl: false
next: false
prev: false
title: "ExcludedPolicyFileMap"
---

> **ExcludedPolicyFileMap** = [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)\<[`PolicyInstanceId`](/api/type-aliases/policyinstanceid/), [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)[]\>

Defined in: [context.ts:10](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/context.ts#L10)

A map of policy instance IDs to file-path regexes that should be excluded from those policies.
Paths are relative to the repository root.
