---
editUrl: false
next: false
prev: false
title: "SharedDependencyVersions"
---

> `const` **SharedDependencyVersions**: `object`

Defined in: [policies/SharedDependencyVersions.ts:146](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/SharedDependencyVersions.ts#L146)

A policy that detects dependency version mismatches across Cargo workspace members.

## Type Declaration

### description

> **description**: `string` = `"Detects dependency version mismatches across Cargo workspace members."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

#### Parameters

##### \_\_namedParameters

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<[`SharedDependencyVersionsConfig`](/api/index/interfaces/shareddependencyversionsconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

### name

> **name**: `string` = `"SharedDependencyVersions"`

### scope

> **scope**: `"repository"` = `"repository"`
