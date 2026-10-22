---
editUrl: false
next: false
prev: false
title: "PolicySkippedWork"
---

> **PolicySkippedWork** = `object` & (\{ `file`: `string`; `scope`: `"file"`; \} \| \{ `file?`: `never`; `scope`: `"repository"`; \})

Defined in: runner.ts:44

A unit that was not executed.

## Type Declaration

### policy

> **policy**: `string`

### policyId

> **policyId**: `string`

### reason

> **reason**: `"excluded"` \| `"file-fix-error"` \| `"repository-fix-error"`
