---
editUrl: false
next: false
prev: false
title: "GleamNoPathDepsInPublishedConfig"
---

Defined in: policies/GleamNoPathDepsInPublished.ts:12

Configuration for the GleamNoPathDepsInPublished policy.

## Properties

### onlyPublishable?

> `optional` **onlyPublishable?**: `boolean`

Defined in: policies/GleamNoPathDepsInPublished.ts:19

If true, only check packages that don't have a "private" marker.
Since Gleam doesn't have a native "private" field, this checks for
the absence of a description (unpublished packages often lack one).

#### Default Value

```ts
false
```
