# CLAUDE.md - repopo

Package-specific guidance for the repository policy enforcement tool.

## Package Overview

Extensible policy enforcement tool that validates and auto-fixes files in git repositories. Think of it as a lint tool for any file type, with straightforward custom policy creation.

**Binary:** `repopo`
**Dev Mode:** `./bin/dev.js`
**Config:** `repopo.config.ts` (or `.cjs`, `.mjs`) in repo root

## Core Architecture

### Policy System

Policies are objects that implement the `PolicyShape<C>` interface:

```typescript
interface PolicyShape<C = void> {
  name: PolicyName;              // Display name
  description: string;           // Detailed description (required)
  match: RegExp;                 // File path regex
  handler: PolicyHandler<C>;     // Check function (async or generator)
  resolver?: PolicyResolver<C>;  // Optional auto-fix
  defaultConfig?: C;             // Default configuration
}
```

**Policy Execution Flow:**
1. Enumerate all files in git repo
2. For each file, test against all policy `match` regexes
3. If match, call `handler({ file, root, resolve, config })`
4. Handler returns `true` or `PolicyError`
5. If `resolve=true`, handler can apply auto-fixes

### Handler Function

Handlers can be async functions OR Effection generators (for resource cleanup):

```typescript
type PolicyHandler<C> =
  | ((args: PolicyArgs<C>) => Promise<PolicyResult>)
  | ((args: PolicyArgs<C>) => Operation<PolicyResult>);

interface PolicyArgs<C> {
  file: string;    // Repo-relative path
  root: string;    // Absolute repo root
  resolve: boolean; // If true, apply auto-fixes
  config?: C;      // Policy configuration
}

type PolicyResult = true | PolicyError;
```

**Return values:**
- `true` - File passes policy
- `PolicyError` - File fails with details

### PolicyError Format

The new simplified error format:

```typescript
interface PolicyError {
  error: string;        // Single error message
  fixable?: boolean;    // Can be auto-fixed?
  fixed?: boolean;      // Was it fixed? (only when resolve=true)
  manualFix?: string;   // Instructions for manual fix
}
```

### Configuration System

Policies are configured in `repopo.config.ts` using the `policy()` function:

```typescript
import { policy, type RepopoConfig } from "repopo";
import { PackageJsonProperties } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    policy(PackageJsonProperties, {
      verbatim: {
        license: "MIT",
        author: "Tyler Butler <tyler@tylerbutler.com>",
      },
    }),
  ],
};

export default config;
```

**File Exclusion:**
- Global: `RepopoConfig.excludeFiles` (excludes from all policies)
- Per-policy: `policy(Policy, config, { exclude: [...] })`

## Built-in Policies

**File Headers:**
- `HtmlFileHeaders` - Enforce headers in HTML files
- `JsTsFileHeaders` - Enforce headers in JS/TS files

**Package.json:**
- `PackageJsonProperties` - Enforce specific fields/values
- `PackageJsonRepoDirectoryProperty` - Validate `repository.directory`
- `PackageJsonSorted` - Enforce sorted keys (uses `sort-package-json`)

**Script Validation (Focused Policies):**
- `RequiredScripts` - Scripts that must exist (with optional defaults)
- `ExactScripts` - Scripts that must match exactly
- `MutuallyExclusiveScripts` - At most one script from a group
- `ConditionalScripts` - If script X exists, script Y must exist
- `ScriptContains` - Script body must contain substring

**Code Standards:**
- `NoJsFileExtensions` - Prevent ambiguous `.js` files (require `.mjs`/`.cjs`)
- `NoLargeBinaryFiles` - Prevent large binary files in repo

**Legacy:**
- `PackageScripts` - Monolithic script validation (prefer focused policies above)

All built-in policies are **enabled by default** via `DefaultPolicies` array.

## Policy Generators

Helper functions to reduce boilerplate for common file types:

### definePackagePolicy

Creates policies for `package.json` files with automatic JSON parsing:

```typescript
import { definePackagePolicy } from "repopo";

export const MyPackagePolicy = definePackagePolicy({
  name: "MyPackagePolicy",
  description: "Validates package.json version",
  // Handler receives parsed JSON as first argument
  handler: async (json, { file, resolve }) => {
    if (json.version === "0.0.0") {
      return {
        error: "Version must not be 0.0.0",
        fixable: false,
      };
    }
    return true;
  },
});

// Use in config
import { policy, type RepopoConfig } from "repopo";
const config: RepopoConfig = {
  policies: [policy(MyPackagePolicy)],
};
```

## Creating Custom Policies

### Simple Policy

```typescript
import type { PolicyShape } from "repopo";

export const NoTodoComments: PolicyShape = {
  name: "NoTodoComments",
  description: "Prevents TODO comments in code",
  match: /\.(ts|js)$/,
  handler: async ({ file, root }) => {
    const absolutePath = path.join(root, file);
    const content = await fs.readFile(absolutePath, "utf-8");

    if (content.includes("TODO")) {
      return {
        error: "File contains TODO comments",
        fixable: true,
      };
    }

    return true;
  },
};
```

### Policy with Auto-Fix

```typescript
export const NoTodoComments: PolicyShape = {
  name: "NoTodoComments",
  description: "Prevents TODO comments in code",
  match: /\.(ts|js)$/,
  handler: async ({ file, root, resolve }) => {
    const absolutePath = path.join(root, file);
    let content = await fs.readFile(absolutePath, "utf-8");

    if (content.includes("TODO")) {
      if (resolve) {
        // Auto-fix: remove TODO lines
        content = content.split("\n")
          .filter(line => !line.includes("TODO"))
          .join("\n");
        await fs.writeFile(absolutePath, content);
        return { error: "Removed TODO comments", fixed: true };
      }

      return { error: "File contains TODO comments", fixable: true };
    }

    return true;
  },
};
```

### Policy with Configuration

```typescript
interface TodoPolicyConfig {
  allowedKeywords: string[];
}

export const ConfigurableTodoPolicy: PolicyShape<TodoPolicyConfig> = {
  name: "ConfigurableTodoPolicy",
  description: "Configurable TODO validation",
  match: /\.(ts|js)$/,
  defaultConfig: { allowedKeywords: ["TODO", "FIXME"] },
  handler: async ({ file, root, config }) => {
    const allowed = config?.allowedKeywords ?? ["TODO"];
    // Use config.allowedKeywords in validation logic
    return true;
  },
};
```

## CLI Commands

```bash
# Check all files (read-only)
repopo check

# Check and auto-fix
repopo check --fix

# Check specific files via stdin
git diff --name-only | repopo check --stdin

# List configured policies
repopo list

# Dev mode
./bin/dev.js check --fix
```

**Typical CI Usage:**
```bash
# Fail CI if policies don't pass
repopo check

# Pre-commit hook (auto-fix)
repopo check --fix --stdin
```

## Development Commands

```bash
# Run checks on this repo
./bin/dev.js check

# Fix policy violations
./bin/dev.js check --fix

# Test policy on specific files
echo "packages/cli/package.json" | ./bin/dev.js check --stdin

# Build and test
pnpm build
pnpm test
```

## Integration Patterns

### Monorepo Usage

Place `repopo.config.ts` at monorepo root:

```typescript
import { policy, type RepopoConfig } from "repopo";
import {
  NoJsFileExtensions,
  PackageJsonProperties,
  PackageJsonSorted,
  RequiredScripts,
} from "repopo/policies";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
  policies: [
    // Policy with no config, just exclusions
    policy(NoJsFileExtensions, { exclude: [".*/bin/.*js"] }),

    // Policy with config
    policy(PackageJsonProperties, {
      verbatim: {
        license: "MIT",
        author: "Tyler Butler <tyler@tylerbutler.com>",
      },
    }),

    // Policy with no config (uses defaults)
    policy(PackageJsonSorted),

    // Focused script policy
    policy(RequiredScripts, {
      scripts: [
        { name: "build", default: "tsc" },
        { name: "test" },
      ],
    }),

    // External policy from another package
    policy(SortTsconfigsPolicy),
  ],
};

export default config;
```

### External Policies

Other packages can export policies (e.g., `sort-tsconfig` exports `SortTsconfigsPolicy`):

```typescript
// In sort-tsconfig package
export const SortTsconfigsPolicy: PolicyShape = { /* ... */ };

// In repopo.config.ts
import { SortTsconfigsPolicy } from "sort-tsconfig";
const config: RepopoConfig = {
  policies: [policy(SortTsconfigsPolicy)],
};
```

## API Exports

```typescript
// Core exports
import { policy, generatePackagePolicy } from "repopo";
import type {
  RepopoConfig,
  PolicyShape,
  PolicyHandler,
  PolicyArgs,
  PolicyResult,
  PolicyError,
} from "repopo";

// Built-in policies
import {
  HtmlFileHeaders,
  JsTsFileHeaders,
  NoJsFileExtensions,
  PackageJsonProperties,
  PackageJsonRepoDirectoryProperty,
  PackageJsonSorted,
  // Focused script policies
  RequiredScripts,
  ExactScripts,
  MutuallyExclusiveScripts,
  ConditionalScripts,
  ScriptContains,
} from "repopo/policies";

// Legacy (for backward compatibility)
import { makePolicy } from "repopo"; // Use policy() instead
import type { PolicyFailure, PolicyFixResult } from "repopo";
```

## Testing Policies

```typescript
// Example test structure
import { test, expect } from "vitest";
import { MyPolicy } from "./myPolicy.js";
import tmp from "tmp-promise";
import { writeFile } from "node:fs/promises";

test("MyPolicy fails on invalid file", async () => {
  const { path: tmpDir } = await tmp.dir();
  const testFile = "test.ts";
  await writeFile(`${tmpDir}/${testFile}`, "invalid content");

  const result = await MyPolicy.handler({
    file: testFile,
    root: tmpDir,
    resolve: false,
    config: undefined,
  });

  expect(result).not.toBe(true);
  expect(result).toHaveProperty("error"); // New format uses "error"
});
```

## Key Constraints

- Policies must return `true` or `PolicyError`
- Handlers can be async functions or Effection generators
- File paths in `match` regex are relative to repo root
- `resolve=true` means auto-fix should be applied (if supported)
- All built-in policies are enabled by default
- Config file must have default export of type `RepopoConfig`
- Policies run on all files in git repo (respecting `.gitignore`)
- Use `policy()` function to configure policies (not `makePolicy()`)


<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>