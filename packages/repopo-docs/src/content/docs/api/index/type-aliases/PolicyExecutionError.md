---
editUrl: false
next: false
prev: false
title: "PolicyExecutionError"
---

> **PolicyExecutionError** = `object` & (\{ `file`: `string`; `files?`: `never`; `scope`: `"file"`; \} \| \{ `file?`: `never`; `files`: readonly `string`[]; `scope`: `"repository"`; \})

Defined in: runner.ts:31

An execution failure, separate from ordinary policy findings.

## Type Declaration

### cause

> **cause**: `unknown`

### kind

> **kind**: `"contract"` \| `"exception"`

### message

> **message**: `string`

### phase

> **phase**: `"handle"` \| `"resolve"`

### policy

> **policy**: `string`

### policyId

> **policyId**: `string`
