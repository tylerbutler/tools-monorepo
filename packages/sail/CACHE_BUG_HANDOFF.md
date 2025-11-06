# Cache Restoration Bug Investigation - Handoff Document

**Date**: November 5, 2024  
**Status**: Bug NOT reproduced in fixture; needs FluidFramework testing

## Summary

Investigated the cache restoration bug documented in `CACHE_RESTORATION_BUG_INVESTIGATION.md`. Created a new fixture with TypeScript project references but **the bug was NOT reproduced** - cache restoration works perfectly (100% hit rate).

## What Was Done

### 1. Created New Fixture: `typescript-project-references`

**Location**: `test/integration/fixtures/cache-validity/typescript-project-references/`

**Structure**:
- Single package `lib-a` with main and test compilation
- Main compilation: `tsconfig.json` with `composite: true`
- Test compilation: `src/test/tsconfig.json` with project reference to parent:
  ```json
  "references": [{ "path": "../.." }]
  ```
- Two Sail tasks:
  - `build`: Compiles main source (`tsc --build`)
  - `build:test`: Compiles test source with reference (`tsc --build src/test/tsconfig.json`)

**Key Files Created**:
- `packages/lib-a/package.json` - defines both build scripts, has `typescript` as devDependency
- `packages/lib-a/tsconfig.json` - main compilation config
- `packages/lib-a/src/test/tsconfig.json` - test compilation with project reference
- `packages/lib-a/src/index.ts` - simple source file
- `packages/lib-a/src/test/index.test.ts` - test file importing from main
- `sail.config.cjs` - defines both tasks with cache config
- `pnpm-workspace.yaml` - workspace setup
- `package.json` - root workspace package

### 2. Created Integration Test

**File**: `test/integration/scenarios/typescript-project-references-cache.integration.test.ts`

**Test Flow**:
1. Build 1: Initial build (both tasks execute, cache written)
2. Clean outputs and donefiles  
3. Build 2: Rebuild (should restore from cache)

**Expected**: Tasks should restore from cache (bug would cause rebuilds)  
**Actual**: ✅ All tasks restored from cache perfectly!

### 3. Test Results

```
Build 1 (initial):
  Total tasks: 2
  Tasks built: 2
  Cache entries created: 2
  Shared cache misses: 2

Build 2 (after cleaning):
  Total tasks: 2
  Tasks built: 0  ✅
  Cache hits: 2  ✅
  Shared cache hits: 2  ✅
  100% cache hit rate
```

## Key Findings

1. **TypeScript project references alone do NOT trigger the bug**
2. **Cache restoration works correctly** with the reference setup
3. **The bug requires additional conditions** beyond what we've captured

## Original Bug Description (from investigation doc)

**FluidFramework @fluidframework/core-interfaces**:
- Build 1: 5 tasks (2 cache hits, 3 misses - 40% hit rate)
- Build 2 after cleaning: 7 tasks (4 cache hits, 3 misses - 57% hit rate)
- **Problem**: Test compilation tasks (`tsc test`, `fluid-tsc test cjs`, `tsc test no-exact`) always rebuild instead of restoring from cache

## Possible Missing Conditions

The bug might require:

1. **Multi-package monorepo dependencies**: FluidFramework has complex cross-package dependencies
2. **Multiple test configurations**: FluidFramework has 3 different test compilation tasks (test, test cjs, test no-exact)
3. **Specific TypeScript settings**: Different compiler options or project structure
4. **Already fixed**: Recent code changes may have resolved it
5. **Different cache key inputs**: Something about how cache keys are computed in FluidFramework

## Next Steps

### Option A: Test with Actual FluidFramework Repository

1. Navigate to FluidFramework repo: `/home/tylerbu/code/claude-workspace-fluid/FluidFramework`
2. Test `@fluidframework/core-interfaces` package:
   ```bash
   cd FluidFramework/packages/common/core-interfaces
   ```
3. Build 1 with debug:
   ```bash
   cd /home/tylerbu/code/claude-workspace-fluid/FluidFramework
   DEBUG=sail:cache:key sail build -p @fluidframework/core-interfaces --all
   ```
4. Check what tasks ran and cache stats
5. Clean outputs:
   ```bash
   cd packages/common/core-interfaces
   rm -rf lib/ dist/ *.tsbuildinfo src/**/*.tsbuildinfo .sail-done-*
   ```
6. Build 2 with debug:
   ```bash
   cd /home/tylerbu/code/claude-workspace-fluid/FluidFramework
   DEBUG=sail:cache:key sail build -p @fluidframework/core-interfaces --all
   ```
7. Compare cache keys between builds

### Option B: Enhance Fixture to Match FluidFramework

Add to the fixture:
1. Multiple test compilation configurations (like cjs, esm, etc.)
2. Cross-package dependencies
3. More complex TypeScript project references
4. Match FluidFramework's exact tsconfig settings

### Option C: Analyze Cache Key Computation

1. Enable debug logging: `DEBUG=sail:cache:key`
2. Compare cache key inputs between Build 1 and Build 2
3. Look for differences in:
   - `inputHashes` (file content hashes)
   - `dependencyHashes` (hashes from dependent tasks)
   - Any timestamp-related data

## Important Code Locations

**Cache Key Computation**:
- `src/core/sharedCache/cacheKey.ts` - `computeCacheKey()` function
- `src/core/tasks/leaf/leafTask.ts` - `getDependencyHashes()` method
- `src/core/tasks/leaf/tscTask.ts` - `getDependencyHash()` override for TypeScript tasks

**Cache Restoration**:
- `src/core/tasks/leaf/leafTask.ts` - `tryRestoreFromCache()` method
- `src/core/sharedCache/sharedCacheManager.ts` - `restore()` and `lookup()` methods

**Integration Test Helpers**:
- `test/integration/support/buildGraphIntegrationHelper.ts` - Test execution helpers
- `test/integration/support/cacheValidationHelpers.ts` - Cache cleaning utilities

## Files Modified/Created in This Session

### Created:
- `test/integration/fixtures/cache-validity/typescript-project-references/` (entire fixture)
- `test/integration/scenarios/typescript-project-references-cache.integration.test.ts`

### Modified:
- `test/integration/CACHE_RESTORATION_BUG_INVESTIGATION.md` (added update section at end)

## Commands to Continue

**Run the test**:
```bash
cd /home/tylerbu/code/claude-workspace-fluid/tools-monorepo/packages/sail
pnpm vitest test/integration/scenarios/typescript-project-references-cache.integration.test.ts
```

**Test FluidFramework manually**:
```bash
cd /home/tylerbu/code/claude-workspace-fluid/FluidFramework
sail build --help  # See available options
sail scan .  # See repository structure
```

**Enable cache debugging**:
```bash
DEBUG=sail:cache:key,sail:cache:lookup,sail:cache:store sail build ...
```

## Questions to Answer

1. **Does the bug still exist in FluidFramework?** Test the actual repo to confirm
2. **What are the cache keys for test tasks?** Compare between builds to see what changes
3. **Do dependency hashes differ?** Check if restored files cause different `getDependencyHash()` values
4. **Are there multiple test task variants?** FluidFramework has test, test-cjs, test-no-exact

## Debugging Tips

1. **Check cache statistics**: Look at `sharedCache.getStatistics()` to see hit/miss counts
2. **Compare tsbuildinfo files**: Before/after cache restore - do they differ?
3. **Check file timestamps**: Do restored files have new timestamps that affect TypeScript?
4. **Trace cache key inputs**: Use `DEBUG=sail:cache:key` to see what goes into cache keys
5. **Check task types**: Are tasks using TscTask or LeafTask? Different caching behavior

## Current Hypothesis

The bug is **NOT** caused by TypeScript project references alone. It likely requires:
- Complex multi-package setup OR
- Multiple variant test tasks OR  
- Specific dependency chain structure OR
- Has already been fixed

**Priority**: Test with actual FluidFramework repository to confirm bug exists and identify triggering conditions.
