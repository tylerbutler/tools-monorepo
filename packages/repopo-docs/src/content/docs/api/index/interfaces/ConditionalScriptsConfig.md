---
editUrl: false
next: false
prev: false
title: "ConditionalScriptsConfig"
---

Defined in: [policies/ConditionalScripts.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ConditionalScripts.ts#L58)

Configuration for the ConditionalScripts policy.

## Properties

### rules

> **rules**: [`ConditionalScriptRule`](/api/index/interfaces/conditionalscriptrule/)[]

Defined in: [policies/ConditionalScripts.ts:74](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ConditionalScripts.ts#L74)

Conditional script requirements. If a script is present, other scripts must also exist.

#### Remarks

This is useful for enforcing that packages with a "build" script also have a "clean" script,
or packages with "test" also have "test:coverage".

#### Example

```typescript
rules: [
  { ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
  { ifPresent: "test", requires: ["test:coverage"] },
]
```
