# Medium Priority Policies - Implementation Plan

This document outlines the medium priority policies identified from FluidFramework's build-tools that should be implemented in repopo.

## Overview

These policies enhance monorepo consistency but are less critical than the high-priority policies already implemented (PackagePrivateField, PackageAllowedScopes, enhanced PackageScripts, PackageLicense, PackageReadme).

---

## 1. PackageFolderName

**Purpose**: Ensure package folder names match package names for consistency.

**FluidFramework reference**: `npm-package-folder-name` handler

**Configuration**:
```typescript
interface PackageFolderNameSettings {
  // Whether to skip validation for scoped packages (use just the name part)
  // e.g., @myorg/foo should be in folder "foo", not "@myorg/foo"
  stripScope?: boolean; // default: true

  // Packages to exclude from validation (some may have legacy folder names)
  excludePackages?: string[];
}
```

**Validation logic**:
1. Extract package name from package.json
2. Get folder name from directory path
3. Compare (optionally stripping scope from package name)
4. Report mismatch if different

**Auto-fix**: Not auto-fixable (would require renaming directories)

**Implementation notes**:
- Use `definePackagePolicy` helper
- Skip private packages by default
- Handle scoped packages appropriately

---

## 2. PackageJsonPrettier

**Purpose**: Ensure format/prettier scripts are consistent across packages.

**FluidFramework reference**: `npm-package-json-prettier` handler

**Configuration**:
```typescript
interface PackageJsonPrettierSettings {
  // Expected format script patterns
  formatScript?: {
    name: string;        // e.g., "format"
    mustContain?: string[]; // e.g., ["prettier", "--write"]
  };

  // Expected check script patterns
  checkScript?: {
    name: string;        // e.g., "check:format" or "format:check"
    mustContain?: string[]; // e.g., ["prettier", "--check"]
  };
}
```

**Validation logic**:
1. Check if format-related scripts exist
2. Validate script bodies contain expected commands
3. Ensure consistency between format and check scripts

**Auto-fix**: Possibly auto-fixable for simple cases

**Implementation notes**:
- Could potentially be covered by enhanced PackageScripts `scriptMustContain`
- Consider if this should be a separate policy or an extension to PackageScripts

---

## 3. PackageCleanScript

**Purpose**: Validate clean scripts properly delete build outputs.

**FluidFramework reference**: `npm-package-json-clean-script` handler

**Configuration**:
```typescript
interface PackageCleanScriptSettings {
  // Required tool prefix (e.g., "rimraf --glob")
  requiredPrefix?: string;

  // Directories that must be cleaned if they would be built
  buildOutputDirs?: string[]; // e.g., ["dist", "esm", "lib", ".coverage"]

  // Whether to require double-quoted globs
  requireQuotedGlobs?: boolean;
}
```

**Validation logic**:
1. Check if clean script exists (use conditionalRequired from PackageScripts)
2. Validate clean script uses correct tool (rimraf preferred)
3. Ensure all build output directories are covered
4. Validate glob quoting for shell safety

**Auto-fix**: Can auto-fix by generating correct clean script

**Implementation notes**:
- FluidFramework requires `rimraf --glob` prefix
- Validates that all outputs from build script are cleaned
- Complex glob parsing may be needed

---

## 4. PackageEsmType

**Purpose**: Validate `type` field for ESM packages.

**FluidFramework reference**: `npm-package-json-esm` handler

**Configuration**:
```typescript
interface PackageEsmTypeSettings {
  // Expected type field value
  expectedType?: "module" | "commonjs";

  // Conditions that determine expected type
  conditions?: {
    // If exports field uses .mjs, require type: module
    inferFromExports?: boolean;
    // If main field ends with .mjs, require type: module
    inferFromMain?: boolean;
  };
}
```

**Validation logic**:
1. Analyze package exports/main fields
2. Determine expected `type` value
3. Validate current `type` matches expectation

**Auto-fix**: Can auto-fix by setting correct type field

**Implementation notes**:
- Important for Node.js ESM/CJS interoperability
- May interact with existing NoJsFileExtensions policy

---

## 5. PackageTestScripts

**Purpose**: Ensure test scripts exist when test files are present.

**FluidFramework reference**: `npm-package-json-test-scripts` handler

**Configuration**:
```typescript
interface PackageTestScriptsSettings {
  // Directories to check for test files
  testDirs?: string[]; // default: ["src/test", "test"]

  // Directories to exclude from test file detection
  excludeDirs?: string[]; // e.g., ["src/test/types"]

  // File patterns that indicate test files
  testFilePatterns?: string[]; // e.g., ["*.test.ts", "*.spec.ts"]

  // Required test script name
  testScriptName?: string; // default: "test"

  // Test framework dependencies that require test script
  testDependencies?: string[]; // e.g., ["vitest", "jest", "mocha"]
}
```

**Validation logic**:
1. Check if test files exist in expected directories
2. Check if test framework is in dependencies
3. If either condition met, require test script
4. Validate test script body if configured

**Auto-fix**: Not auto-fixable (requires understanding test setup)

**Implementation notes**:
- Prevents packages with tests from missing test scripts in CI
- Can use glob patterns for test file detection

---

## Implementation Priority Order

1. **PackageFolderName** - Simple validation, high value for consistency
2. **PackageEsmType** - Important for ESM migration
3. **PackageCleanScript** - Build hygiene, complex but valuable
4. **PackageTestScripts** - CI reliability
5. **PackageJsonPrettier** - May be covered by existing PackageScripts enhancements

---

## Shared Patterns

All policies should follow these patterns:

```typescript
// Use definePackagePolicy helper
export const PolicyName = definePackagePolicy<
  PackageJson,
  PolicySettings | undefined
>("PolicyName", async (json, { file, root, resolve, config }) => {
  // Skip private packages if appropriate
  if (config?.skipPrivate ?? true && json.private === true) {
    return true;
  }

  // Validation logic

  // Return true or PolicyFailure/PolicyFixResult
});
```

## Testing Patterns

Each policy needs tests for:
- Default config behavior
- All config options
- Edge cases (missing fields, empty arrays)
- Auto-fix when applicable
- Private package skipping
- Error message content
