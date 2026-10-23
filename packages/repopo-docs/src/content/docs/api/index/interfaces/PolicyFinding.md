---
editUrl: false
next: false
prev: false
title: "PolicyFinding"
---

Defined in: [policy.ts:26](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L26)

A single independently actionable violation or recorded fix.

## Properties

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [policy.ts:31](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L31)

Repo-relative affected files. Only repository handlers may supply this.

***

### fixStatus?

> `optional` **fixStatus?**: `"available"` \| `"fixed"` \| `"failed"`

Defined in: [policy.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L29)

***

### manualFix?

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L28)

***

### message

> **message**: `string`

Defined in: [policy.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L27)
