---
editUrl: false
next: false
prev: false
title: "RequiredScriptsConfig"
---

Defined in: [policies/RequiredScripts.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequiredScripts.ts#L29)

Configuration for the RequiredScripts policy.

## Properties

### scripts

> **scripts**: [`RequiredScriptEntry`](/api/index/type-aliases/requiredscriptentry/)[]

Defined in: [policies/RequiredScripts.ts:48](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequiredScripts.ts#L48)

Scripts that must be present in package.json.

#### Remarks

Each entry can be:
- A string: Script must exist, no auto-fix available, content not validated
- An object `{ scriptName: "default value" }`: Script must exist, auto-fix adds the
  default value if missing, but existing scripts with different content still pass

#### Example

```typescript
scripts: [
  "test",                        // Must exist, no auto-fix
  { lint: "biome lint ." },      // Must exist, auto-fix available
  { clean: "rimraf dist esm" },  // Must exist, auto-fix available
]
```
