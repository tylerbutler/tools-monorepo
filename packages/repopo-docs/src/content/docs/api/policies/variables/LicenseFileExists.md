---
editUrl: false
next: false
prev: false
title: "LicenseFileExists"
---

> `const` **LicenseFileExists**: `object`

Defined in: [policies/LicenseFileExists.ts:37](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/LicenseFileExists.ts#L37)

A repo policy that checks that a LICENSE file exists in the repository root.
This is essential for open source projects to clarify usage rights and obligations.

## Type Declaration

### description

> **description**: `string` = `"Ensures a LICENSE file exists in the repository root for open source projects."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<[`LicenseFileExistsSettings`](/api/index/interfaces/licensefileexistssettings/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### name

> **name**: `string` = `"LicenseFileExists"`

### scope

> **scope**: `"repository"` = `"repository"`
