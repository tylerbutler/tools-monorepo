---
editUrl: false
next: false
prev: false
title: "GleamLicenceConfiguredConfig"
---

Defined in: policies/GleamLicenceConfigured.ts:14

Configuration for the GleamLicenceConfigured policy.

## Properties

### allowedLicences?

> `optional` **allowedLicences?**: `string`[]

Defined in: policies/GleamLicenceConfigured.ts:18

Allowed SPDX licence identifiers. If set, only these are accepted.

***

### validateSpdx?

> `optional` **validateSpdx?**: `boolean`

Defined in: policies/GleamLicenceConfigured.ts:29

If true, validate licence values against the SPDX licence list
using `spdx-correct`. When enabled, typos like "MIIT" are detected
and can be auto-fixed to the correct identifier ("MIT").

Requires the optional peer dependency `spdx-correct` to be installed.

#### Default Value

```ts
false
```
