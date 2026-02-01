# CLAUDE.md - repopo

Package-specific guidance for the repository policy enforcement tool.

## Package Overview

Extensible policy enforcement tool that validates and auto-fixes files in git repositories. Think of it as a lint tool for any file type, with straightforward custom policy creation.

**Binary:** `repopo`
**Dev Mode:** `./bin/dev.js`
**Config:** `repopo.config.ts` (or `.cjs`, `.mjs`) in repo root

## Core Architecture

### Policy System

Policies are objects that implement the `PolicyDefinition<C>` interface:

```typescript
interface PolicyDefinition<C = undefined> {
  name: PolicyName;              // Display name
  description: string;           // Detailed description (required)
  match: RegExp;                 // File path regex
  handler: PolicyHandler<C>;     // Check function
  resolver?: PolicyStandaloneResolver<C>;  // Optional auto-fix
  defaultConfig?: C;             // Default configuration
}
```

**Policy Execution Flow:**
1. Enumerate all files in git repo
2. For each file, test against all policy `match` regexes
3. If match, call `handler(file, root, resolve, config)`
4. Handler returns `true` or `PolicyFailure`
5. If `resolve=true` and policy has `resolver`, auto-fix

### Handler Function

```typescript
type PolicyHandler<C> = (args: {
  file: string;    // Repo-relative path
  root: string;    // Absolute repo root
  resolve: boolean; // If true, apply auto-fixes
  config?: C;      // Policy configuration
}) => Promise<PolicyHandlerResult>;

type PolicyHandlerResult = true | PolicyFailure | PolicyFixResult;
```

**Return values:**
- `true` - File passes policy
- `PolicyFailure` - File fails (includes `autoFixable` flag)
- `PolicyFixResult` - Failure with `resolved: boolean` field

### Configuration System

Policies are configured in `repopo.config.ts`:

```typescript
import { makePolicy, type RepopoConfig } from "repopo";
import { PackageJsonProperties } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackageJsonProperties, {
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
- Per-policy: `makePolicy(Policy, config, { excludeFiles: [...] })`

## Built-in Policies

**File Headers:**
- `HtmlFileHeaders` - Enforce headers in HTML files
- `JsTsFileHeaders` - Enforce headers in JS/TS files

**Package.json:**
- `PackageJsonProperties` - Enforce specific fields/values
- `PackageJsonRepoDirectoryProperty` - Validate `repository.directory`
- `PackageJsonSorted` - Enforce sorted keys (uses `sort-package-json`)
- `PackageScripts` - Validate npm scripts

**Code Standards:**
- `NoJsFileExtensions` - Prevent ambiguous `.js` files (require `.mjs`/`.cjs`)

All built-in policies are **enabled by default** via `DefaultPolicies` array.

## Policy Generators

Helper functions to reduce boilerplate for common file types:

### generatePackagePolicy

Creates policies for `package.json` files:

```typescript
import { generatePackagePolicy, makePolicy } from "repopo";

const MyPackagePolicy = generatePackagePolicy(
  "MyPackagePolicy",
  async ({ content, resolve, config }) => {
    // content: parsed package.json
    // Return true or PolicyFailure
    if (content.version === "0.0.0") {
      return {
        name: "MyPackagePolicy",
        file: "package.json",
        errorMessage: "Version must not be 0.0.0",
        autoFixable: false,
      };
    }
    return true;
  }
);

// Use in config
const config: RepopoConfig = {
  policies: [makePolicy(MyPackagePolicy)],
};
```

## Creating Custom Policies

### Simple Policy

```typescript
import { Policy, type PolicyHandler } from "repopo";

const handler: PolicyHandler = async ({ file, root, resolve, config }) => {
  const absolutePath = path.join(root, file);
  const content = await fs.readFile(absolutePath, "utf-8");

  if (content.includes("TODO")) {
    return {
      name: "NoTodoComments",
      file,
      errorMessage: "File contains TODO comments",
      autoFixable: true,
    };
  }

  return true;
};

export const NoTodoComments = new Policy({
  name: "NoTodoComments",
  description: "Prevents TODO comments in code",
  match: /\.(ts|js)$/,  // Match TypeScript/JavaScript files
  handler,
});
```

### Policy with Auto-Fix

```typescript
const handlerWithFix: PolicyHandler = async ({ file, root, resolve }) => {
  const absolutePath = path.join(root, file);
  let content = await fs.readFile(absolutePath, "utf-8");

  if (content.includes("TODO")) {
    if (resolve) {
      // Auto-fix: remove TODO lines
      content = content.split("\n")
        .filter(line => !line.includes("TODO"))
        .join("\n");
      await fs.writeFile(absolutePath, content);

      return {
        name: "NoTodoComments",
        file,
        resolved: true,
        errorMessage: "Removed TODO comments",
      };
    }

    return {
      name: "NoTodoComments",
      file,
      autoFixable: true,
      errorMessage: "File contains TODO comments",
    };
  }

  return true;
};
```

### Policy with Configuration

```typescript
interface TodoPolicyConfig {
  allowedKeywords: string[];
}

const handler: PolicyHandler<TodoPolicyConfig> = async ({
  file, root, resolve, config
}) => {
  const allowed = config?.allowedKeywords ?? ["TODO"];
  // Use config.allowedKeywords in validation logic
};

export const ConfigurableTodoPolicy = new Policy<TodoPolicyConfig>({
  name: "ConfigurableTodoPolicy",
  description: "Configurable TODO validation",
  match: /\.(ts|js)$/,
  handler,
  defaultConfig: { allowedKeywords: ["TODO", "FIXME"] },
});
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
import { makePolicy, type RepopoConfig } from "repopo";
import {
  NoJsFileExtensions,
  PackageJsonProperties,
  PackageJsonSorted,
} from "repopo/policies";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
  policies: [
    makePolicy(NoJsFileExtensions, undefined, {
      excludeFiles: [".*/bin/.*js"],  // Exclude bin scripts
    }),
    makePolicy(PackageJsonProperties, {
      verbatim: {
        license: "MIT",
        author: "Tyler Butler <tyler@tylerbutler.com>",
      },
    }),
    makePolicy(PackageJsonSorted),
    makePolicy(SortTsconfigsPolicy),  // External policy from another package
  ],
};

export default config;
```

### External Policies

Other packages can export policies (e.g., `sort-tsconfig` exports `SortTsconfigsPolicy`):

```typescript
// In sort-tsconfig package
export const SortTsconfigsPolicy: PolicyDefinition = { /* ... */ };

// In repopo.config.ts
import { SortTsconfigsPolicy } from "sort-tsconfig";
const config: RepopoConfig = {
  policies: [makePolicy(SortTsconfigsPolicy)],
};
```

## API Exports

```typescript
// Core exports
import { makePolicy, generatePackagePolicy } from "repopo";
import type {
  RepopoConfig,
  PolicyDefinition,
  PolicyHandler,
  PolicyFailure,
} from "repopo";

// Built-in policies
import {
  HtmlFileHeaders,
  JsTsFileHeaders,
  NoJsFileExtensions,
  PackageJsonProperties,
  PackageJsonRepoDirectoryProperty,
  PackageJsonSorted,
  PackageScripts,
} from "repopo/policies";

// API utilities
import type { /* advanced types */ } from "repopo/api";
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
  expect(result).toHaveProperty("errorMessage");
});
```

## Key Constraints

- Policies must return `true` or `PolicyFailure`/`PolicyFixResult`
- File paths in `match` regex are relative to repo root
- `resolve=true` means auto-fix should be applied (if supported)
- All built-in policies are enabled by default
- Config file must have default export of type `RepopoConfig`
- Policies run on all files in git repo (respecting `.gitignore`)
