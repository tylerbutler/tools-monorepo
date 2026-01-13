# Handoff: Split errorMessages API Change from cli-api/loggers PR

## Context

The `feat/cli-api/loggers` branch contains an unrelated breaking change to the repopo package: changing `errorMessage: string` to `errorMessages: string[]` in the `PolicyFailure` and `PolicyFixResult` interfaces. This change should be in its own PR, not mixed with the logger refactoring.

## Current State

- **Branch**: `feat/cli-api/loggers`
- **PR**: #395
- **Problem**: The repopo `errorMessages` API change (commit `5edb288f`) is unrelated to cli-api logger work

### Files Changed for errorMessages

**Source files (API change):**
- `packages/repopo/src/policy.ts` - Interface change from `errorMessage?: string` to `errorMessages: string[]`
- `packages/repopo/src/policies/*.ts` - All policy implementations updated to use arrays
- `packages/repopo/src/adapters/fluidFramework.ts` - Adapter updated

**Test files (updated to match API):**
- `packages/repopo/test/policies/PackageReadme.test.ts`
- `packages/repopo/test/policies/PackageLicense.test.ts`
- `packages/repopo/test/policies/PackagePrivateField.test.ts`
- `packages/repopo/test/policies/PackageScripts.test.ts`
- `packages/repopo/test/policies/PackageTestScripts.test.ts`
- `packages/repopo/test/policies/NoPrivateWorkspaceDependencies.test.ts`
- `packages/repopo/test/policies/PackageAllowedScopes.test.ts`
- `packages/repopo/test/policies/PackageEsmType.test.ts`
- `packages/repopo/test/policies/PackageFolderName.test.ts`
- `packages/repopo/test/adapters/fluidFramework.test.ts`

## Recommended Approach

### Step 1: Create a new branch from main for the errorMessages change

```bash
git checkout main
git pull
git checkout -b feat/repopo/errorMessages-api
```

### Step 2: Cherry-pick or recreate the errorMessages changes

Option A - Cherry-pick relevant commits:
```bash
# Find the commit that introduced errorMessages change
git log --oneline feat/cli-api/loggers -- packages/repopo/src/policy.ts
# Cherry-pick that commit and the test fix commit
git cherry-pick 5edb288f  # "loggers" commit with the API change
git cherry-pick 7c0c89b9  # "fix(repopo): complete errorMessages API migration"
```

Option B - If cherry-pick is messy, manually apply:
1. Change `errorMessage?: string` to `errorMessages: string[]` in `policy.ts`
2. Update all policy implementations to use `errorMessages: [...]`
3. Update all tests to use `result.errorMessages.join()` instead of `result.errorMessage`

### Step 3: Create PR for errorMessages change, merge to main

### Step 4: Rebase feat/cli-api/loggers on main

```bash
git checkout feat/cli-api/loggers
git rebase main
# Resolve conflicts - the errorMessages changes should auto-resolve since they're now in main
```

### Step 5: Remove the errorMessages commits from feat/cli-api/loggers

After rebase, the errorMessages changes should be in main, so the branch should be clean. If not, use interactive rebase to drop those commits.

## Key Commits to Reference

- `5edb288f` - "loggers" - Contains the errorMessages API change (mixed with other changes)
- `7c0c89b9` - "fix(repopo): complete errorMessages API migration" - Test updates

## Test Commands

```bash
# Verify repopo tests pass after changes
cd packages/repopo && pnpm vitest run

# Full test suite
pnpm test
```

## Notes

- The test pattern change is: `result.errorMessage` → `result.errorMessages.join()`
- This handles both single and multiple error messages correctly
- The API change allows policies to report multiple errors in one failure
