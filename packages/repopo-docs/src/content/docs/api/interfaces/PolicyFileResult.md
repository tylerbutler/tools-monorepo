---
editUrl: false
next: false
prev: false
title: "PolicyFileResult"
---

Defined in: [runner.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L59)

Result of running a single policy on a single file.

## Properties

### file

> **file**: `string`

Defined in: [runner.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L63)

Path of the checked file, relative to the repository root.

***

### outcome

> **outcome**: [`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)

Defined in: [runner.ts:69](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L69)

The raw result from the policy handler

***

### policy

> **policy**: `string`

Defined in: [runner.ts:65](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L65)

Display name of the policy.

***

### policyId

> **policyId**: `string`

Defined in: [runner.ts:67](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L67)

Stable identity of the configured policy instance

***

### resolution?

> `optional` **resolution?**: [`PolicyFixResult`](/api/interfaces/policyfixresult/)

Defined in: [runner.ts:71](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L71)

Standalone resolver result, normalized to the legacy format for compatibility.

***

### scope?

> `optional` **scope?**: `"file"`

Defined in: [runner.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L61)

File scope; omitted by the runner for backward compatibility.
