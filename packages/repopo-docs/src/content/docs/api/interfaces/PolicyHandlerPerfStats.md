---
editUrl: false
next: false
prev: false
title: "PolicyHandlerPerfStats"
---

Defined in: [perf.ts:15](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/perf.ts#L15)

Stores performance data for each handler. Used to collect and display performance stats.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### count

> **count**: `number`

Defined in: [perf.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/perf.ts#L17)

Number of candidate file paths supplied to the runner.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### data

> **data**: [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)\<[`PolicyAction`](/api/type-aliases/policyaction/), [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)\<`string`, `number`\>\>

Defined in: [perf.ts:20](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/perf.ts#L20)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### processed

> **processed**: `number`

Defined in: [perf.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/perf.ts#L19)

Number of candidate files admitted past global exclusions.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::
