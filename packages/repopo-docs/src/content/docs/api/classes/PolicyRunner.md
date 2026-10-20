---
editUrl: false
next: false
prev: false
title: "PolicyRunner"
---

Defined in: [runner.ts:109](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L109)

Runs configured policies against files and collects results.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Constructors

### Constructor

> **new PolicyRunner**(`options`): `PolicyRunner`

Defined in: [runner.ts:117](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L117)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### options

[`PolicyRunnerOptions`](/api/interfaces/policyrunneroptions/)

#### Returns

`PolicyRunner`

## Methods

### run()

> **run**(`filePaths`, `repositoryFiles?`): `Operation`\<[`PolicyRunResults`](/api/interfaces/policyrunresults/)\>

Defined in: [runner.ts:133](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L133)

Run file policies on the selection, then repository policies on the full inventory.
Supply a loader to refresh the inventory after fixes, including repository fixes.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### filePaths

`string`[]

##### repositoryFiles?

readonly `string`[] \| (() => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<readonly `string`[]\>)

#### Returns

`Operation`\<[`PolicyRunResults`](/api/interfaces/policyrunresults/)\>
