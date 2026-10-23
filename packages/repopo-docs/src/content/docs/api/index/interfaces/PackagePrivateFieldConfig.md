---
editUrl: false
next: false
prev: false
title: "PackagePrivateFieldConfig"
---

Defined in: [policies/PackagePrivateField.ts:47](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackagePrivateField.ts#L47)

Configuration for the PackagePrivateField policy.

This policy enforces that packages are correctly marked as private or public based on
their scope or name. This is essential for monorepos where some packages should be
published to npm while others should remain internal.

All pattern matching uses glob patterns via picomatch.

## Example

```typescript
const config: PackagePrivateFieldConfig = {
  // Packages in myorg scope must be published (private: false or absent)
  mustPublish: ["@myorg/*"],
  // Packages in internal scope must be private
  mustBePrivate: ["@internal/*"],
  // Packages in experimental scope can choose
  mayPublish: ["@experimental/*"],
};
```

## Properties

### mayPublish?

> `optional` **mayPublish?**: `string`[]

Defined in: [policies/PackagePrivateField.ts:99](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackagePrivateField.ts#L99)

A list of glob patterns for packages that may optionally be published.

Packages matching these patterns can choose whether to be private or public.
The policy will not enforce either state for these packages.

#### Remarks

Uses glob patterns via picomatch (see mustPublish for pattern examples).
Packages not matching any list default to requiring `private: true`.

#### Example

```typescript
mayPublish: ["@fluid-experimental/*"]
```

***

### mustBePrivate?

> `optional` **mustBePrivate?**: `string`[]

Defined in: [policies/PackagePrivateField.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackagePrivateField.ts#L81)

A list of glob patterns for packages that must be private.

Packages matching these patterns must have `private: true` in their package.json.
If they don't, the policy will fail and can auto-fix by adding `private: true`.

#### Remarks

Uses glob patterns via picomatch (see mustPublish for pattern examples).

#### Example

```typescript
mustBePrivate: ["@fluid-internal/*", "@fluid-private/*"]
```

***

### mustPublish?

> `optional` **mustPublish?**: `string`[]

Defined in: [policies/PackagePrivateField.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackagePrivateField.ts#L64)

A list of glob patterns for packages that must be published.

Packages matching these patterns must NOT have `private: true` in their package.json.
If they do, the policy will fail and can auto-fix by removing the private field.

#### Remarks

Uses glob patterns via picomatch. Use `@scope/*` to match all packages in a scope,
or use exact package names.

#### Example

```typescript
mustPublish: ["@fluidframework/*", "@fluid-tools/*", "tinylicious"]
```

***

### unmatchedPackages?

> `optional` **unmatchedPackages?**: `"private"` \| `"ignore"` \| `"public"`

Defined in: [policies/PackagePrivateField.ts:110](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackagePrivateField.ts#L110)

Default behavior for packages that don't match any of the above lists.

- `"private"` (default): Unmatched packages must have `private: true`
- `"public"`: Unmatched packages must NOT have `private: true`
- `"ignore"`: No enforcement for unmatched packages

#### Default Value

```ts
"private"
```
