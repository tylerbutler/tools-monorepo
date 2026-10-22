---
editUrl: false
next: false
prev: false
title: "LegacyRequiredScriptEntry"
---

> **LegacyRequiredScriptEntry** = `string` \| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: [policies/PackageScripts.ts:70](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageScripts.ts#L70)

A required script entry. Can be either:
- A string (script name only, no default value)
- An object with a single key-value pair (script name → default value)

## Example

```typescript
// Script must exist, no auto-fix available
"test"

// Script must exist, auto-fix will add this value if missing
{ lint: "biome lint ." }
```
