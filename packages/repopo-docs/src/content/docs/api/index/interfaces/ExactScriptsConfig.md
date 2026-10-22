---
editUrl: false
next: false
prev: false
title: "ExactScriptsConfig"
---

Defined in: [policies/ExactScripts.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ExactScripts.ts#L11)

Configuration for the ExactScripts policy.

## Properties

### scripts

> **scripts**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: [policies/ExactScripts.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ExactScripts.ts#L28)

Scripts that must exist AND have exact content.

#### Remarks

Unlike RequiredScripts, scripts in `exact` are validated against
the specified value. If a script exists but has different content, it fails validation.
Both missing and mismatched scripts are auto-fixable.

#### Example

```typescript
scripts: {
  clean: "rimraf dist esm",
  format: "biome format --write .",
}
```
