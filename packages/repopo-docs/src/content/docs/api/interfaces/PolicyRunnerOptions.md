---
editUrl: false
next: false
prev: false
title: "PolicyRunnerOptions"
---

Defined in: [runner.ts:120](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L120)

Options for configuring a [PolicyRunner](/api/classes/policyrunner/).

## Properties

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [runner.ts:134](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L134)

Maximum active files in read-only checks. Defaults to 8; fixes remain sequential.

***

### excludeFromAll

> **excludeFromAll**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)[]

Defined in: [runner.ts:124](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L124)

Regular expressions that exclude repo-relative paths from every policy.

***

### excludePoliciesForFiles

> **excludePoliciesForFiles**: [`ExcludedPolicyFileMap`](/api/type-aliases/excludedpolicyfilemap/)

Defined in: [runner.ts:126](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L126)

Per-instance exclusions; supplied entries override the policy's own exclusions.

***

### gitRoot

> **gitRoot**: `string`

Defined in: [runner.ts:128](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L128)

Absolute path to the repository root.

***

### logger?

> `optional` **logger?**: [`Pick`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys)\<`Logger`, `"verbose"`\>

Defined in: [runner.ts:132](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L132)

Optional logger for file-exclusion messages.

***

### policies

> **policies**: ([`ConfiguredPolicy`](/api/type-aliases/configuredpolicy/)\<`any`\> \| [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`any`\>)[]

Defined in: [runner.ts:122](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L122)

Configured file and repository policies to execute.

***

### resolve

> **resolve**: `boolean`

Defined in: [runner.ts:130](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L130)

Whether handlers and resolvers should attempt automatic fixes.
