---
editUrl: false
next: false
prev: false
title: "PackageReadmeSettings"
---

Defined in: [policies/PackageReadme.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageReadme.ts#L17)

Policy settings for the PackageReadme repo policy.

## Properties

### requiredContent?

> `optional` **requiredContent?**: `string`

Defined in: [policies/PackageReadme.ts:55](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageReadme.ts#L55)

A string that must appear in the README content.

#### Remarks

Useful for ensuring all READMEs include required content like trademark
notices, disclaimers, or standard documentation sections.

#### Example

```typescript
requiredContent: "## Trademark"
```

***

### requireMatchingTitle?

> `optional` **requireMatchingTitle?**: `boolean`

Defined in: [policies/PackageReadme.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageReadme.ts#L40)

Whether to require the README title to match the package name.

#### Default Value

```ts
true
```

#### Remarks

When enabled, the first line of the README must be `# package-name`.
This ensures consistency and helps users identify the package.

***

### skipPrivate?

> `optional` **skipPrivate?**: `boolean`

Defined in: [policies/PackageReadme.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageReadme.ts#L28)

Whether to skip validation for private packages.

#### Default Value

```ts
true
```

#### Remarks

Private packages are typically not published and may not need a README file.
Set to `false` to require README files for all packages.
