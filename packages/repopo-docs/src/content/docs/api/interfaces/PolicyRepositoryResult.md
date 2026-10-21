---
editUrl: false
next: false
prev: false
title: "PolicyRepositoryResult"
---

Defined in: [runner.ts:79](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L79)

A single finding from a repository-scoped policy.

## Properties

### file?

> `optional` **file?**: `undefined`

Defined in: [runner.ts:89](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L89)

Repository findings use `outcome.files`, not a synthetic file path.

***

### outcome

> **outcome**: [`RepositoryPolicyFinding`](/api/interfaces/repositorypolicyfinding/)

Defined in: [runner.ts:87](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L87)

Violation details, optional affected files, and fix status.

***

### policy

> **policy**: `string`

Defined in: [runner.ts:83](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L83)

Display name of the policy.

***

### policyId

> **policyId**: `string`

Defined in: [runner.ts:85](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L85)

Stable identity of the configured policy instance.

***

### scope

> **scope**: `"repository"`

Defined in: [runner.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L81)

Identifies a repository-scoped result.
