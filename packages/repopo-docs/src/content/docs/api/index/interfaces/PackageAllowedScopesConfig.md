---
editUrl: false
next: false
prev: false
title: "PackageAllowedScopesConfig"
---

Defined in: policies/PackageAllowedScopes.ts:24

Configuration for the PackageAllowedScopes policy.

This policy ensures packages in a monorepo use only approved scopes or package names.
This prevents accidental introduction of new scopes and ensures naming consistency.

## Example

```typescript
const config: PackageAllowedScopesConfig = {
  // Only packages in these scopes are allowed
  allowedScopes: ["@myorg", "@internal", "@experimental"],
  // These specific unscoped packages are also allowed
  unscopedPackages: ["my-legacy-tool", "special-package"],
};
```

## Properties

### allowedScopes?

> `optional` **allowedScopes?**: `string`[]

Defined in: policies/PackageAllowedScopes.ts:41

A list of npm scopes that are allowed for packages in this repository.

Scopes should start with `@` (e.g., `@myorg`). A package like `@myorg/foo`
would match the scope `@myorg`.

#### Remarks

If a package's scope is not in this list and the package is not in
`unscopedPackages`, the policy will fail.

#### Example

```typescript
allowedScopes: ["@myorg", "@myorg-tools", "@myorg-internal"]
```

***

### unscopedPackages?

> `optional` **unscopedPackages?**: `string`[]

Defined in: policies/PackageAllowedScopes.ts:57

A list of unscoped package names that are explicitly allowed.

Use this for legacy packages or special cases where an unscoped name is needed.

#### Remarks

Unscoped packages not in this list will cause the policy to fail.

#### Example

```typescript
unscopedPackages: ["my-legacy-tool", "special-package"]
```
