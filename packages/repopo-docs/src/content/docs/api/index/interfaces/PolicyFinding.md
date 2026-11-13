---
editUrl: false
next: false
prev: false
title: "PolicyFinding"
---

Defined in: [policy.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L29)

A single independently actionable violation or recorded fix.

## Properties

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [policy.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L34)

Repo-relative affected files. Only repository handlers may supply this.

***

### fixStatus?

> `optional` **fixStatus?**: `"available"` \| `"fixed"` \| `"failed"`

Defined in: [policy.ts:32](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L32)

***

### manualFix?

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:31](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L31)

***

### message

> **message**: `string`

Defined in: [policy.ts:30](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L30)
