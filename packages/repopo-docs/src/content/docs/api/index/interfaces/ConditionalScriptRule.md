---
editUrl: false
next: false
prev: false
title: "ConditionalScriptRule"
---

Defined in: [policies/ConditionalScripts.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ConditionalScripts.ts#L29)

Configuration for a conditional script requirement.

## Properties

### ifPresent

> **ifPresent**: `string`

Defined in: [policies/ConditionalScripts.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ConditionalScripts.ts#L34)

The script that triggers the requirement.
If this script exists, then `requires` must also exist.

***

### requires

> **requires**: [`ConditionalScriptEntry`](/api/index/type-aliases/conditionalscriptentry/)[]

Defined in: [policies/ConditionalScripts.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/ConditionalScripts.ts#L50)

Scripts that must be present if `ifPresent` script exists.

#### Remarks

Each entry can be:
- A string: Script must exist, no auto-fix available
- An object `{ scriptName: "default value" }`: Script must exist, auto-fix adds the
  default value if missing

#### Example

```typescript
requires: ["test", { clean: "rimraf dist" }]
```
