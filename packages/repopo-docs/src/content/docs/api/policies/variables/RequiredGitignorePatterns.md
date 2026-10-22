---
editUrl: false
next: false
prev: false
title: "RequiredGitignorePatterns"
---

> `const` **RequiredGitignorePatterns**: `object`

Defined in: [policies/RequiredGitignorePatterns.ts:269](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequiredGitignorePatterns.ts#L269)

A repo policy that ensures .gitignore contains required patterns to prevent
committing sensitive files, dependencies, and build artifacts.

## Type Declaration

### description

> **description**: `string` = `"Ensures .gitignore contains required patterns to prevent committing sensitive files, dependencies, and build artifacts."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`RequiredGitignorePatternsSettings`](/api/index/interfaces/requiredgitignorepatternssettings/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"RequiredGitignorePatterns"`
