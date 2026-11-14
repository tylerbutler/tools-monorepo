---
editUrl: false
next: false
prev: false
title: "MaxChangedFiles"
---

> `const` **MaxChangedFiles**: `object`

Defined in: policies/MaxChangedFiles.ts:10

Limit the number of files in the selected change set.

## Type Declaration

### description

> **description**: `string` = `"Limits the number of changed files in a change set."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<[`MaxChangedFilesConfig`](/api/index/interfaces/maxchangedfilesconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### name

> **name**: `string` = `"MaxChangedFiles"`

### requiresConfig

> **requiresConfig**: `true` = `true`

### scope

> **scope**: `"changes"` = `"changes"`
