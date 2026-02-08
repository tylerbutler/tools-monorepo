---
editUrl: false
next: false
prev: false
title: "RepopoConfig"
---

Defined in: [config.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L14)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [config.ts:42](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L42)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from all policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policies?

> `optional` **policies**: ([`ConfiguredPolicy`](/api/interfaces/configuredpolicy/)\<`any`\> \| [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`any`\>)[]

Defined in: [config.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L36)

An array of configured policies that are enabled.

Use the `policy()` function to configure policies before adding them to this array.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Example

```typescript
import { policy, type RepopoConfig } from "repopo";
import { NoJsFileExtensions, PackageJsonProperties } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    policy(NoJsFileExtensions, { exclude: ["bin/*"] }),
    policy(PackageJsonProperties, { verbatim: { license: "MIT" } }),
  ],
};
```

See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.
