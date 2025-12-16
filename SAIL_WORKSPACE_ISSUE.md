# Sail Workspace Detection Issue - Diagnostic Report

## Problem Summary

Sail fails to build the tools-monorepo due to duplicate package names across test fixture workspaces:

```
KeyAlreadySet: Key "second-release-group-root" is already set and cannot be modified.
```

## Root Cause Analysis

### 1. Multiple Workspaces with Duplicate Packages

Sail discovers ALL workspaces in the repository, including test fixtures:

```
testRepo/second (WORKSPACE)
  └── second-release-group-root  ❌

bun-workspace (WORKSPACE)
  └── second-release-group-root  ❌ DUPLICATE!
```

These test workspaces are located at:
- `/packages/sail-infrastructure/src/test/data/testRepo/second/`
- `/packages/sail-infrastructure/src/test/data/testRepoNoConfig/bun-workspace/`

### 2. Configuration Bug in Sail

The `excludeGlobs` configuration in `sail.config.cjs` doesn't work as expected due to a bug in `packages/sail-infrastructure/src/buildProject.ts`:

**File: `buildProject.ts` (lines 86-96)**
```typescript
if (
  isV2Config(this.configuration) &&
  this.configuration.excludeGlobs !== undefined
) {
  // BUG: When excludeGlobs is present, the code regenerates
  // the config from scratch WITHOUT using those globs!
  this.configuration = generateBuildProjectConfig(searchPath);
  this.configFilePath = searchPath;
  this.configurationSource = "INFERRED";
  this.root = searchPath;
}
```

**What should happen:**
- User provides `excludeGlobs` in `sail.config.cjs`
- Sail uses those patterns to filter out test workspaces

**What actually happens:**
- Sail detects `excludeGlobs` is present
- Sail **throws away** the user's config
- Sail calls `generateBuildProjectConfig()` which scans ALL directories
- User's `excludeGlobs` are completely ignored

**Why it happens:**
The `generateBuildProjectConfig()` function (line 243) takes NO parameters for excludeGlobs. It only respects the `SAIL_IGNORE_FILES` environment variable.

## Workaround: Use Environment Variable

Sail supports the `SAIL_IGNORE_FILES` environment variable which DOES work:

```bash
export SAIL_IGNORE_FILES="**/test/**,**/tests/**,**/__tests__/**,**/fixtures/**"
./packages/sail/bin/run.js build fundamentals --task build:compile --cacheDir .sail-cache
```

**Result:** ✅ Works! Only detects the main `tools-monorepo` workspace.

## Verification

### Before (with config file only):
```bash
$ ./packages/sail/bin/run.js scan | grep WORKSPACE | wc -l
9  # Detects test fixtures ❌
```

### After (with environment variable):
```bash
$ SAIL_IGNORE_FILES="**/test/**,**/tests/**" ./packages/sail/bin/run.js scan | grep WORKSPACE
tools-monorepo (WORKSPACE): /home/user/tools-monorepo  # Only main workspace ✅
```

### Build Test:
```bash
$ SAIL_IGNORE_FILES="**/test/**,**/tests/**,**/__tests__/**,**/fixtures/**" \
  ./packages/sail/bin/run.js build fundamentals --task build:compile --cacheDir .sail-cache

✓ Success - builds in 2.1s
```

## Fix Required in Sail

The proper fix would be to modify `buildProject.ts`:

1. Update `generateBuildProjectConfig()` to accept `excludeGlobs` as a parameter:
   ```typescript
   export function generateBuildProjectConfig(
     searchPath: string,
     excludeGlobs?: string[]  // Add this parameter
   ): BuildProjectConfigV2
   ```

2. Pass user-provided `excludeGlobs` to the ignore patterns:
   ```typescript
   const ignorePatterns = ["**/node_modules/**"];

   // Add user-provided excludeGlobs
   if (excludeGlobs) {
     ignorePatterns.push(...excludeGlobs);
   }
   ```

3. Update the caller to pass the globs:
   ```typescript
   if (
     isV2Config(this.configuration) &&
     this.configuration.excludeGlobs !== undefined
   ) {
     // Pass the user's globs instead of ignoring them
     this.configuration = generateBuildProjectConfig(
       searchPath,
       this.configuration.excludeGlobs  // Pass this through
     );
   }
   ```

## Recommendation for Benchmark Script

Update `scripts/benchmark-sail-vs-nx.sh` to export the environment variable:

```bash
# Add at the top of the script
export SAIL_IGNORE_FILES="**/test/**,**/tests/**,**/__tests__/**,**/fixtures/**"
```

This will allow Sail benchmarking to work without code changes to Sail itself.

## Related Files

- **Config bug:** `packages/sail-infrastructure/src/buildProject.ts:86-96`
- **Generator function:** `packages/sail-infrastructure/src/buildProject.ts:243-302`
- **Test fixtures causing conflict:**
  - `packages/sail-infrastructure/src/test/data/testRepo/second/`
  - `packages/sail-infrastructure/src/test/data/testRepoNoConfig/bun-workspace/`
- **Benchmark script:** `scripts/benchmark-sail-vs-nx.sh`
- **Sail config:** `sail.config.cjs`
