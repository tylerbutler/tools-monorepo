---
editUrl: false
next: false
prev: false
title: "ConditionalScripts"
---

> `const` **ConditionalScripts**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`ConditionalScriptsConfig`](/api/index/interfaces/conditionalscriptsconfig/) \| `undefined`\> & `object`

Defined in: policies/ConditionalScripts.ts:222

A policy that validates conditional script requirements in package.json.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

Use this policy when you want to enforce that the presence of one script
requires other scripts to also exist. For example, if "build" exists,
then "clean" must also exist.

## Example

```typescript
import { makePolicy } from "repopo";
import { ConditionalScripts } from "repopo/policies";

makePolicy(ConditionalScripts, { config: {
  rules: [
    // If "build" exists, "clean" must also exist (with auto-fix default)
    { ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
    // If "test" exists, "test:coverage" must also exist (no auto-fix)
    { ifPresent: "test", requires: ["test:coverage"] },
  ],
} })
```
