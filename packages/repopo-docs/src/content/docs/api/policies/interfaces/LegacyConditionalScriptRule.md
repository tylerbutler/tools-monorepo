---
editUrl: false
next: false
prev: false
title: "LegacyConditionalScriptRule"
---

Defined in: policies/PackageScripts.ts:29

Configuration for conditional script requirements.

## Properties

### ifPresent

> **ifPresent**: `string`

Defined in: policies/PackageScripts.ts:34

The script that triggers the requirement.
If this script exists, then `requires` must also exist.

***

### requires

> **requires**: [`LegacyRequiredScriptEntry`](/api/policies/type-aliases/legacyrequiredscriptentry/)[]

Defined in: policies/PackageScripts.ts:51

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
