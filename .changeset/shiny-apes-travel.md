---
"repopo": minor
---

Add multiple new policies and enhance existing PackageScripts policy

## New Policies

### PackageAllowedScopes
Validates that packages use only approved npm scopes or package names, preventing accidental
introduction of new scopes and maintaining naming consistency.

### PackageLicense
Ensures each package has a LICENSE file that matches the root repository LICENSE. Supports
auto-fixing by copying the root LICENSE to packages. By default, skips private packages.

### PackageReadme
Validates that packages have README.md files with proper content:
- Ensures README exists
- Validates title matches package name
- Can require specific content (e.g., trademark notices)
- Supports auto-fixing by creating or updating README files

## Enhanced PackageScripts Policy

Added powerful new validation options with a cleaner, more intuitive configuration API.

### must (enhanced)
The `must` array now accepts either strings (script must exist, no auto-fix) or objects with
inline default values (script must exist, auto-fixable with the default):

```typescript
must: [
  "test",                        // Must exist, no auto-fix available
  { build: "tsc" },              // Must exist, auto-fix adds "tsc" if missing
  { lint: "biome lint ." },      // Must exist, auto-fix adds "biome lint ." if missing
]
```

Existing scripts with different content will pass validation - only the existence is enforced.

### exact (new)
Scripts that must exist AND have exact content. Both missing and mismatched scripts are
auto-fixable:

```typescript
exact: {
  clean: "rimraf dist esm",
  format: "biome format --write .",
}
```

### conditionalRequired (enhanced)
Enforce that certain scripts must exist when other scripts are present. The `requires` field
now accepts the same format as `must` - strings or objects with inline defaults for auto-fix:

```typescript
// With inline default - auto-fixable
conditionalRequired: [{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] }]

// Mixed: "test" required without default, "clean" with default
conditionalRequired: [{ ifPresent: "build", requires: ["test", { clean: "rimraf dist" }] }]
```

### scriptMustContain
Validate that script bodies contain required substrings:

```typescript
scriptMustContain: [{ script: "clean", mustContain: ["rimraf"] }]
```

## Usage Examples

```typescript
import { makePolicy, type RepopoConfig } from "repopo";
import {
  PackageAllowedScopes,
  PackageLicense,
  PackageReadme,
  PackageScripts,
} from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackageAllowedScopes, {
      allowedScopes: ["@myorg", "@internal"],
    }),
    makePolicy(PackageLicense),
    makePolicy(PackageReadme, {
      requiredContent: "## Trademark",
    }),
    makePolicy(PackageScripts, {
      // Scripts that must exist
      must: [
        "test",                        // Must exist, no auto-fix
        { build: "tsc" },              // Must exist, auto-fix available
        { lint: "biome lint ." },      // Must exist, auto-fix available
      ],
      // Scripts that must exist AND match exactly
      exact: {
        clean: "rimraf dist esm",
        format: "biome format --write .",
      },
      // If "build" exists, "clean" must also exist (with inline auto-fix default)
      conditionalRequired: [{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] }],
      // Validate script content contains required substrings
      scriptMustContain: [{ script: "build", mustContain: ["tsc"] }],
      // Only one of these can exist
      mutuallyExclusive: [["lint:eslint", "lint:biome"]],
    }),
  ],
};
```
