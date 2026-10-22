---
editUrl: false
next: false
prev: false
title: "PackageScriptsSettings"
---

Defined in: policies/PackageScripts.ts:77

Policy settings for the PackageScripts repo policy.

## Properties

### conditionalRequired?

> `optional` **conditionalRequired?**: [`LegacyConditionalScriptRule`](/api/policies/interfaces/legacyconditionalscriptrule/)[]

Defined in: policies/PackageScripts.ts:154

Conditional script requirements. If a script is present, other scripts must also exist.

#### Remarks

This is useful for enforcing that packages with a "build" script also have a "clean" script,
or packages with "test" also have "test:coverage".

The `requires` field accepts the same format as [PackageScriptsSettings.must](/api/index/interfaces/packagescriptssettings/#must):
- Strings: Script must exist, no auto-fix available
- Objects `{ scriptName: "default" }`: Script must exist, auto-fix adds the default if missing

#### Example

```typescript
// If "build" exists, "clean" must also exist (with auto-fix default)
conditionalRequired: [{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] }]

// Mixed: "test" required without default, "clean" with default
conditionalRequired: [{ ifPresent: "build", requires: ["test", { clean: "rimraf dist" }] }]
```

***

### exact?

> `optional` **exact?**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: policies/PackageScripts.ts:116

Scripts that must exist AND have exact content.

#### Remarks

Unlike [PackageScriptsSettings.must](/api/index/interfaces/packagescriptssettings/#must), scripts in `exact` are validated against
the specified value. If a script exists but has different content, it fails validation.
Both missing and mismatched scripts are auto-fixable.

#### Example

```typescript
exact: {
  clean: "rimraf dist esm",
  format: "biome format --write .",
}
```

***

### must?

> `optional` **must?**: [`LegacyRequiredScriptEntry`](/api/policies/type-aliases/legacyrequiredscriptentry/)[]

Defined in: policies/PackageScripts.ts:97

Scripts that must be present in package.json.

#### Remarks

Each entry can be:
- A string: Script must exist, no auto-fix available, content not validated
- An object `{ scriptName: "default value" }`: Script must exist, auto-fix adds the
  default value if missing, but existing scripts with different content still pass

#### Example

```typescript
must: [
  "test",                        // Must exist, no auto-fix
  { lint: "biome lint ." },      // Must exist, auto-fix available
  { clean: "rimraf dist esm" },  // Must exist, auto-fix available
]
```

***

### mutuallyExclusive?

> `optional` **mutuallyExclusive?**: `string`[][]

Defined in: policies/PackageScripts.ts:131

List of mutually exclusive script groups. Each group is an array of script names
where at most one script from the group can be present.

Packages can have zero scripts from the group (all optional), but cannot have
multiple scripts from the same group.

#### Example

```typescript
// Allow "test:unit" OR "test:vitest" OR neither, but not both
mutuallyExclusive: [["test:unit", "test:vitest"]]
```

***

### scriptMustContain?

> `optional` **scriptMustContain?**: [`ScriptMustContainRule`](/api/index/interfaces/scriptmustcontainrule/)[]

Defined in: policies/PackageScripts.ts:175

Rules for validating script body content.

#### Remarks

This allows you to ensure that specific scripts contain required commands or patterns
without requiring an exact match. For example, requiring that the "clean" script uses
"rimraf" or that "build" includes "tsc".

For exact content matching, use [PackageScriptsSettings.exact](/api/index/interfaces/packagescriptssettings/#exact) instead.

#### Example

```typescript
scriptMustContain: [
  { script: "clean", mustContain: ["rimraf"] },
  { script: "build", mustContain: ["tsc"] },
]
```
