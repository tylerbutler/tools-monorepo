---
editUrl: false
next: false
prev: false
title: "CargoLockPolicy"
---

> `const` **CargoLockPolicy**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`CargoLockPolicyConfig`](/api/index/interfaces/cargolockpolicyconfig/)\>

Defined in: policies/CargoLockPolicy.ts:62

A context-aware policy for Cargo.lock files.
Binary crates should commit Cargo.lock; library crates typically shouldn't.
