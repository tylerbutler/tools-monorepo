---
editUrl: false
next: false
prev: false
title: "RepopoConfig"
---

Defined in: [config.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L16)

Repository-wide policy configuration, exported as the default from `repopo.config.*`.

## Properties

### excludeFiles?

> `optional` **excludeFiles?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [config.ts:46](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L46)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from all policies.
Strings are case-insensitive regular expressions, not globs.
RegExp values retain their explicit flags.

***

### policies?

> `optional` **policies?**: ([`ConfiguredPolicy`](/api/type-aliases/configuredpolicy/)\<`any`\> \| [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`any`\>)[]

Defined in: [config.ts:38](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L38)

An array of configured policies that are enabled.

Use the `policy()` function to configure policies before adding them to this array.

#### Example

```typescript
import { policy, type RepopoConfig } from "repopo";
import { NoJsFileExtensions, PackageJsonProperties } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    policy(NoJsFileExtensions, undefined, { exclude: ["^bin/"] }),
    policy(PackageJsonProperties, { verbatim: { license: "MIT" } }),
  ],
};
```

See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.
