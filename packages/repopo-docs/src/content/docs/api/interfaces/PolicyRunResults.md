---
editUrl: false
next: false
prev: false
title: "PolicyRunResults"
---

Defined in: [runner.ts:103](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L103)

Aggregated results from a full policy run.

## Properties

### perfStats

> **perfStats**: [`PolicyHandlerPerfStats`](/api/interfaces/policyhandlerperfstats/)

Defined in: [runner.ts:107](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L107)

File counts and elapsed milliseconds per action and policy instance.

***

### results

> **results**: [`PolicyExecutionResult`](/api/type-aliases/policyexecutionresult/)[]

Defined in: [runner.ts:105](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L105)

Violations, fix outcomes, and execution errors; passing checks are omitted.
