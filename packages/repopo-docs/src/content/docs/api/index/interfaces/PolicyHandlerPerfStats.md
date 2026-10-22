---
editUrl: false
next: false
prev: false
title: "PolicyHandlerPerfStats"
---

Defined in: perf.ts:15

Stores performance data for each handler. Used to collect and display performance stats.

## Properties

### count

> **count**: `number`

Defined in: perf.ts:17

Number of candidate file paths supplied to the runner.

***

### data

> **data**: [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)\<[`PolicyAction`](/api/index/type-aliases/policyaction/), [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)\<`string`, `number`\>\>

Defined in: perf.ts:21

Total elapsed milliseconds per action and configured policy instance.

***

### processed

> **processed**: `number`

Defined in: perf.ts:19

Number of candidate files admitted past global exclusions.
