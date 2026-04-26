---
editUrl: false
next: false
prev: false
title: "PolicyFileResult"
---

Defined in: [runner.ts:32](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L32)

Result of running a single policy on a single file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### file

> **file**: `string`

Defined in: [runner.ts:33](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L33)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### outcome

> **outcome**: [`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)

Defined in: [runner.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L36)

The raw result from the policy handler

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policy

> **policy**: `string`

Defined in: [runner.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L34)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolution?

> `optional` **resolution?**: [`PolicyFixResult`](/api/interfaces/policyfixresult/)

Defined in: [runner.ts:38](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L38)

Set when a standalone resolver was attempted (legacy resolver path)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::
