# Turborepo Migration Plan

**Status**: Planning Complete
**Target**: Complete one-shot migration from fluid-build to turborepo
**Branch**: turborepo (current)

## Migration Overview

### Current State
- **Build System**: fluid-build (Microsoft's build orchestration)
- **Configuration**: `fluidBuild.config.cjs` + `package.json` fluidBuild section
- **Legacy**: `nx.json` (to be removed)
- **Packages**: 9 packages + root, all using fluid-build
- **Package Manager**: pnpm with workspaces

### Target State
- **Build System**: Turborepo
- **Configuration**: `turbo.json` at root
- **Package Scripts**: `"build": "turbo build"` in packages (automatic scoping)
- **Remote Cache**: Vercel Remote Cache (after local validation)
- **No Breaking Changes**: CI workflows continue to work

## Key Decisions

### 1. Package Script Strategy ✅
**Keep package-level build scripts** using automatic scoping:
```json
// packages/cli/package.json
{
  "scripts": {
    "build": "turbo build",   // Automatic scoping - builds deps + this package
    "compile": "tsc",          // Atomic work
    "test": "vitest run",      // Atomic work
    "lint": "biome lint ."     // Atomic work
  }
}
```

**Benefits:**
- `cd packages/cli && pnpm build` works exactly like fluid-build
- IDE integration continues to work
- Zero developer learning curve
- Familiar workflow preserved

### 2. Task Organization ✅
**Separate tasks for granular caching:**
- `compile` - TypeScript compilation
- `build` - Full build including manifest, readme, docs
- `test` - Test execution
- `lint` - Code linting
- `manifest` - OCLIF manifest generation
- `readme` - Documentation generation
- `generate` - Various code generation tasks

### 3. Astro Packages ✅
Standard turborepo setup with proper inputs/outputs from `declarativeTasks`:
- ccl-docs
- dill-docs
- repopo-docs

### 4. Remote Caching ✅
Enable Vercel Remote Cache **after** local validation succeeds

---

## Session-Based Execution Plan

### Session 1: Configuration & Core Setup (30-45 min)

**Objective**: Create turbo.json and update root configuration

**Tasks:**
1. Create `turbo.json` from `fluidBuild.config.cjs`
2. Update root `package.json`:
   - Remove `fluidBuild` section
   - Update scripts to use `turbo run`
   - Update `devDependencies`
3. Update `.gitignore`

**Files Modified:**
- `turbo.json` (new)
- `package.json` (root)
- `.gitignore`

**Validation:**
- `turbo.json` validates against schema
- Root scripts are correct

**Deliverable**: Root configuration ready for package updates

---

### Session 2: Package Scripts Update - Batch 1 (30-45 min)

**Objective**: Update first batch of packages (4 packages)

**Packages:**
1. `@tylerbu/fundamentals`
2. `@tylerbu/cli-api`
3. `@tylerbu/lilconfig-loader-ts`
4. `@tylerbu/levee-client`

**Changes per package:**
```diff
{
  "scripts": {
-   "build": "fluid-build . --task build",
+   "build": "turbo build",
-   "full": "fluid-build . --task full",
+   "full": "turbo full",
    "compile": "tsc --project ./tsconfig.json",
    // ... keep other atomic scripts unchanged
  }
}
```

**Validation:**
- Scripts updated correctly
- No syntax errors in package.json files

**Deliverable**: 4 packages migrated

---

### Session 3: Package Scripts Update - Batch 2 (30-45 min)

**Objective**: Update second batch of packages (5 packages)

**Packages:**
5. `@tylerbu/cli`
6. `dill`
7. `@tylerbu/xkcd2-api`
8. `sort-tsconfig`
9. `repopo`

**Changes**: Same pattern as Session 2

**Validation:**
- All package scripts updated
- Ready for dependency updates

**Deliverable**: All 9 packages migrated

---

### Session 4: Dependencies & Cleanup (20-30 min)

**Objective**: Update dependencies and remove legacy files

**Tasks:**
1. Install turborepo: `pnpm add turbo --save-dev --workspace-root`
2. Remove fluid-build packages:
   - `@fluid-tools/build-cli`
   - `@fluidframework/build-tools`
3. Remove legacy files:
   - `nx.json`
   - `fluidBuild.config.cjs`
4. Run `pnpm install` to update lockfile

**Validation:**
- Dependencies installed correctly
- No broken references
- Lockfile updated

**Deliverable**: Clean dependency tree

---

### Session 5: Local Testing & Validation (45-60 min)

**Objective**: Comprehensive local testing before commit

**Test Suite:**

1. **Clean Build Test**
   ```bash
   pnpm run clean
   pnpm build
   ```
   - ✅ All packages build successfully
   - ✅ Proper dependency order maintained
   - ✅ Output artifacts generated correctly

2. **Package-Level Build Test**
   ```bash
   cd packages/cli
   pnpm build
   ```
   - ✅ Builds cli + dependencies
   - ✅ Automatic scoping works

3. **CI Script Test**
   ```bash
   pnpm run ci:check
   pnpm run ci:build
   pnpm run ci:lint
   pnpm run ci:test
   ```
   - ✅ All CI scripts pass
   - ✅ Same behavior as before

4. **Individual Task Test**
   ```bash
   pnpm run test
   pnpm run lint
   pnpm run check
   ```
   - ✅ All tasks work correctly

5. **Cache Verification**
   ```bash
   pnpm build        # First run (cold cache)
   pnpm build        # Second run (should be instant)
   ```
   - ✅ Second build uses cache
   - ✅ Shows "cached" status

**Validation Checklist:**
- [ ] All packages build without errors
- [ ] Package-level builds work with automatic scoping
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Cache works correctly
- [ ] Dev mode works (if applicable)
- [ ] Generated files are correct (manifest, readme, etc.)

**Deliverable**: Fully validated local build

---

### Session 6: Remote Cache Setup (15-20 min)

**Objective**: Enable Vercel Remote Cache

**Prerequisites:**
- Session 5 validation complete ✅
- All tests passing ✅

**Tasks:**
1. Run `npx turbo login`
2. Run `npx turbo link`
3. Test remote cache:
   ```bash
   pnpm run clean
   pnpm build        # Upload to remote cache
   pnpm run clean
   pnpm build        # Download from remote cache
   ```

**Validation:**
- Remote cache connected
- Cache hits from remote
- Build speed improved

**Deliverable**: Remote cache enabled and working

---

## Complete File Change Summary

### Files to CREATE
- `turbo.json`
- `TURBOREPO_MIGRATION_PLAN.md` (this file)

### Files to MODIFY
- `package.json` (root) - remove fluidBuild, update scripts
- `.gitignore` - add .turbo, remove fluid-build artifacts
- `packages/fundamentals/package.json`
- `packages/cli-api/package.json`
- `packages/lilconfig-loader-ts/package.json`
- `packages/levee-client/package.json`
- `packages/cli/package.json`
- `packages/dill/package.json`
- `packages/xkcd2-api/package.json`
- `packages/sort-tsconfig/package.json`
- `packages/repopo/package.json`

### Files to DELETE
- `nx.json`
- `fluidBuild.config.cjs`

### Files UNCHANGED
- `pnpm-workspace.yaml` - already correct
- `.github/workflows/*.yml` - use npm scripts, no changes needed
- All `tsconfig.json` files
- All source code

---

## Turbo.json Configuration Reference

The complete `turbo.json` will be created from `fluidBuild.config.cjs` with these key sections:

### Task Graph
```json
{
  "$schema": "https://turborepo.org/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build", "compile", "api", "docs", "generate", "manifest", "readme"],
      "outputs": ["esm/**", "dist/**", ".next/**", "!.next/cache/**", "oclif.manifest.json"]
    },
    "compile": {
      "dependsOn": ["^compile"],
      "outputs": ["esm/**", "dist/**", "*.tsbuildinfo"]
    },
    "test": {
      "dependsOn": ["compile"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["compile"]
    },
    "clean": {
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Multi-Command Executables
Handle `astro` and `oclif` commands properly with inputs/outputs.

### Declarative Tasks
Map from `fluidBuild.config.cjs` declarativeTasks:
- `astro build` - inputs/outputs
- `oclif manifest` - inputs/outputs
- `generate-license-file` - inputs/outputs

---

## Root package.json Script Changes

### Before (fluid-build)
```json
{
  "scripts": {
    "build": "fluid-build . --task build",
    "check": "fluid-build . --task check",
    "clean": "fluid-build . --task clean",
    "compile": "fluid-build . --task compile",
    "full": "fluid-build . --task full",
    "test": "fluid-build . --task test",
    "ci:build": "fluid-build . --task build --task generate",
    "ci:test": "pnpm -r run --aggregate-output test:coverage"
  }
}
```

### After (turborepo)
```json
{
  "scripts": {
    "build": "turbo run build",
    "check": "turbo run check",
    "clean": "turbo run clean",
    "compile": "turbo run compile",
    "full": "turbo run full",
    "test": "turbo run test",
    "ci:build": "turbo run build generate",
    "ci:test": "turbo run test:coverage"
  }
}
```

---

## Package package.json Script Changes

### Before (fluid-build)
```json
{
  "scripts": {
    "build": "fluid-build . --task build",
    "full": "fluid-build . --task full",
    "compile": "tsc --project ./tsconfig.json",
    "test": "vitest run test"
  }
}
```

### After (turborepo)
```json
{
  "scripts": {
    "build": "turbo build",
    "full": "turbo full",
    "compile": "tsc --project ./tsconfig.json",
    "test": "vitest run test"
  }
}
```

---

## Risk Assessment

### Low Risk
- ✅ Task dependency mapping is 1:1
- ✅ CI abstracts through npm scripts
- ✅ pnpm workspace unchanged
- ✅ TypeScript configs unchanged

### Medium Risk
- ⚠️ Output path specifications may need adjustment
- ⚠️ Some packages may have undocumented build dependencies
- ⚠️ Testing coverage for all scenarios

### Mitigation
- ✅ Test full build locally before commit
- ✅ Test CI scripts locally
- ✅ Session-based approach allows validation at each step
- ✅ Git history allows easy rollback
- ✅ Branch-based development (can abandon if issues)

---

## Success Criteria

### Must Have
- [ ] All packages build successfully
- [ ] Package-level builds work (automatic scoping)
- [ ] All tests pass
- [ ] CI workflows pass
- [ ] Cache provides speedup

### Nice to Have
- [ ] Remote cache configured
- [ ] Build times improved
- [ ] Developer experience maintained or improved

---

## Rollback Plan

If issues arise at any session:

1. **Before Commit**: Discard changes
   ```bash
   git reset --hard HEAD
   git clean -fd
   ```

2. **After Commit**: Revert commit
   ```bash
   git revert <commit-sha>
   ```

3. **Complete Rollback**: Delete branch
   ```bash
   git checkout main
   git branch -D turborepo
   ```

---

## Post-Migration

### Documentation Updates
- Update README if it references fluid-build
- Update contribution guidelines
- Document new turborepo commands

### Team Communication
- Share migration notes
- Explain new workflow (though it's the same)
- Document turborepo-specific features

### Performance Monitoring
- Track build times before/after
- Monitor cache hit rates
- Optimize turbo.json if needed

---

## Notes & Observations

### Why This Migration
- **Modern Tooling**: Turborepo is actively maintained and modern
- **Better DX**: Superior developer experience with TUI, better caching
- **Industry Standard**: More common than fluid-build, easier onboarding
- **Remote Cache**: Free Vercel remote cache available
- **Performance**: Generally faster with better parallelization

### Automatic Scoping Feature
Turborepo's killer feature for this migration:
```bash
cd packages/cli
turbo build
# ✅ Automatically builds cli + all dependencies
# ✅ Same behavior as fluid-build
# ✅ Zero learning curve
```

### Future Enhancements
After successful migration, consider:
- Optimizing task graph for better parallelization
- Adding more granular caching strategies
- Exploring Turborepo's advanced features
- Setting up analytics/metrics

---

## Session Execution Checklist

Use this to track progress through sessions:

- [ ] **Session 1**: Configuration & Core Setup
  - [ ] Create turbo.json
  - [ ] Update root package.json
  - [ ] Update .gitignore
  - [ ] Validate configuration

- [ ] **Session 2**: Package Scripts Batch 1
  - [ ] fundamentals
  - [ ] cli-api
  - [ ] lilconfig-loader-ts
  - [ ] levee-client

- [ ] **Session 3**: Package Scripts Batch 2
  - [ ] cli
  - [ ] dill
  - [ ] xkcd2-api
  - [ ] sort-tsconfig
  - [ ] repopo

- [ ] **Session 4**: Dependencies & Cleanup
  - [ ] Install turbo
  - [ ] Remove fluid-build deps
  - [ ] Delete nx.json
  - [ ] Delete fluidBuild.config.cjs
  - [ ] Update lockfile

- [ ] **Session 5**: Local Testing & Validation
  - [ ] Clean build test
  - [ ] Package-level build test
  - [ ] CI script test
  - [ ] Individual task test
  - [ ] Cache verification
  - [ ] All validation criteria met

- [ ] **Session 6**: Remote Cache Setup
  - [ ] turbo login
  - [ ] turbo link
  - [ ] Test remote cache
  - [ ] Verify performance

---

## Ready to Execute

This plan is ready for execution. Start with Session 1 when ready to begin the migration.

**Next Steps:**
1. Review this plan
2. Ensure you're on the `turborepo` branch
3. Begin with Session 1
4. Progress through sessions sequentially
5. Validate thoroughly at Session 5
6. Enable remote cache at Session 6

**Estimated Total Time**: 3-4 hours across 6 sessions
