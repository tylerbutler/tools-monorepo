---
editUrl: false
next: false
prev: false
title: "PackageLicenseSettings"
---

Defined in: policies/PackageLicense.ts:13

Policy settings for the PackageLicense repo policy.

## Properties

### licenseFileName?

> `optional` **licenseFileName?**: `string`

Defined in: policies/PackageLicense.ts:32

The name of the LICENSE file to look for and sync.

#### Default Value

```ts
"LICENSE"
```

***

### skipPrivate?

> `optional` **skipPrivate?**: `boolean`

Defined in: policies/PackageLicense.ts:25

Whether to skip validation for private packages.

#### Default Value

```ts
true
```

#### Remarks

Private packages (those with `private: true` in package.json) are typically
not published and may not need a LICENSE file. Set to `false` to require
LICENSE files for all packages.
