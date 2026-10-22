---
editUrl: false
next: false
prev: false
title: "PackageReadme"
---

> `const` **PackageReadme**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageReadmeSettings`](/api/index/interfaces/packagereadmesettings/) \| `undefined`\>

Defined in: policies/PackageReadme.ts:242

A repo policy that ensures each package has a README.md file with proper content.

## Remarks

This policy validates that packages have documentation and can enforce:
1. README.md file exists
2. README title matches the package name
3. README contains required content (e.g., trademark notices)

The policy supports auto-fixing by creating a basic README with the package name as title.

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageReadme } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    // Basic README validation
    makePolicy(PackageReadme),

    // Require trademark notice in all READMEs
    makePolicy(PackageReadme, {
      requiredContent: "## Trademark",
    }),
  ],
};
```
