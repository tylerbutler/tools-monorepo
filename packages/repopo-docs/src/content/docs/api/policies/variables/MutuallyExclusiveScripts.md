---
editUrl: false
next: false
prev: false
title: "MutuallyExclusiveScripts"
---

> `const` **MutuallyExclusiveScripts**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`MutuallyExclusiveScriptsConfig`](/api/index/interfaces/mutuallyexclusivescriptsconfig/) \| `undefined`\> & `object`

Defined in: policies/MutuallyExclusiveScripts.ts:51

A policy that validates mutually exclusive script groups in package.json.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

Use this policy when you want to enforce that only one script from a group
can exist in a package. This is useful for ensuring that packages don't have
conflicting scripts (e.g., both "lint:eslint" and "lint:biome").

## Example

```typescript
import { makePolicy } from "repopo";
import { MutuallyExclusiveScripts } from "repopo/policies";

makePolicy(MutuallyExclusiveScripts, { config: {
  groups: [
    ["lint:eslint", "lint:biome"],
    ["test:jest", "test:vitest"],
  ],
} })
```
