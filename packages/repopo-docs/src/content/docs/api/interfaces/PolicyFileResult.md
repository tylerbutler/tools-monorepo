---
editUrl: false
next: false
prev: false
title: "PolicyFileResult"
---

Defined in: [runner.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L59)

Result of running a single policy on a single file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### file

> **file**: `string`

Defined in: [runner.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L61)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### outcome

> **outcome**: [`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)

Defined in: [runner.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L66)

The raw result from the policy handler

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policy

> **policy**: `string`

Defined in: [runner.ts:62](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L62)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policyId

> **policyId**: `string`

Defined in: [runner.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L64)

Stable identity of the configured policy instance

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolution?

> `optional` **resolution?**: [`PolicyFixResult`](/api/interfaces/policyfixresult/)

Defined in: [runner.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L68)

Standalone resolver result, normalized to the legacy format for compatibility.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### scope?

> `optional` **scope?**: `"file"`

Defined in: [runner.ts:60](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L60)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::
