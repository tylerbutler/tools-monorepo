---
editUrl: false
next: false
prev: false
title: "PackageEsmTypeConfig"
---

Defined in: [policies/PackageEsmType.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageEsmType.ts#L28)

Configuration for the PackageEsmType policy.

This policy ensures the `type` field in package.json is correctly set
to indicate whether the package is an ESM or CommonJS module.

## Example

```typescript
const config: PackageEsmTypeConfig = {
  // Require ESM type field for all packages
  requiredType: "module",
  // Or detect based on exports/main field
  detectFromExports: true,
};
```

## Properties

### detectFromExports?

> `optional` **detectFromExports?**: `boolean`

Defined in: [policies/PackageEsmType.ts:54](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageEsmType.ts#L54)

Detect the expected `type` field from the exports or main field.

When enabled, the policy analyzes the package's entry points:
- If exports use `.mjs` or have `import` conditions → `"module"`
- If exports use `.cjs` or have `require` conditions → `"commonjs"`
- If main field uses `.mjs` → `"module"`
- If main field uses `.cjs` → `"commonjs"`

#### Default Value

```ts
false
```

***

### excludePackages?

> `optional` **excludePackages?**: `string`[]

Defined in: [policies/PackageEsmType.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageEsmType.ts#L64)

Package names or scopes to exclude from validation.

#### Example

```typescript
excludePackages: ["@myorg/legacy-package", "old-cjs-lib"]
```

***

### onDetectionFailure?

> `optional` **onDetectionFailure?**: `"warn"` \| `"skip"` \| `"fail"`

Defined in: [policies/PackageEsmType.ts:77](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageEsmType.ts#L77)

Behavior when module type cannot be detected from exports/main.

- `"skip"` (default) - Skip validation for packages where type cannot be detected
- `"warn"` - Pass validation but include a warning in the output
- `"fail"` - Fail validation when type cannot be detected

This only applies when `detectFromExports` is true and no `requiredType` is set.

#### Default Value

```ts
"skip"
```

***

### requiredType?

> `optional` **requiredType?**: `"module"` \| `"commonjs"`

Defined in: [policies/PackageEsmType.ts:41](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageEsmType.ts#L41)

The required `type` field value for all packages.

- `"module"` - All packages must be ESM (use import/export)
- `"commonjs"` - All packages must be CommonJS (use require)
- `undefined` - Use detection logic based on exports/main

#### Remarks

If set, this overrides automatic detection. Use `detectFromExports`
for more flexible per-package type detection.
