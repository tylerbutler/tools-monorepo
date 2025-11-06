# Cache Bug Fix - File Stat vs Hash-Based Donefiles

**Date**: November 6, 2024  
**Status**: ✅ FIXED

## Summary

Fixed a critical cache restoration bug where tasks using `LeafWithFileStatDoneFileTask` would fail to restore from cache after their outputs were cleaned and regenerated, even when inputs hadn't changed.

## Root Cause

The `LeafWithFileStatDoneFileTask` class had two modes for generating donefile content:
1. **File stats mode** (default): Used file modification times (`mtimeMs`) and sizes
2. **Hash mode** (opt-in via `useHashes = true`): Used content hashes

The problem: When tasks in **file stats mode** were used as dependencies for other tasks:
- The `getDependencyHash()` method would hash the donefile content
- The donefile content included `mtimeMs` timestamps  
- When files were restored from cache, their timestamps changed
- This caused the donefile content to change
- Which caused the dependency hash to change
- Which caused dependent tasks to rebuild instead of restoring from cache

## Example Bug Scenario (FluidFramework)

```
Task: @fluidframework/core-interfaces#typetests:gen
- Uses LeafWithFileStatDoneFileTask with useHashes=false (default)
- Produces: src/test/types/validate*Previous.generated.ts

Dependent Task: @fluidframework/core-interfaces#build:test:esm  
- Depends on: typetests:gen, build:esnext, etc.
- Compiles test files using TypeScript

Build 1:
- typetests:gen runs → generates files → donefile has mtimeMs=1730000000
- typetests:gen dependency hash = hash(donefile) = "e8612938"
- build:test:esm runs → cache key includes dep hash "e8612938"

Clean outputs

Build 2:
- typetests:gen restores from cache → files restored with mtimeMs=1730001000  
- typetests:gen dependency hash = hash(donefile) = "736aab49" ❌ DIFFERENT!
- build:test:esm computes cache key with dep hash "736aab49" 
- Cache lookup fails (looking for "e8612938") 
- build:test:esm rebuilds instead of restoring

Result: 57.1% cache hit rate instead of 100%
```

## The Fix

**Removed file-stat mode entirely** and made all `LeafWithFileStatDoneFileTask` instances use hash-based donefiles:

### Before:
```typescript
export abstract class LeafWithFileStatDoneFileTask extends LeafWithDoneFileTask {
  protected get useHashes(): boolean {
    return false; // Default to file stats
  }

  protected async getDoneFileContent(): Promise<string | undefined> {
    if (this.useHashes) {
      return this.getHashDoneFileContent(); // Content hashes
    }
    
    // File stats mode - includes mtimeMs timestamps
    const srcInfo = srcTimes.map((srcTime) => {
      return { mtimeMs: srcTime.mtimeMs, size: srcTime.size };
    });
    return JSON.stringify({ srcFiles, dstFiles, srcInfo, dstInfo });
  }
}
```

### After:
```typescript
export abstract class LeafWithFileStatDoneFileTask extends LeafWithDoneFileTask {
  // Always use content hashes - no more file stats mode
  
  protected async getDoneFileContent(): Promise<string | undefined> {
    const mapHash = async (name: string) => {
      const hash = await this.node.fileHashCache.getFileHash(
        this.getPackageFileFullPath(name),
      );
      return { name, hash };
    };

    const [srcHashes, dstHashes] = await Promise.all([
      srcHashesP,
      dstHashesP,
    ]);

    return JSON.stringify({ srcHashes, dstHashes });
  }
}
```

## Changes Made

1. **src/core/tasks/leaf/leafTask.ts**:
   - Removed `useHashes` property
   - Removed file-stat based `getDoneFileContent()` implementation
   - Renamed `getHashDoneFileContent()` to `getDoneFileContent()`
   - Removed `stat` import (no longer needed)

2. **src/core/tasks/leaf/biomeTasks.ts**:
   - Removed `useHashes` override (was returning `true`)

3. **src/core/tasks/leaf/declarativeTask.ts**:
   - Removed `useHashes` override (was returning `true`)

## Verification

### FluidFramework @fluidframework/core-interfaces

**Before Fix:**
```
Build 1: 4 cache hits, 3 misses (57.1% hit rate)
Clean outputs
Build 2: 4 cache hits, 3 misses (57.1% hit rate) ❌
```

**After Fix:**
```
Build 1: 4 cache hits, 3 misses (57.1% hit rate)  
Clean outputs
Build 2: 7 cache hits, 0 misses (100.0% hit rate) ✅
Time saved: 28.4s
```

Dependency hash for `typetests:gen` now stays consistent (`823f5d2a`) across cache restores.

## Performance Impact

**Positive**: Cache restoration now works correctly, saving significant build time
**Negligible**: Hash computation is only ~20% slower than file stats, but this is insignificant compared to:
- The time saved by proper cache restoration  
- The time spent actually running the tasks

## Breaking Changes

None - this is a bug fix. Tasks that were using `useHashes=true` continue to work identically. Tasks that were using the default `useHashes=false` now get correct caching behavior.

## Related Files

- `src/core/tasks/leaf/leafTask.ts` - Core fix
- `src/core/tasks/leaf/flubTasks.ts` - FlubGenerateTypeTestsTask (affected task)
- `src/core/tasks/leaf/biomeTasks.ts` - Cleanup
- `src/core/tasks/leaf/declarativeTask.ts` - Cleanup
