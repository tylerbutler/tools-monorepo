---
editUrl: false
next: false
prev: false
title: "CargoLicenceValidatedConfig"
---

Defined in: policies/CargoLicenceValidated.ts:14

Configuration for the CargoLicenceValidated policy.

## Properties

### allowedLicences?

> `optional` **allowedLicences?**: `string`[]

Defined in: policies/CargoLicenceValidated.ts:18

Allowed SPDX licence identifiers. If set, only these are accepted.

***

### skipWorkspace?

> `optional` **skipWorkspace?**: `boolean`

Defined in: policies/CargoLicenceValidated.ts:36

If true, skip workspace-only Cargo.toml files (those without a [package] section).

#### Default Value

```ts
true
```

***

### validateSpdx?

> `optional` **validateSpdx?**: `boolean`

Defined in: policies/CargoLicenceValidated.ts:29

If true, validate the licence value against the SPDX licence list
using `spdx-correct`. When enabled, typos like "MIIT" are detected
and can be auto-fixed to the correct identifier ("MIT").

Requires the optional peer dependency `spdx-correct` to be installed.

#### Default Value

```ts
true
```
