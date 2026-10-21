---
editUrl: false
next: false
prev: false
title: "ConfiguredRepositoryPolicy"
---

> **ConfiguredRepositoryPolicy**\<`C`\> = [`RepositoryPolicyDefinition`](/api/interfaces/repositorypolicydefinition/)\<`C`\> & [`Pick`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys)\<[`ConfiguredFilePolicy`](/api/interfaces/configuredfilepolicy/)\<`C`\>, `"instanceId"` \| `"config"` \| `"exclude"` \| `"excludeFiles"`\>

Defined in: [policy.ts:405](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L405)

A repository policy with instance identity, configuration, and file exclusions.

## Type Parameters

### C

`C` = `void`
