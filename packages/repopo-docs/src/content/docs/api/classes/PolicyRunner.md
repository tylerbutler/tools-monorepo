---
editUrl: false
next: false
prev: false
title: "PolicyRunner"
---

Defined in: [runner.ts:141](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L141)

Runs configured policies against files and collects results.

## Constructors

### Constructor

> **new PolicyRunner**(`options`): `PolicyRunner`

Defined in: [runner.ts:156](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L156)

Creates a runner with stable policy identities and normalized exclusions.

#### Parameters

##### options

[`PolicyRunnerOptions`](/api/interfaces/policyrunneroptions/)

Policies, exclusions, repository root, and execution settings.

#### Returns

`PolicyRunner`

#### Throws

If instance IDs conflict, repeated policies lack IDs, or concurrency is not a positive safe integer.

## Methods

### run()

> **run**(`filePaths`, `repositoryFiles?`): `Operation`\<[`PolicyRunResults`](/api/interfaces/policyrunresults/)\>

Defined in: [runner.ts:179](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L179)

Run file policies on the selection, then repository policies on the full inventory.
Supply a loader to refresh the inventory after fixes, including repository fixes.

#### Parameters

##### filePaths

`string`[]

Repo-relative paths selected for file-policy checks.

##### repositoryFiles?

readonly `string`[] \| (() => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<readonly `string`[]\>) = `filePaths`

Full repo-relative inventory or an async loader; defaults to `filePaths`.

#### Returns

`Operation`\<[`PolicyRunResults`](/api/interfaces/policyrunresults/)\>

An Effection operation yielding findings, fix outcomes, errors, and timing data.
