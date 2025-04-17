---
editUrl: false
next: false
prev: false
title: "PropertySetterObject"
---

Defined in: [policies/PackageJsonProperties.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageJsonProperties.ts#L27)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, [`PropertySetter`](/api/type-aliases/propertysetter/)\[keyof [`PropertySetter`](/api/type-aliases/propertysetter/)\]\>

## Indexable

\[`key`: `string`\]: [`PropertySetterObject`](/api/interfaces/propertysetterobject/) \| (`prop`, `json`, `file`, `root`) => `JsonValue`
