# Cache Restoration Bug Investigation

## Problem Statement

When outputs are cleaned and restored from shared cache in the FluidFramework repository, some tasks are rebuilt instead of being restored from cache, despite cache entries existing for them. This results in ~57% cache hit rate instead of the expected 100%.

## Observed Behavior

### FluidFramework @fluidframework/core-interfaces package

**Build with outputs present (baseline):**
```
[1/5] ⇩ copyfiles - cache hit
[2/5] ⇩ flub generate typetests - cache hit
[3/5] ○ tsc test (donefile)
[4/5] ○ fluid-tsc test cjs (donefile)
[5/5] ○ tsc test no-exact (donefile)
Cache: 2 hits, 3 misses (40.0% hit rate)
```

**Build after cleaning all outputs + tsbuildinfo:**
```
[1/7] ⇩ flub generate typetests - 0.008s (CACHE HIT)
[2/7] ⇩ fluid-tsc commonjs - 0.039s (CACHE HIT)  
[3/7] ⇩ tsc project - 0.043s (CACHE HIT)
[4/7] ⇩ copyfiles - 0.003s (CACHE HIT)
[5/7] ⇧ tsc test - 7.503s (EXECUTED & WROTE TO CACHE) ❌
[6/7] ⇧ fluid-tsc test cjs - 7.914s (EXECUTED & WROTE TO CACHE) ❌
[7/7] ⇧ tsc test no-exact - 7.263s (EXECUTED & WROTE TO CACHE) ❌
Cache: 4 hits, 3 misses (57.1% hit rate)
```

### Simple Integration Test Fixture

**Same scenario - different result:**
```
Build 1: 12 tasks built, 0 cached
Build 2 (after cleaning): 0 tasks built, 12 cached (100% hit rate) ✅
```

## Root Cause Analysis

### Hypothesis 1: TypeScript Timestamps (RULED OUT)
- **Theory**: Restored files have new timestamps, causing TypeScript to rebuild dependent tasks
- **Finding**: TypeScript uses content hashes, not timestamps, in tsbuildinfo files
- **Test**: Removed tsbuildinfo files - no change in behavior
- **Conclusion**: NOT the root cause

### Hypothesis 2: Cache Key Mismatch (LIKELY)
- **Theory**: Test compilation tasks have different cache keys on Build 2 vs Build 1
- **Evidence**:
  - Test tasks show ⇧ (cache write) instead of ⇩ (cache hit)
  - Cache miss count increases (3 misses in Build 2)
  - New cache entries are likely being created
- **Mechanism**: Test tasks have TypeScript project references to main compilation:
  ```json
  // src/test/tsconfig.json
  "references": [{ "path": "../.." }]
  ```
  When main compilation outputs are restored with new timestamps, this might affect:
  1. File modification times checked by TypeScript
  2. Order of input file hashing
  3. Transitive dependency resolution

### Why Simple Fixture Doesn't Reproduce

Our test fixture doesn't use TypeScript project references or complex task dependencies:
- Simple TypeScript compilation without `references`
- No dependent test compilation tasks
- Single-level dependencies only

FluidFramework has:
- TypeScript project references between main and test compilation
- Complex dependency chains
- Monorepo-wide build orchestration

## Key Insights

### Cache Symbol Meanings
- `⇩` = Cache hit (restored from shared cache)
- `⇧` = Cache write (task executed, then wrote to cache)  
- `○` = Up-to-date (donefile check)
- `■` = Local cache hit (donefile)

###Cache Key Computation
From `src/core/sharedCache/cacheKey.ts`:
```typescript
{
  packageName,
  taskName,
  executable,
  command,
  inputHashes: [{ path, hash }],  // Content hashes, not timestamps!
  cacheSchemaVersion,
  nodeVersion,
  arch,
  platform,
  lockfileHash,
  // Optional:
  nodeEnv,
  cacheBustVars,
  toolVersion,
  configHashes,
  dependencyHashes,
}
```

**Critical**: `inputHashes` are **content-based SHA-256 hashes**, NOT file timestamps.

### Why Cache Keys Change

The test compilation tasks likely include different inputs on Build 2:
1. **Different tsbuildinfo state**: Even though content hash is same, TypeScript might generate different state
2. **Different dependency ordering**: Files restored from cache might be processed in different order
3. **Missing intermediate files**: Some generated files might not be in cache

## Next Steps to Fix

### Option A: Preserve File Timestamps
When restoring from shared cache, set file modification times to match original:
```typescript
await copyFile(sourcePath, destPath);
await utimes(destPath, originalAtime, originalMtime); // NEW
```

**Pros**: 
- TypeScript sees files as "old" and doesn't trigger rebuilds
- Matches expected filesystem state

**Cons**:
- Need to store timestamps in cache manifest
- More complex cache restoration logic

### Option B: Include Dependency Outputs in Cache Key
Make test task cache keys independent of dependency output timestamps:
- Hash dependency outputs as part of test task inputs
- Already happening via `dependencyHashes` in cache key

**Pros**:
- No timestamp manipulation needed
- Cache keys are truly content-based

**Cons**:
- Need to verify dependency tracking is complete

### Option C: Clear TypeScript Caches More Aggressively
Always remove tsbuildinfo when restoring outputs:
```typescript
// After restoring outputs
await rm("*.tsbuildinfo", { force: true });
```

**Pros**:
- Simple workaround
- Forces TypeScript fresh start

**Cons**:
- Loses incremental compilation benefits
- Doesn't fix root cause

## Test Results

### Integration Tests
✅ All 4 tests pass in simple fixture
- Test with tsbuildinfo kept: PASS (0 rebuilt, 12 cached)
- Test with tsbuildinfo removed: PASS (0 rebuilt, 12 cached)
- Workaround test: PASS (100% hit rate)

### Manual FluidFramework Tests  
❌ Bug persists (57% cache hit rate)
- Main compilation: 100% cache hits (4/4)
- Test compilation: 0% cache hits (0/3) 
- Test tasks always rebuild despite cache entries existing

## Recommendations

1. **Immediate**: Document the issue and workaround (clean tsbuildinfo)
2. **Short-term**: Add file timestamps to cache manifest and restore them
3. **Long-term**: Investigate why cache keys differ between builds for test tasks
4. **Testing**: Create fixture with TypeScript project references to reproduce bug

## Files Modified

- `test/integration/support/cacheValidationHelpers.ts`: Added tsbuildinfo cleaning
- `test/integration/scenarios/cache-restoration-dependencies.integration.test.ts`: Added bug reproduction tests
- `test/integration/CACHE_RESTORATION_BUG_INVESTIGATION.md`: This document

## UPDATE: November 5, 2024

### New Fixture Created: typescript-project-references

Created a fixture that mimics FluidFramework's structure:
- Main TypeScript compilation with `composite: true`  
- Test compilation in `src/test/tsconfig.json` with project reference: `"references": [{ "path": "../.." }]`
- Two separate sail tasks: `build` and `build:test`

### Test Results

**UNEXPECTED: Bug NOT reproduced!**

```
Build 1 (initial):
  Tasks built: 2
  Cache entries created: 2

Build 2 (after cleaning outputs):
  Tasks built: 0
  Cache hits: 2
  ✅ 100% cache hit rate
```

### Analysis

The TypeScript project references alone are **NOT** sufficient to reproduce the bug. Both tasks restored perfectly from cache after cleaning outputs.

###Next Steps to Reproduce

The bug in FluidFramework (57% cache hit rate) must require additional conditions:
1. **More complex dependency chains**: FluidFramework has multi-level package dependencies
2. **Different TypeScript configurations**: FluidFramework may have specific tsconfig settings
3. **Different cache inputs**: The cache key computation may differ
4. **Already fixed**: The issue may have been resolved in recent changes

### Recommendation

Test directly with FluidFramework to:
1. Confirm the bug still exists
2. Identify what specific conditions trigger it
3. Compare cache keys between builds to see what's changing

