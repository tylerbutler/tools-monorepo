---
editUrl: false
next: false
prev: false
title: "PolicyFileResult"
---

Defined in: [runner.ts:46](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L46)

Result of running a single policy on a single file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### file

> **file**: `string`

Defined in: [runner.ts:47](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L47)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### outcome

> **outcome**: [`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)

Defined in: [runner.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L50)

The raw result from the policy handler

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policy

> **policy**: `string`

Defined in: [runner.ts:48](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L48)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolution?

> `optional` **resolution?**: [`PolicyFixResult`](/api/interfaces/policyfixresult/)

Defined in: [runner.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L52)

Set when a standalone resolver was attempted (legacy resolver path)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::
