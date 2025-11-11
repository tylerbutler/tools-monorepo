# Cache Hit Rate Analysis

## Overview

This document explains how Sail's caching system works and how cache hit rates are measured and analyzed in the integration tests.

## Two-Tier Caching System

Sail uses a two-tier caching approach:

### 1. Donefile Cache (Local)
- **What**: Fast local checks using donefile content hashes
- **When**: Used when task outputs already exist on disk
- **Speed**: Very fast (~1ms per task)
- **Scope**: Per-workspace, not shared

### 2. Shared Cache (Remote/Distributed)
- **What**: Stores and restores actual task output files
- **When**: Used when outputs are missing but cache entry exists
- **Speed**: Slower (~100-500ms per task depending on size)
- **Scope**: Shared across machines/builds

## Cache Hit Breakdown

The `getCacheHitBreakdown()` helper provides detailed metrics:

```typescript
interface CacheHitBreakdown {
  donefileHits: number;        // Tasks skipped via donefile
  sharedCacheHits: number;     // Tasks restored from shared cache
  totalCacheHits: number;      // Total cached (donefile + shared)
  tasksBuilt: number;          // Tasks actually executed
  totalTasks: number;          // Total tasks in build
  sharedCacheHitRate: number;  // % of cache lookups that hit
  overallHitRate: number;      // % of all tasks that were cached
}
```

### Calculation Details

- **donefileHits** = `leafUpToDateCount - sharedCacheHits`
  - Tasks that were cached locally via donefile checks
  
- **sharedCacheHits** = From `sharedCache.getStatistics().hitCount`
  - Tasks that were restored from the shared cache
  
- **totalCacheHits** = `leafUpToDateCount`
  - All tasks that didn't need to be rebuilt
  
- **sharedCacheHitRate** = `sharedCacheHits / (sharedCacheHits + missCount) * 100`
  - Percentage of shared cache lookups that succeeded
  
- **overallHitRate** = `totalCacheHits / totalTasks * 100`
  - Percentage of all tasks that were cached

## Expected Hit Rates by Scenario

### Scenario 1: Repeated Build (No Changes)
```
Build 1:
  - tasksBuilt: 12
  - totalCacheHits: 0
  - overallHitRate: 0%

Build 2:
  - tasksBuilt: 0
  - totalCacheHits: 12
  - donefileHits: 12
  - sharedCacheHits: 0
  - overallHitRate: 100%
```

**Why**: Outputs already exist, donefiles detect no changes needed.

### Scenario 2: After Output Deletion
```
Build 1:
  - tasksBuilt: 12
  - totalCacheHits: 0

Build 2 (after deleting dist/ directories):
  - tasksBuilt: 0
  - totalCacheHits: 12
  - donefileHits: 0-6 (depending on task order)
  - sharedCacheHits: 6-12
  - sharedCacheHitRate: 30-100%
  - overallHitRate: 100%
```

**Why**: Outputs are missing, so shared cache restores them. Some tasks may use donefiles after dependencies restore outputs.

### Scenario 3: After Source Change
```
Build 1:
  - tasksBuilt: 12

Build 2 (after modifying types package):
  - tasksBuilt: 3-9 (types + dependents)
  - totalCacheHits: 3-9 (unaffected packages)
  - overallHitRate: 25-75%
```

**Why**: Only affected packages and their dependents rebuild. Unaffected packages use cache.

## Test Assertions

### Correctness Assertions

```typescript
// After initial build, repeated builds should be 100% cached
expect(breakdown.overallHitRate).toBe(100);
expect(breakdown.tasksBuilt).toBe(0);

// After output deletion, should restore from shared cache
expect(breakdown.sharedCacheHits).toBeGreaterThan(0);
expect(breakdown.sharedCacheHitRate).toBeGreaterThan(30);

// Across multiple builds, task counts should remain consistent
expect(breakdown2.totalTasks).toBe(breakdown1.totalTasks);
```

### Performance Assertions

```typescript
// Shared cache should save time
const stats = sharedCache.getStatistics();
expect(stats.timeSavedMs).toBeGreaterThan(0);

// Cache size should be reasonable
expect(stats.totalSize).toBeGreaterThan(0);
expect(stats.totalEntries).toBe(expectedTaskCount);
```

## Real-World Examples

### Development Workflow
1. **Initial clone + build**: 0% hit rate (cold start)
2. **Rebuild without changes**: 100% hit rate (donefile)
3. **After `git clean -fdx`**: 30-100% hit rate (shared cache)
4. **After editing one file**: 10-50% hit rate (partial invalidation)

### CI/CD Workflow
1. **PR build (fresh checkout)**: Depends on shared cache availability
   - With populated cache: 50-100% hit rate
   - Without cache: 0% hit rate (first PR in new branch)
2. **Rebuild after test failure**: 100% hit rate (donefiles)
3. **Rebuild after cache clear**: 0% hit rate (must repopulate)

## Performance Benchmarks

Based on the multi-level-multi-task fixture (12 packages, 36 tasks):

### Build Times
- **Cold build** (0% hit rate): ~4-6 seconds
- **Warm build** (100% donefile): ~0.3-0.5 seconds (12x faster)
- **Warm build** (100% shared cache): ~1-2 seconds (3-6x faster)

### Cache Savings
- **Time saved per task** (shared cache): ~50-150ms average
- **Time saved per build** (full cache): ~3-5 seconds for 12 packages

### Scalability
- **Cache overhead**: <50ms for cache lookups on 36 tasks
- **Storage efficiency**: ~1-5MB per package (TypeScript builds)

## Debugging Cache Issues

### Low Hit Rate Troubleshooting

If hit rates are lower than expected:

1. **Check shared cache configuration**
   ```typescript
   const sharedCache = buildGraph.context?.sharedCache;
   if (!sharedCache) {
     console.log("Shared cache is disabled!");
   }
   ```

2. **Inspect cache statistics**
   ```typescript
   const stats = sharedCache.getStatistics();
   console.log(`Hits: ${stats.hitCount}, Misses: ${stats.missCount}`);
   console.log(`Hit rate: ${(stats.hitCount / (stats.hitCount + stats.missCount) * 100).toFixed(1)}%`);
   ```

3. **Check for cache invalidation**
   - Input file changes (source files, configs)
   - Lockfile changes (dependency updates)
   - Environment variable changes (NODE_ENV, cache bust vars)
   - Tool version changes (TypeScript, etc.)

4. **Verify cache entries exist**
   ```typescript
   const stats = await getCacheStatistics(cacheDir);
   console.log(`Cache entries: ${stats.entriesCount}`);
   console.log(`Corrupted: ${stats.corruptedCount}`);
   ```

## Best Practices

### For Test Authors
1. Always use `getCacheHitBreakdown()` to analyze cache behavior
2. Assert on both overall hit rate AND individual cache types
3. Test both cold and warm cache scenarios
4. Verify cache correctness over multiple builds

### For Tool Developers
1. Track both donefile and shared cache hits separately
2. Monitor cache performance metrics (time saved, sizes)
3. Detect and report cache corruption gracefully
4. Optimize for donefile hits first (fastest path)

## References

- `test/integration/scenarios/cache-validity.integration.test.ts` - Full test implementations
- `src/core/sharedCache/types.ts` - Cache statistics interface
- `src/core/buildGraph.ts` - Cache statistics aggregation
- `src/core/execution/BuildResult.ts` - Cache result types
