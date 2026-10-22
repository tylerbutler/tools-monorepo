---
editUrl: false
next: false
prev: false
title: "ExactScripts"
---

> `const` **ExactScripts**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`ExactScriptsConfig`](/api/index/interfaces/exactscriptsconfig/) \| `undefined`\> & `object`

Defined in: policies/ExactScripts.ts:125

A policy that validates scripts exist AND have exact content in package.json.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

Use this policy when you want to enforce exact script content, not just presence.
This is useful for scripts that must be exactly the same across packages.

For scripts where you only care about presence (not content), use RequiredScripts instead.

## Example

```typescript
import { makePolicy } from "repopo";
import { ExactScripts } from "repopo/policies";

makePolicy(ExactScripts, { config: {
  scripts: {
    clean: "rimraf dist esm",
    format: "biome format --write .",
    lint: "biome lint .",
  },
} })
```
