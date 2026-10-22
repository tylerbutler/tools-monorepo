---
editUrl: false
next: false
prev: false
title: "ScriptContains"
---

> `const` **ScriptContains**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`ScriptContainsConfig`](/api/index/interfaces/scriptcontainsconfig/) \| `undefined`\> & `object`

Defined in: policies/ScriptContains.ts:71

A policy that validates script bodies contain required substrings.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

Use this policy to ensure specific scripts contain required commands or patterns
without requiring an exact match. For example, requiring that the "clean" script
uses "rimraf" or that "build" includes "tsc".

The policy only validates scripts that exist. If a script doesn't exist,
it's not an error (use RequiredScripts for that).

## Example

```typescript
import { makePolicy } from "repopo";
import { ScriptContains } from "repopo/policies";

makePolicy(ScriptContains, { config: {
  rules: [
    { script: "clean", mustContain: ["rimraf"] },
    { script: "build", mustContain: ["tsc"] },
    { script: "test", mustContain: ["vitest", "run"] },
  ],
} })
```
