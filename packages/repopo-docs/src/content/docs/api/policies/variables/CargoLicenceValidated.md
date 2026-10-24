---
editUrl: false
next: false
prev: false
title: "CargoLicenceValidated"
---

> `const` **CargoLicenceValidated**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`CargoLicenceValidatedConfig`](/api/index/interfaces/cargolicencevalidatedconfig/)\>

Defined in: [policies/CargoLicenceValidated.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoLicenceValidated.ts#L53)

A policy that validates the `license` field in Cargo.toml against the SPDX
licence list. Supports auto-fixing correctable identifiers.

## Remarks

Cargo.toml uses a single `license` string field (not an array like Gleam's
`licences`). This policy validates that the value is a recognized SPDX
identifier and can auto-fix common mistakes like wrong casing.
