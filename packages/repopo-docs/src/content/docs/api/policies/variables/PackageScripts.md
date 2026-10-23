---
editUrl: false
next: false
prev: false
title: "PackageScripts"
---

> `const` **PackageScripts**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageScriptsSettings`](/api/index/interfaces/packagescriptssettings/) \| `undefined`\> & `object`

Defined in: [policies/PackageScripts.ts:708](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageScripts.ts#L708)

A RepoPolicy that validates package.json scripts based on configurable rules.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

This policy provides comprehensive script validation including:
- Required scripts that must be present (with optional defaults for auto-fix)
- Exact script content enforcement
- Mutually exclusive script groups (at most one can exist)
- Conditional requirements (if X exists, Y must also exist)
- Script body content validation (script must contain specific substrings)

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageScripts } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackageScripts, {
      config: {
        // Scripts that must exist
        must: [
          "test",                        // Must exist, no auto-fix
          { build: "tsc" },              // Must exist, auto-fix available
          { lint: "biome lint ." },      // Must exist, auto-fix available
        ],
        // Scripts that must exist AND match exactly
        exact: {
          clean: "rimraf dist esm",
          format: "biome format --write .",
        },
        // If "build" exists, "clean" must also exist (with inline auto-fix default)
        conditionalRequired: [{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] }],
        // Script body must contain these substrings
        scriptMustContain: [{ script: "build", mustContain: ["tsc"] }],
        // Only one of these can exist
        mutuallyExclusive: [["lint:eslint", "lint:biome"]],
      },
    }),
  ],
};
```
