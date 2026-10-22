---
editUrl: false
next: false
prev: false
title: "ConditionalScriptEntry"
---

> **ConditionalScriptEntry** = `string` \| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: policies/ConditionalScripts.ts:22

A required script entry for conditional requirements. Can be either:
- A string (script name only, no default value)
- An object with a single key-value pair (script name → default value for auto-fix)

## Example

```typescript
// Script must exist, no auto-fix available
"test"

// Script must exist, auto-fix will add this value if missing
{ clean: "rimraf dist" }
```
