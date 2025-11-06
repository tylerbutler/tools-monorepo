# Cache Bug Reproduction - FluidFramework @fluidframework/core-interfaces

**Date**: November 5, 2024
**Status**: ✅ BUG REPRODUCED

## Summary

Successfully reproduced the cache restoration bug in the FluidFramework repository. Test compilation tasks are being rebuilt instead of restored from cache, even though their inputs and dependencies haven't changed.

## Reproduction Steps

1. **Initial Build**:
   ```bash
   cd /home/tylerbu/code/claude-workspace-fluid/FluidFramework
   DEBUG=sail:cache:key sail build @fluidframework/core-interfaces --all -t compile
   ```
   Result: 1 cache hit, 3 cache misses (25.0% hit rate)

2. **Clean Outputs**:
   ```bash
   cd packages/common/core-interfaces
   rm -rf lib/ dist/ *.tsbuildinfo src/**/*.tsbuildinfo .sail-done-*
   ```

3. **Rebuild**:
   ```bash
   cd /home/tylerbu/code/claude-workspace-fluid/FluidFramework
   DEBUG=sail:cache:key sail build @fluidframework/core-interfaces --all -t compile
   ```
   Result: **4 cache hits, 3 cache misses (57.1% hit rate)** ❌

## Observed Bug

**Expected**: All 7 tasks should restore from cache (100% hit rate)
**Actual**: Only 4 tasks restored, 3 tasks rebuilt and wrote to cache

### Tasks that FAILED to restore from cache:
1. `build:test:esm` - tsc --project ./src/test/tsconfig.json (⇧ 7.603s)
2. `build:test:cjs` - fluid-tsc commonjs --project ./src/test/tsconfig.cjs.json (⇧ 7.924s)
3. `build:test:esm:no-exactOptionalPropertyTypes` - tsc --project ./src/test/tsconfig.no-exactOptionalPropertyTypes.json (⇧ 7.536s)

All three are TypeScript test compilation tasks with project references to the main build.

## Key Observations

### Dependency Hashes are IDENTICAL

From debug logs, dependency hashes are the same between runs:

**build:test:esm dependencies:**
- `@fluidframework/core-interfaces#typetests:gen: dd78dbe1`
- `@fluidframework/core-interfaces#build:esnext: d3f66fb0`
- `@fluidframework/core-interfaces#<fluid-tsc commonjs ...>: daa4d111`
- `@fluidframework/core-interfaces#place:cjs:package-stub: d3615ac3`

These are IDENTICAL in both runs, yet cache lookup fails.

### Input Hashes are IDENTICAL

**build:test:esm:no-exactOptionalPropertyTypes inputs:**
```
inputFiles: src/test/*.spec.ts, src/test/tsconfig.no-exactOptionalPropertyTypes.json
inputHashes: 
  - src/test/brandedType.spec.ts: ca4f9a7d
  - src/test/deepReadonly.spec.ts: b6f5f5c5
  - [... all identical ...]
  - src/test/tsconfig.no-exactOptionalPropertyTypes.json: 25417c21
```

All input hashes are identical between runs.

## TypeScript Project References

The test tsconfig files have project references to the parent:

**src/test/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "../../lib/test"
  },
  "references": [
    { "path": "../.." }
  ]
}
```

The reference points to the main `tsconfig.json` at the package root.

## Hypothesis

Since:
1. Input hashes are identical ✓
2. Dependency hashes are identical ✓
3. But cache lookup still fails ✗

Possible causes:
1. **Cache key computation includes something that changes after restoration**
   - Maybe restored file timestamps?
   - Maybe tsbuildinfo content differs?
2. **getDependencyHash() for TscTask computes differently for restored files**
   - Perhaps reading tsbuildinfo gives different results?
3. **Cache lookup logic has a bug**
   - Key is computed correctly but lookup fails?

## Next Steps

1. **Compare cache keys directly**: Look at the actual cache key strings being generated
2. **Compare tsbuildinfo files**: Before cache write vs after cache restore
3. **Check TscTask.getDependencyHash()**: How does it hash the tsbuildinfo?
4. **Add more debug logging**: In cache lookup and key computation

## Files to Investigate

- `tools-monorepo/packages/sail/src/core/tasks/leaf/tscTask.ts` - TscTask implementation
- `tools-monorepo/packages/sail/src/core/sharedCache/cacheKey.ts` - Cache key computation
- `tools-monorepo/packages/sail/src/core/tasks/leaf/leafTask.ts` - getDependencyHashes()

## Environment

- FluidFramework repo: `/home/tylerbu/code/claude-workspace-fluid/FluidFramework`
- Package: `@fluidframework/core-interfaces`
- Location: `packages/common/core-interfaces`
- Sail version: (from tools-monorepo)
