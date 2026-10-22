---
editUrl: false
next: false
prev: false
title: "ScriptContainsConfig"
---

Defined in: [policies/ScriptContains.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ScriptContains.ts#L27)

Configuration for the ScriptContains policy.

## Properties

### rules

> **rules**: [`ScriptContainsRule`](/api/index/interfaces/scriptcontainsrule/)[]

Defined in: [policies/ScriptContains.ts:39](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ScriptContains.ts#L39)

Rules for validating script body content.

#### Example

```typescript
rules: [
  { script: "clean", mustContain: ["rimraf"] },
  { script: "build", mustContain: ["tsc"] },
]
```
