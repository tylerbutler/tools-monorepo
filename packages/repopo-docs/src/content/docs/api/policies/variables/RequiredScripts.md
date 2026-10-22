---
editUrl: false
next: false
prev: false
title: "RequiredScripts"
---

> `const` **RequiredScripts**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`RequiredScriptsConfig`](/api/index/interfaces/requiredscriptsconfig/) \| `undefined`\> & `object`

Defined in: [policies/RequiredScripts.ts:167](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequiredScripts.ts#L167)

A policy that validates required scripts exist in package.json.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

Use this policy when you want to ensure specific scripts are present.
Scripts can be specified with optional default values that enable auto-fix.

Note: This policy only checks for script presence. It does NOT validate
the script's content. Use ExactScripts for content validation.

## Example

```typescript
import { makePolicy } from "repopo";
import { RequiredScripts } from "repopo/policies";

makePolicy(RequiredScripts, { config: {
  scripts: [
    "test",                        // Must exist, no auto-fix
    { lint: "biome lint ." },      // Must exist, auto-fix adds default if missing
    { clean: "rimraf dist esm" },  // Must exist, auto-fix adds default if missing
  ],
} })
```
