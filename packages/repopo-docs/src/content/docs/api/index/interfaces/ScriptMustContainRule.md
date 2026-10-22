---
editUrl: false
next: false
prev: false
title: "ScriptMustContainRule"
---

Defined in: [policies/PackageScripts.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageScripts.ts#L11)

Configuration for validating that a script's body contains required substrings.

## Properties

### mustContain

> **mustContain**: `string`[]

Defined in: [policies/PackageScripts.ts:21](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageScripts.ts#L21)

Substrings that must appear in the script body.
All substrings must be present for the script to pass validation.

***

### script

> **script**: `string`

Defined in: [policies/PackageScripts.ts:15](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageScripts.ts#L15)

The name of the script to validate.
