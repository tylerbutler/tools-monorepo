# Sail Cache Validity Integration Test Plan

## Overview

This test plan defines integration tests to verify cache reliability in Sail without requiring a large repository like FluidFramework. The tests focus on detecting the cache issues identified in `cache_comparison.md`, particularly:

1. **Filesystem race conditions** - manifests not appearing after writes
2. **Cache consistency** - entries being stored but not found on lookup
3. **Configuration validation** - invalid cache directories causing silent failures
4. **Concurrent operations** - multiple tasks storing/loading simultaneously
5. **LRU tracking accuracy** - access time updates completing properly

## Test Data Requirements

To catch cache unreliability issues, we need test fixtures with:
- **Multi-level dependency graphs** (3+ levels) to trigger parallel scheduling
- **Multiple tasks per package** (build, test, lint) to create concurrent cache operations
- **Cross-cutting task dependencies** to maximize parallelism and cache contention
- **Sufficient complexity** to trigger race conditions without being unwieldy

## Proposed Test Fixtures

### 1. Multi-Level Multi-Task Monorepo

A 3-level dependency graph with multiple task types:

```
Level 0 (Foundations - 3 packages):
  - @cache-test/utils       (build, test, lint)
  - @cache-test/types       (build, test, lint)
  - @cache-test/config      (build, lint)

Level 1 (Core Libraries - 4 packages):
  - @cache-test/core        (build, test, lint) → depends on: utils, types
  - @cache-test/validation  (build, test, lint) → depends on: types, config
  - @cache-test/parser      (build, test, lint) → depends on: utils, types
  - @cache-test/formatter   (build, test, lint) → depends on: utils, config

Level 2 (Integration - 3 packages):
  - @cache-test/cli         (build, test, lint) → depends on: core, validation, parser
  - @cache-test/server      (build, test, lint) → depends on: core, formatter
  - @cache-test/client      (build, test, lint) → depends on: parser, formatter

Level 3 (Applications - 2 packages):
  - @cache-test/app-web     (build, test, lint) → depends on: cli, client
  - @cache-test/app-desktop (build, test, lint) → depends on: cli, client, server
```

**Total**: 12 packages × 3 tasks = 36 tasks across 4 levels

**Why this structure:**
- Diamond dependencies (multiple packages at same level depending on shared lower-level packages)
- Parallel execution opportunities at each level
- Multiple task types create concurrent cache store/lookup operations
- Deep enough to catch timing issues but manageable for CI

### 2. Parallel Task Chains Fixture

A flatter structure with cross-cutting task dependencies:

```
@cache-test/data-models   (validate-schema, build, generate-docs, test)
@cache-test/api-contracts (validate-schema, build, generate-docs, test)
@cache-test/shared-types  (validate-schema, build, generate-docs, test)

Task dependencies:
- validate-schema: no dependencies
- build: dependsOn: ["^validate-schema"]
- generate-docs: dependsOn: ["^build"]
- test: dependsOn: ["build"]

All packages at same level, but task chaining creates 4 execution levels
```

**Why this structure:**
- All packages can start simultaneously (high initial parallelism)
- Task chains create cascading cache operations
- Cross-package task dependencies maximize cache contention
- Tests horizontal (across packages) vs vertical (across levels) parallelism

## Test Scenarios

### Scenario 1: First Build - Cache Population
**Purpose**: Verify cache stores work reliably under high concurrency

**Test Steps**:
1. Clean workspace (no cache)
2. Execute `sail run build test lint` (all tasks)
3. Verify all 36 tasks execute (none cached)
4. Verify cache entries exist for all 36 tasks
5. Verify all manifest.json files exist and are valid
6. Check cache statistics (36 stores, 0 hits)

**Expected Behaviors**:
- All tasks execute successfully
- All cache entries have manifest.json files
- No "manifest written but not found" warnings
- Cache directory structure is valid

**Failure Indicators**:
- Missing manifest.json files after store
- Tasks reporting cache store failures
- Filesystem errors in logs

### Scenario 2: Second Build - Full Cache Hit
**Purpose**: Verify cache lookups work immediately after stores

**Test Steps**:
1. Run Scenario 1 first
2. Execute `sail run build test lint` again (same workspace)
3. Verify all 36 tasks use cache (0 executed)
4. Verify task outputs are restored correctly
5. Check cache statistics (0 stores, 36 hits)

**Expected Behaviors**:
- All tasks should be cache hits
- Task execution time should be significantly lower
- All output files should exist
- No rebuild warnings

**Failure Indicators**:
- Any tasks executing instead of cache hits
- Missing restored files
- Cache lookup failures
- "Cache entry not found" despite manifest existing

### Scenario 3: Partial Cache Invalidation
**Purpose**: Verify cache invalidation and partial rebuilds

**Test Steps**:
1. Run Scenario 1 first
2. Modify source file in `@cache-test/types` package
3. Execute `sail run build test lint`
4. Verify types package tasks execute (cache miss)
5. Verify dependent package tasks execute (transitive invalidation)
6. Verify unaffected packages use cache

**Expected Behaviors**:
- Types package: 3 cache misses (build, test, lint)
- Level 1+ packages depending on types: cache misses
- Packages not depending on types: cache hits
- New cache entries stored for invalidated tasks

**Failure Indicators**:
- Over-invalidation (too many cache misses)
- Under-invalidation (cache hits on changed packages)
- Incorrect dependency tracking

### Scenario 4: Concurrent Builds (Race Condition Test)
**Purpose**: Detect filesystem race conditions with simultaneous builds

**Test Steps**:
1. Clean workspace and cache
2. Run 3 builds in parallel using same cache directory:
   - Terminal 1: `sail run build --cache-dir=.cache`
   - Terminal 2: `sail run build --cache-dir=.cache`
   - Terminal 3: `sail run build --cache-dir=.cache`
3. Wait for all to complete
4. Verify all 3 builds succeed
5. Verify cache has correct entries (no duplicates/corruption)
6. Run 4th build and verify all cache hits

**Expected Behaviors**:
- All 3 builds complete successfully
- Cache has 36 valid entries (not 108)
- Later builds see "cache entry already exists" (not errors)
- 4th build has all cache hits

**Failure Indicators**:
- Build failures due to cache conflicts
- Corrupted manifest files
- Missing cache entries
- "Manifest written but not found" errors
- Filesystem errors (EEXIST, ENOENT)

### Scenario 5: Cross-Process Cache Validity
**Purpose**: Verify cache entries are immediately visible across processes

**Test Steps**:
1. Clean workspace and cache
2. Process 1: Build first 6 packages (Level 0 and 1)
3. Process 1: Exit/terminate
4. Process 2: Build all packages
5. Verify Process 2 uses cache for Level 0-1 packages
6. Verify Process 2 builds Level 2-3 packages

**Expected Behaviors**:
- Process 2 sees all cache entries from Process 1
- No cache misses for packages built by Process 1
- Smooth handoff between processes

**Failure Indicators**:
- Process 2 rebuilds packages already cached
- "Cache entry not found" despite being stored
- Filesystem buffering delays

### Scenario 6: Cache Recovery from Corruption
**Purpose**: Verify cache handles incomplete/corrupted entries

**Test Steps**:
1. Run Scenario 1 first
2. Manually corrupt cache entries:
   - Delete manifest.json from 3 random entries (keep directories)
   - Delete output files from 2 entries (keep manifest.json)
   - Write invalid JSON to 2 manifest files
3. Execute `sail run build test lint`
4. Verify affected tasks rebuild (cache miss)
5. Verify unaffected tasks use cache
6. Verify new cache entries replace corrupted ones

**Expected Behaviors**:
- Corrupted entries treated as cache misses (graceful degradation)
- No build failures due to corruption
- Warning logs about invalid cache entries
- Successful rebuilds and re-caching

**Failure Indicators**:
- Build failures due to corrupted cache
- Partial file restoration causing errors
- Unable to recover from corruption

### Scenario 7: Cache Under File System Stress
**Purpose**: Test cache reliability under filesystem pressure

**Test Steps**:
1. Clean workspace and cache
2. Set up filesystem monitoring (inotify events, fsync delays)
3. Execute build with high parallelism (`--concurrency=16`)
4. Monitor for:
   - Write-then-read latencies
   - fsync completion times
   - Manifest file visibility delays
5. Verify all cache operations succeed
6. Run second build and verify 100% cache hits

**Expected Behaviors**:
- All cache stores complete despite high load
- All stored entries are immediately readable
- No timing-related failures

**Failure Indicators**:
- "Manifest written but not found" warnings
- Cache store timeouts
- Reads failing due to incomplete writes

### Scenario 8: LRU Cache Pruning Verification
**Purpose**: Verify LRU tracking and pruning work correctly

**Test Steps**:
1. Set cache size limit (e.g., 20 entries)
2. Build fixture (36 tasks) - exceeds limit
3. Verify oldest entries are pruned during build
4. Verify access time updates are persisted
5. Build again and verify recently used entries remain
6. Verify cache statistics show correct evictions

**Expected Behaviors**:
- Cache stays within size limit
- Most recently used entries remain
- Least recently used entries pruned
- Access times updated on lookup

**Failure Indicators**:
- Cache exceeds size limit
- Wrong entries pruned (not LRU)
- Access time updates not persisted
- Cache pruning failures

### Scenario 9: Configuration Validation
**Purpose**: Verify cache fails fast with invalid configuration

**Test Steps**:
1. Test invalid cache directories:
   - Non-existent parent directory
   - Read-only directory
   - File path (not directory)
   - Relative path with special characters
2. Verify build fails immediately with clear error
3. Verify no silent failures or crashes

**Expected Behaviors**:
- Clear error messages for invalid config
- Build fails before task execution
- No corrupted cache state
- User-friendly error messages

**Failure Indicators**:
- Silent failures (build continues with broken cache)
- Cryptic filesystem errors
- Crashes or hangs
- Partial cache initialization

### Scenario 10: Multi-Task Cache Restoration Order
**Purpose**: Verify correct restoration order for interdependent tasks

**Test Steps**:
1. Run full build (all tasks cached)
2. Clean output directories (not cache)
3. Execute `sail run build test` (subset of tasks)
4. Verify build tasks restore before test tasks
5. Verify test tasks don't execute before build restoration completes

**Expected Behaviors**:
- Cache restoration respects task dependencies
- Test tasks wait for build task restoration
- No "missing dependency output" errors

**Failure Indicators**:
- Test tasks start before build restoration completes
- Race conditions in restoration order
- Missing files when tasks execute

## Implementation Guidelines

### Test Fixture Structure

```
test/integration/fixtures/cache-validity/
├── multi-level-multi-task/
│   ├── package.json (workspace root)
│   ├── pnpm-workspace.yaml
│   ├── sail.config.cjs
│   └── packages/
│       ├── utils/
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   ├── src/index.ts
│       │   └── test/index.test.ts
│       ├── types/
│       ├── config/
│       └── ... (12 packages total)
└── parallel-task-chains/
    ├── package.json
    ├── pnpm-workspace.yaml
    ├── sail.config.cjs
    └── packages/
        ├── data-models/
        ├── api-contracts/
        └── shared-types/
```

### Sail Configuration

```javascript
// sail.config.cjs for multi-level-multi-task
module.exports = {
  version: 1,
  tasks: {
    build: {
      dependsOn: ["^build"],
      script: true,
      cache: {
        inputs: ["src/**/*.ts", "tsconfig.json", "package.json"],
        outputs: ["dist/**"],
      },
    },
    test: {
      dependsOn: ["build"],
      script: true,
      cache: {
        inputs: ["test/**/*.ts", "src/**/*.ts", "package.json"],
        outputs: [".coverage/**"],
      },
    },
    lint: {
      dependsOn: ["^build"],
      script: true,
      cache: {
        inputs: ["src/**/*.ts", "test/**/*.ts", ".eslintrc.json"],
        outputs: [".eslint-cache"],
      },
    },
  },
};
```

### Package Scripts

Each package needs realistic scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src test --cache --cache-location .eslint-cache"
  }
}
```

### Test Helper Functions

```typescript
// test/integration/support/cacheValidationHelpers.ts

export interface CacheStats {
  storeCount: number;
  hitCount: number;
  missCount: number;
  entriesCount: number;
  corruptedCount: number;
}

export async function getCacheStatistics(cacheDir: string): Promise<CacheStats> {
  // Walk cache directory and count entries
  // Validate manifest.json files
  // Return statistics
}

export async function verifyCacheEntry(
  cacheDir: string,
  taskId: string
): Promise<{ exists: boolean; valid: boolean; reason?: string }> {
  // Check manifest.json exists
  // Validate JSON structure
  // Check output files exist
}

export async function corruptCacheEntry(
  cacheDir: string,
  taskId: string,
  corruptionType: "missing-manifest" | "invalid-json" | "missing-outputs"
): Promise<void> {
  // Deliberately corrupt cache entry for testing
}

export async function runParallelBuilds(
  testDir: string,
  buildCount: number
): Promise<BuildResult[]> {
  // Execute multiple builds concurrently
  // Return results from all builds
}

export async function waitForFilesystemSync(path: string): Promise<void> {
  // Force filesystem sync for testing
  // Useful for detecting buffering issues
}
```

### Assertion Helpers

```typescript
export async function assertAllTasksCached(
  result: BuildResult,
  expectedCount: number
): Promise<void> {
  expect(result.taskStats.cacheHitCount).toBe(expectedCount);
  expect(result.taskStats.leafBuiltCount).toBe(0);
}

export async function assertCacheEntryValid(
  cacheDir: string,
  taskId: string
): Promise<void> {
  const entry = await verifyCacheEntry(cacheDir, taskId);
  expect(entry.exists).toBe(true);
  expect(entry.valid).toBe(true);
}

export async function assertNoCacheCorruption(
  cacheDir: string
): Promise<void> {
  const stats = await getCacheStatistics(cacheDir);
  expect(stats.corruptedCount).toBe(0);
}
```

## Performance Benchmarks

Each test should capture and report:
1. **Cache store time** - Time to store all entries
2. **Cache lookup time** - Time to lookup all entries
3. **Cache hit ratio** - Percentage of successful cache hits
4. **Filesystem operations** - Number of file reads/writes
5. **Manifest validation time** - Time spent validating manifests

Example metrics from a successful run:
```
Scenario 1 (First Build):
  - Total time: 45s
  - Tasks executed: 36
  - Cache stores: 36 (100%)
  - Cache store time: 2.3s
  - No errors

Scenario 2 (Full Cache Hit):
  - Total time: 8s (82% faster)
  - Tasks executed: 0
  - Cache hits: 36 (100%)
  - Cache lookup time: 0.5s
  - Restoration time: 7.5s
  - No errors
```

## Failure Analysis

When tests fail, capture:
1. **Sail logs** - Full debug logs with cache tracing
2. **Cache directory structure** - List all entries and files
3. **Manifest contents** - Contents of any invalid manifests
4. **Filesystem timing** - Write/read operation timestamps
5. **Process information** - PIDs, timing, concurrency levels

## CI Integration

Tests should be:
- **Fast**: Complete in under 5 minutes total
- **Reliable**: No flaky failures due to timing
- **Isolated**: Each test uses separate cache directory
- **Parallelizable**: Tests can run concurrently in CI
- **Informative**: Clear failure messages with debug info

## Success Criteria

A successful test suite will:
1. ✅ Detect manifest visibility issues (Scenario 4, 5, 7)
2. ✅ Verify cache consistency across builds (Scenario 2, 3)
3. ✅ Catch configuration errors early (Scenario 9)
4. ✅ Handle corruption gracefully (Scenario 6)
5. ✅ Validate concurrent operations (Scenario 4, 7)
6. ✅ Verify LRU behavior (Scenario 8)
7. ✅ Complete in reasonable time (< 5 minutes)
8. ✅ Provide actionable failure information

## Next Steps

1. Implement multi-level-multi-task fixture
2. Implement parallel-task-chains fixture
3. Create cache validation helper functions
4. Implement Scenarios 1-3 (basic cache operations)
5. Implement Scenarios 4-5 (concurrency tests)
6. Implement Scenarios 6-9 (edge cases)
7. Implement Scenario 10 (restoration order)
8. Add to CI pipeline
9. Document failure patterns and fixes
10. Create monitoring dashboards for cache effectiveness

## References

- `cache_comparison.md` - Analysis of cache implementation differences
- `CACHE_INTEGRATION_GUIDE.md` - Guide for integrating cache into build tools
- Existing fixtures: `diamond-dependency`, `simple-monorepo`
- Existing tests: `basic-build.integration.test.ts`
