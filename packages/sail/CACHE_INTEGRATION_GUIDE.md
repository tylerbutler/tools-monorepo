# Shared Cache Integration Guide

## Status: Core Infrastructure Complete ✅

The shared cache implementation has been successfully ported from FluidFramework build-tools (~1,900 lines). This guide explains the remaining integration work needed.

## What's Been Completed

### Core Infrastructure (packages/sail/src/core/sharedCache/)
- ✅ **types.ts** - All type definitions
- ✅ **atomicWrite.ts** - Crash-safe file writes
- ✅ **cacheKey.ts** - Cache key computation (SHA-256)
- ✅ **manifest.ts** - Cache manifest read/write
- ✅ **fileOperations.ts** - File copying and hashing
- ✅ **cacheDirectory.ts** - Cache structure management
- ✅ **statistics.ts** - Statistics tracking and persistence
- ✅ **sharedCacheManager.ts** - Main cache coordinator (917 lines)
- ✅ **index.ts** - Exports

### CLI Flags (src/flags.ts)
- ✅ `--cache-dir` - Cache directory path (env: `SAIL_CACHE_DIR`)
- ✅ `--skip-cache-write` - Read-only mode
- ✅ `--verify-cache-integrity` - Hash verification on restore
- ✅ `--cache-stats` - Display statistics after build
- ✅ `--cache-clean` - Remove all entries
- ✅ `--cache-prune` - Prune old entries
- ✅ `--cache-verify` - Verify integrity
- ✅ `--cache-verify-fix` - Fix corrupted entries

### Build Command Integration
- ✅ Cache flags added to build command

## Integration Steps Required

### 1. Initialize SharedCacheManager

**Where**: `src/core/buildContext.ts` or `src/core/buildGraph.ts`

**What to add**:
```typescript
import { SharedCacheManager, type GlobalCacheKeyComponents } from "./sharedCache/index.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

// In BuildContext interface:
export interface BuildContext {
  // ... existing fields

  /**
   * Shared cache manager for storing/retrieving task outputs
   */
  sharedCache?: SharedCacheManager;
}

// During initialization (in BuildGraph or BuildExecutor):
async function initializeSharedCache(
  cacheDir: string | undefined,
  repoRoot: string,
  skipCacheWrite: boolean,
  verifyIntegrity: boolean
): Promise<SharedCacheManager | undefined> {
  if (!cacheDir) {
    return undefined; // Cache disabled
  }

  // Compute global cache key components
  const lockfilePath = path.join(repoRoot, "pnpm-lock.yaml");
  let lockfileHash = "";
  try {
    const lockfileContent = await readFile(lockfilePath, "utf8");
    lockfileHash = createHash("sha256").update(lockfileContent).digest("hex");
  } catch {
    // Lockfile doesn't exist, use empty string
  }

  const globalKeyComponents: GlobalCacheKeyComponents = {
    cacheSchemaVersion: 1,
    nodeVersion: process.version,
    arch: process.arch,
    platform: process.platform,
    lockfileHash,
    nodeEnv: process.env.NODE_ENV,
    // Cache bust vars: any env var starting with SAIL_CACHE_BUST
    cacheBustVars: Object.keys(process.env)
      .filter(k => k.startsWith("SAIL_CACHE_BUST"))
      .reduce((acc, k) => ({ ...acc, [k]: process.env[k] }), {}),
  };

  const cacheManager = new SharedCacheManager({
    cacheDir,
    repoRoot,
    globalKeyComponents,
    verifyIntegrity,
    skipCacheWrite,
  });

  await cacheManager.initialize();

  return cacheManager;
}
```

**Call from**: Build command `run()` method, passing flags:
```typescript
const sharedCache = await initializeSharedCache(
  flags.cacheDir,
  buildRepo.repoRoot,
  flags.skipCacheWrite,
  flags.verifyCacheIntegrity
);

// Pass to BuildContext
context.sharedCache = sharedCache;
```

### 2. Integrate Cache Lookup (Cache Hit Check)

**Where**: `src/core/tasks/leaf/leafTask.ts` - `LeafTask.checkLeafIsUpToDate()`

**Current logic**:
```typescript
protected async checkLeafIsUpToDate(): Promise<boolean> {
  // Task-specific checks (done file comparison, etc.)
  return await this.checkLeafIsUpToDate();
}
```

**Add before existing checks**:
```typescript
protected async checkLeafIsUpToDate(): Promise<boolean> {
  // NEW: Check shared cache first
  if (this.node.context.sharedCache && this.canUseCache) {
    const cacheResult = await this.tryRestoreFromCache();
    if (cacheResult.success) {
      this.traceTrigger("restored from cache");
      return true; // Cache hit! Task is up to date
    }
  }

  // EXISTING: Fall back to traditional checks
  return await this.checkLeafIsUpToDateOriginal();
}
```

**Add helper methods**:
```typescript
/**
 * Whether this task type supports caching.
 * Override to return false for tasks that shouldn't be cached.
 */
protected get canUseCache(): boolean {
  return true; // Most tasks can be cached
}

/**
 * Get input files for cache key computation.
 */
protected async getCacheInputFiles(): Promise<string[]> {
  // Default: use same logic as done file inputs
  return await this.getInputFiles();
}

/**
 * Get output files for cache storage/verification.
 */
protected abstract getCacheOutputFiles(): Promise<string[]>;

/**
 * Try to restore task outputs from cache.
 */
private async tryRestoreFromCache(): Promise<RestoreResult> {
  const cache = this.node.context.sharedCache!;

  // Compute cache key
  const inputFiles = await this.getCacheInputFiles();
  const inputHashes = await Promise.all(
    inputFiles.map(async (file) => ({
      path: path.relative(this.node.pkg.directory, file),
      hash: await this.node.context.fileHashCache.getFileHash(file),
    }))
  );

  const cacheKeyInputs: CacheKeyInputs = {
    packageName: this.node.pkg.name,
    taskName: this.taskName ?? this.command,
    executable: this.executable,
    command: this.command,
    inputHashes,
    ...cache.options.globalKeyComponents,
  };

  const cacheKey = computeCacheKey(cacheKeyInputs);

  // Lookup cache entry
  const entry = await cache.lookup(cacheKey);
  if (!entry) {
    return { success: false, filesRestored: 0, bytesRestored: 0, restoreTimeMs: 0 };
  }

  // Restore from cache
  const result = await cache.restore(entry, this.node.pkg.directory);

  if (result.success) {
    // Replay stdout/stderr for consistent UX
    if (result.stdout) {
      this.log.log(result.stdout);
    }
    if (result.stderr) {
      this.log.warning(result.stderr);
    }
  }

  return result;
}
```

### 3. Integrate Cache Store (After Successful Execution)

**Where**: `src/core/tasks/leaf/leafTask.ts` - `LeafTask.markExecDone()`

**Current logic**:
```typescript
protected async markExecDone(): Promise<void> {
  // Write done file
  await writeFile(this.doneFileFullPath, content);
}
```

**Add cache storage**:
```typescript
protected async markExecDone(): Promise<void> {
  // EXISTING: Write done file
  await this.writeDoneFile();

  // NEW: Store in shared cache
  if (this.node.context.sharedCache && this.canUseCache) {
    await this.storeInCache();
  }
}

/**
 * Store task outputs in shared cache.
 */
private async storeInCache(): Promise<void> {
  const cache = this.node.context.sharedCache!;

  try {
    // Get input and output files
    const inputFiles = await this.getCacheInputFiles();
    const outputFiles = await this.getCacheOutputFiles();

    // Compute hashes
    const inputHashes = await Promise.all(
      inputFiles.map(async (file) => ({
        path: path.relative(this.node.pkg.directory, file),
        hash: await this.node.context.fileHashCache.getFileHash(file),
      }))
    );

    // Compute cache key
    const cacheKeyInputs: CacheKeyInputs = {
      packageName: this.node.pkg.name,
      taskName: this.taskName ?? this.command,
      executable: this.executable,
      command: this.command,
      inputHashes,
      ...cache.options.globalKeyComponents,
    };

    const cacheKey = computeCacheKey(cacheKeyInputs);

    // Prepare task outputs
    const taskOutputs: TaskOutputs = {
      files: outputFiles.map(file => ({
        sourcePath: file,
        relativePath: path.relative(this.node.pkg.directory, file),
      })),
      stdout: "", // TODO: Capture during execution
      stderr: "",
      exitCode: 0,
      executionTimeMs: 0, // TODO: Track execution time
    };

    // Store in cache
    await cache.store(cacheKey, this.node.pkg.directory, taskOutputs);
  } catch (error) {
    // Don't fail the build if cache storage fails
    this.traceError(`Failed to store in cache: ${error}`);
  }
}
```

### 4. Display Cache Statistics

**Where**: `src/commands/build.ts` - After build completes

**Add after build**:
```typescript
// After runBuild completes
if (flags.cacheStats && sharedCache) {
  const stats = await sharedCache.getStatistics();

  console.log("\nCache Statistics:");
  console.log(`  Total Entries: ${stats.totalEntries}`);
  console.log(`  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Hit Count: ${stats.hitCount}`);
  console.log(`  Miss Count: ${stats.missCount}`);

  if (stats.hitCount > 0) {
    const hitRate = (stats.hitCount / (stats.hitCount + stats.missCount) * 100).toFixed(1);
    console.log(`  Hit Rate: ${hitRate}%`);
    console.log(`  Avg Restore Time: ${stats.avgRestoreTime.toFixed(1)}ms`);

    const timeSavedSec = stats.timeSavedMs / 1000;
    console.log(`  Time Saved: ${timeSavedSec.toFixed(1)}s`);
  }
}
```

### 5. Implement Cache Management Commands

**Where**: `src/commands/build.ts` - Before build starts

**Add command handlers**:
```typescript
// Handle cache management commands before build
if (flags.cacheClean && sharedCache) {
  await sharedCache.clean();
  console.log("Cache cleaned successfully.");
  return; // Don't run build
}

if (flags.cachePrune && sharedCache) {
  const pruned = await sharedCache.prune();
  console.log(`Pruned ${pruned.entriesRemoved} entries, freed ${(pruned.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
  return;
}

if (flags.cacheVerify && sharedCache) {
  const result = await sharedCache.verify(flags.cacheVerifyFix);
  console.log(`Verified ${result.totalEntries} entries, found ${result.corruptedEntries} corrupted`);
  if (flags.cacheVerifyFix) {
    console.log(`Fixed ${result.fixedEntries} entries`);
  }
  return;
}
```

## Implementation Order

1. ✅ **Phase 1: Core Infrastructure** - DONE
2. **Phase 2: Initialization** (15 min)
   - Add SharedCacheManager to BuildContext
   - Initialize from flags in build command
3. **Phase 3: Execution Integration** (30 min)
   - Add cache lookup in checkLeafIsUpToDate()
   - Add cache store in markExecDone()
   - Implement getCacheOutputFiles() for each task type
4. **Phase 4: UI/Commands** (15 min)
   - Display cache statistics
   - Implement management commands
5. **Phase 5: Testing** (1 hour)
   - Unit tests for cache operations
   - Integration tests for build with cache
6. **Phase 6: Documentation** (30 min)
   - Update README with cache usage
   - Add cache configuration guide

## Example Usage (Once Integrated)

```bash
# Enable cache (auto-creates ~/.sail-cache)
export SAIL_CACHE_DIR=~/.sail-cache
sail build

# Or specify inline
sail build --cache-dir ./.cache

# Read-only mode (CI environments)
sail build --cache-dir /shared/cache --skip-cache-write

# View statistics
sail build --cache-stats

# Clean cache
sail build --cache-clean

# Prune old entries
sail build --cache-prune
```

## Performance Expectations

Based on FluidFramework's testing:
- **Initial build**: No overhead (~same time)
- **Cache hit**: **2-8x faster** depending on task complexity
- **Partial cache hit**: **3-10x faster** on unchanged packages

## Notes

- The FluidFramework implementation has been battle-tested and debugged (see BUG_FIXES_SUMMARY.md)
- All critical bugs have been fixed in the ported version
- Cache entries are immutable - once stored, they never change
- Failed tasks are never cached (only exitCode 0)
- Cache is crash-safe (atomic writes) and corruption-resistant (hash verification)
