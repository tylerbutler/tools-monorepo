---
editUrl: false
next: false
prev: false
title: "PolicyFileResult"
---

Defined in: [runner.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L52)

Result of running a single policy on a single file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### file

> **file**: `string`

Defined in: [runner.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L53)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### outcome

> **outcome**: [`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)

Defined in: [runner.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L58)

The raw result from the policy handler

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policy

> **policy**: `string`

Defined in: [runner.ts:54](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L54)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policyId

> **policyId**: `string`

Defined in: [runner.ts:56](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L56)

Stable identity of the configured policy instance

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolution?

> `optional` **resolution?**: [`PolicyFixResult`](/api/interfaces/policyfixresult/)

Defined in: [runner.ts:60](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L60)

Set when a standalone resolver was attempted (legacy resolver path)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::
