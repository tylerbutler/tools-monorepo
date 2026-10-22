---
editUrl: false
next: false
prev: false
title: "ScriptContainsConfig"
---

Defined in: policies/ScriptContains.ts:27

Configuration for the ScriptContains policy.

## Properties

### rules

> **rules**: [`ScriptContainsRule`](/api/index/interfaces/scriptcontainsrule/)[]

Defined in: policies/ScriptContains.ts:39

Rules for validating script body content.

#### Example

```typescript
rules: [
  { script: "clean", mustContain: ["rimraf"] },
  { script: "build", mustContain: ["tsc"] },
]
```
