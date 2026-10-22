---
editUrl: false
next: false
prev: false
title: "PackageFolderNameConfig"
---

Defined in: policies/PackageFolderName.ts:28

Configuration for the PackageFolderName policy.

This policy ensures that package folder names match their package names,
promoting consistency and making packages easier to find in the file system.

## Example

```typescript
const config: PackageFolderNameConfig = {
  // Strip all scopes when matching folder names
  stripScopes: ["@*"],
  // Or strip specific scopes
  stripScopes: ["@myorg", "@internal"],
  // These packages are exempt from the check
  excludePackages: ["@myorg/special-name"],
};
```

## Properties

### excludePackages?

> `optional` **excludePackages?**: `string`[]

Defined in: policies/PackageFolderName.ts:67

A list of package names that are exempt from folder name matching.

Use this for packages that intentionally have different folder names,
such as legacy packages or packages with special naming requirements.

#### Example

```typescript
excludePackages: ["@myorg/cli", "legacy-package"]
```

***

### stripScopes?

> `optional` **stripScopes?**: `string`[]

Defined in: policies/PackageFolderName.ts:54

A list of npm scope patterns to strip when comparing folder names to package names.

For scoped packages like `@myorg/my-package`, if `@myorg` matches a pattern in this list,
the policy will expect the folder to be named `my-package` (not `@myorg/my-package`).

#### Remarks

Supports glob patterns:
- `@*` - matches all scopes
- `@myorg` - matches exactly `@myorg`
- `@my*` - matches scopes starting with `@my`

#### Example

```typescript
// Strip all scopes - @anything/my-package → folder "my-package"
stripScopes: ["@*"]

// Strip specific scopes only
stripScopes: ["@myorg", "@internal"]

// Strip scopes matching a pattern
stripScopes: ["@fluid*"]
```
