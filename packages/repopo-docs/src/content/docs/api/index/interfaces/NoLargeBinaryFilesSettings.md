---
editUrl: false
next: false
prev: false
title: "NoLargeBinaryFilesSettings"
---

Defined in: policies/NoLargeBinaryFiles.ts:9

Policy settings for the NoLargeBinaryFiles repo policy.

## Properties

### excludeExtensions?

> `optional` **excludeExtensions?**: `string`[]

Defined in: policies/NoLargeBinaryFiles.ts:19

File extensions to exclude from size checking.
Useful for known large files that should be allowed.

***

### excludePatterns?

> `optional` **excludePatterns?**: `string`[]

Defined in: policies/NoLargeBinaryFiles.ts:25

File patterns to exclude from size checking.
Uses glob-style patterns.

***

### maxSizeBytes?

> `optional` **maxSizeBytes?**: `number`

Defined in: policies/NoLargeBinaryFiles.ts:13

Maximum file size in bytes. Defaults to 10MB.
