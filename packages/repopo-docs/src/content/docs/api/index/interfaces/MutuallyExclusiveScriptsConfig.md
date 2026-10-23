---
editUrl: false
next: false
prev: false
title: "MutuallyExclusiveScriptsConfig"
---

Defined in: [policies/MutuallyExclusiveScripts.ts:9](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/MutuallyExclusiveScripts.ts#L9)

Configuration for the MutuallyExclusiveScripts policy.

## Properties

### groups

> **groups**: `string`[][]

Defined in: [policies/MutuallyExclusiveScripts.ts:23](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/MutuallyExclusiveScripts.ts#L23)

List of mutually exclusive script groups. Each group is an array of script names
where at most one script from the group can be present.

Packages can have zero scripts from the group (all optional), but cannot have
multiple scripts from the same group.

#### Example

```typescript
// Allow "test:unit" OR "test:vitest" OR neither, but not both
groups: [["test:unit", "test:vitest"]]
```
