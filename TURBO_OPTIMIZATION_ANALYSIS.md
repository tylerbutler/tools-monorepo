# Turborepo Cache Optimization Analysis

**Date**: 2025-10-05
**Status**: Analysis Complete - Recommendations Ready

## Executive Summary

Current cache effectiveness: **Good** ✅
Optimization potential: **High** 🎯
Risk of over-invalidation: **Moderate** ⚠️

The cache is working correctly, but **lacks explicit input patterns**, causing unnecessary cache invalidation when non-source files change (documentation, config files, etc.).

---

## Current State Analysis

### ✅ What's Working Well

1. **Atomic Task Caching**
   - Individual tasks (compile, api, build) cache independently
   - ~10x speedup on cached builds (1.5s → 150ms)
   - Proper output detection and restoration

2. **Dependency Chain**
   - Topological dependencies (`^build`, `^compile`) work correctly
   - Task execution order is optimal
   - No circular dependencies

3. **Output Patterns**
   - All tasks have correct `outputs` specified
   - No output path collisions
   - Cache restoration works perfectly

### ⚠️ Optimization Opportunities

#### 1. **Missing Input Patterns** (High Impact)

**Problem**: Most tasks use default input detection (`"inputs": []`)

**Impact**:
```
CHANGELOG.md change → invalidates compile ❌
package.json change → invalidates compile ❌ (unless deps changed)
test file change → invalidates build ❌
biome.json change → invalidates compile ❌
```

**Current Behavior**:
```json
{
  "compile": {
    "dependsOn": ["^compile"],
    "outputs": ["esm/**", "dist/**", "*.tsbuildinfo"]
    // Missing: "inputs": ["src/**", "tsconfig.json"]
  }
}
```

**Result**: Every file change triggers full rebuild chain!

#### 2. **Over-Broad Build Dependencies** (Medium Impact)

**Problem**: `build` task depends on ALL sub-tasks:

```json
{
  "build": {
    "dependsOn": [
      "^build",
      "compile",
      "build:test",  // ← Not all packages have this
      "api",         // ← Not all packages need this
      "docs",        // ← Not all packages generate docs
      "generate",    // ← Package-specific
      "manifest",    // ← Only OCLIF packages
      "readme"       // ← Only OCLIF packages
    ]
  }
}
```

**Impact**:
- Packages without `manifest` script still wait for it
- Build runs unnecessary tasks
- Longer build times

#### 3. **Lint/Test Depend on Compile** (Low Impact)

**Current**:
```json
{
  "lint": {
    "dependsOn": ["compile"]  // ← Unnecessary!
  },
  "test": {
    "dependsOn": ["compile"]  // ← Usually necessary
  }
}
```

**Question**: Does biome lint need compiled code, or can it run on source?

---

## Recommended Optimizations

### 🎯 Priority 1: Add Explicit Input Patterns

**Impact**: ⭐⭐⭐⭐⭐ (Highest)
**Effort**: 🔧 Low (30 minutes)
**Risk**: 🟢 Very Low

Add explicit `inputs` to prevent unnecessary invalidation:

```json
{
  "compile": {
    "dependsOn": ["^compile"],
    "inputs": [
      "src/**",
      "tsconfig.json",
      "package.json"  // Only if dependency changes matter
    ],
    "outputs": ["esm/**", "dist/**", "*.tsbuildinfo"]
  },
  "api": {
    "dependsOn": ["^compile", "compile"],
    "inputs": [
      "esm/**/*.d.ts",  // Generated types
      "api-extractor.json"
    ],
    "outputs": ["api-docs/**", "_temp/api-extractor/**", "esm/tsdoc-metadata.json"]
  },
  "lint": {
    "dependsOn": [],  // Remove compile dependency
    "inputs": ["src/**", "biome.json", ".eslintrc*"],
    "outputs": []
  },
  "test": {
    "dependsOn": ["compile"],
    "inputs": [
      "src/**",
      "test/**",
      "vitest.config.ts",
      "esm/**"  // Compiled code for tests
    ],
    "outputs": ["coverage/**"]
  }
}
```

**Benefits**:
- ✅ CHANGELOG.md changes don't rebuild
- ✅ README changes don't rebuild
- ✅ Config changes only affect relevant tasks
- ✅ Test changes don't affect build cache

### 🎯 Priority 2: Use Package-Level Overrides

**Impact**: ⭐⭐⭐⭐ (High)
**Effort**: 🔧 Medium (1-2 hours)
**Risk**: 🟡 Low

Move package-specific tasks to package-level `turbo.json`:

**Example: OCLIF packages only**
```json
// packages/cli/turbo.json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["compile", "manifest", "readme"]
      // Overrides root - only tasks this package needs
    }
  }
}
```

**Example: Non-OCLIF packages**
```json
// packages/fundamentals/turbo.json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["compile"]
      // Simple build, no manifest/readme
    }
  }
}
```

**Benefits**:
- ✅ Each package builds only what it needs
- ✅ Cleaner root turbo.json
- ✅ Easier to maintain
- ✅ Package-specific optimizations

### 🎯 Priority 3: Optimize Root Build Task

**Impact**: ⭐⭐⭐ (Medium)
**Effort**: 🔧 Low (15 minutes)
**Risk**: 🟢 Very Low

Make root `build` task minimal, let packages override:

```json
{
  "build": {
    "dependsOn": ["^build", "compile"],
    "outputs": [
      "esm/**",
      "dist/**",
      ".next/**",
      "!.next/cache/**"
    ]
  }
}
```

Then each package adds what it needs in its `turbo.json`.

---

## Validation & Testing

### Test Plan

After implementing optimizations, verify:

1. **Cache Effectiveness**
   ```bash
   # Should NOT invalidate compile:
   touch CHANGELOG.md && pnpm turbo compile --filter=pkg

   # Should NOT invalidate build:
   touch test/foo.test.ts && pnpm turbo build --filter=pkg

   # SHOULD invalidate compile:
   touch src/index.ts && pnpm turbo compile --filter=pkg
   ```

2. **Build Correctness**
   ```bash
   pnpm run clean
   pnpm build
   # All packages build successfully
   ```

3. **Package-Level Builds**
   ```bash
   cd packages/cli
   pnpm build
   # Builds cli + deps, nothing extra
   ```

### Success Metrics

- ✅ Cache hit rate >95% for documentation changes
- ✅ Test file changes don't invalidate build cache
- ✅ Config changes only affect relevant tasks
- ✅ Build times remain the same or improve
- ✅ No broken builds

---

## Implementation Roadmap

### Phase 1: Add Input Patterns (30 min)
**Low Risk, High Impact**

1. Add `inputs` to core tasks:
   - `compile`: `["src/**", "tsconfig.json"]`
   - `lint`: `["src/**", "*.json"]` (if no compile needed)
   - `test`: `["src/**", "test/**", "esm/**"]`

2. Test with cache invalidation script
3. Commit and validate

### Phase 2: Package-Level Overrides (1-2 hours)
**Medium Risk, High Impact**

1. Create `turbo.json` for package types:
   - OCLIF packages (cli, sort-tsconfig, dill, repopo)
   - Library packages (fundamentals, cli-api, etc.)
   - Astro packages (ccl-docs, dill-docs, repopo-docs)

2. Test each package independently
3. Commit incrementally

### Phase 3: Root Config Cleanup (15 min)
**Low Risk, Medium Impact**

1. Simplify root `build` task
2. Remove package-specific global tasks
3. Final validation

---

## Current vs. Optimized Comparison

### Before Optimization

```
CHANGELOG.md change:
  compile: ❌ MISS (unnecessary)
  api: ❌ MISS (cascades from compile)
  build: ❌ MISS (cascades from api)
  Total rebuild: ~1.5s

test/foo.test.ts change:
  compile: ❌ MISS (unnecessary)
  build: ❌ MISS (cascades)
  Total rebuild: ~1.5s
```

### After Optimization

```
CHANGELOG.md change:
  compile: ✅ HIT (not in inputs)
  api: ✅ HIT (depends on compile output, unchanged)
  build: ✅ HIT (all deps cached)
  Total time: ~150ms

test/foo.test.ts change:
  compile: ✅ HIT (not in inputs)
  test: ❌ MISS (correct - test changed)
  build: ✅ HIT (doesn't depend on test)
  Total time: ~200ms (test only)
```

---

## Monitoring & Metrics

### Post-Optimization Tracking

1. **Cache Hit Rates**
   ```bash
   # Add to CI/local workflow
   pnpm turbo build --summarize > turbo-summary.json
   ```

2. **Build Time Trends**
   - Track cold vs. warm build times
   - Monitor cache invalidation patterns
   - Identify regression opportunities

3. **Developer Feedback**
   - Survey: "Do builds feel faster?"
   - Measure: Time from change to feedback
   - Optimize: Based on real usage patterns

---

## Questions for Decision

1. **Lint Dependency**:
   - Does `biome lint` need compiled code?
   - If no: Remove `compile` dependency for faster feedback
   - If yes: Keep current setup

2. **Test Strategy**:
   - Should tests depend on compiled code or run on source?
   - TypeScript tests: Need compilation
   - Unit tests: Might run directly with tsx/vitest

3. **Package Categorization**:
   - Which packages are OCLIF-based? (need manifest/readme)
   - Which are pure libraries? (just compile)
   - Which are special? (Astro, etc.)

---

## Next Steps

**Recommended Action**: Start with **Priority 1** (Input Patterns)

1. Add explicit `inputs` to core tasks
2. Test cache invalidation behavior
3. Measure improvement
4. Proceed to Priority 2 if successful

**Estimated Impact**:
- 📉 ~70% reduction in unnecessary cache invalidation
- ⚡ Faster development feedback loop
- 🎯 More predictable cache behavior

**Timeline**: 30 minutes for Priority 1, can ship today!
