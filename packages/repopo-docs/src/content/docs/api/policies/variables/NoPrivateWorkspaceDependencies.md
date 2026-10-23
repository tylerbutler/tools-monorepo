---
editUrl: false
next: false
prev: false
title: "NoPrivateWorkspaceDependencies"
---

> `const` **NoPrivateWorkspaceDependencies**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`NoPrivateWorkspaceDependenciesSettings`](/api/index/interfaces/noprivateworkspacedependenciessettings/) \| `undefined`\>

Defined in: [policies/NoPrivateWorkspaceDependencies.ts:128](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoPrivateWorkspaceDependencies.ts#L128)

Policy that prevents publishable packages from depending on private workspace packages.

A package is considered "publishable" if it does not have `"private": true` in its package.json.
Such packages cannot have `workspace:` dependencies on packages that are marked as private,
because those dependencies won't be resolvable when the package is published to npm.

This policy uses the workspace configuration (pnpm-workspace.yaml or package.json workspaces field)
to locate workspace packages, rather than hardcoding directory conventions.

## Example

```typescript
// In repopo.config.ts
import { NoPrivateWorkspaceDependencies } from "repopo/policies";

makePolicy(NoPrivateWorkspaceDependencies, {
  checkDevDependencies: false, // Only check production dependencies (default)
});

// Or check both dependencies and devDependencies
makePolicy(NoPrivateWorkspaceDependencies, {
  checkDevDependencies: true,
});
```
