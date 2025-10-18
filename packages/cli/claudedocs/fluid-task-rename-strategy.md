# FluidFramework Task Rename Strategy

## Overview

This document defines the task renaming strategy to prepare FluidFramework for Nx/Turbo migration by standardizing task names according to three-tier principles **before** switching build systems.

## Strategy: Two-Phase Migration

### Phase 1: Rename Tasks (This Document)
**Goal:** Standardize task names while still using fluid-build
**Output:** PR to FluidFramework with renamed package.json scripts
**Validation:** Builds still work with fluid-build

### Phase 2: Migrate Build System (Existing Overlay)
**Goal:** Add Nx/Turbo configs after names are standardized
**Output:** Overlay becomes simpler - just adds configs
**Validation:** Builds work with Nx/Turbo using standardized names

---

## Current State Analysis

### Naming Issues Found

1. **`build:esnext`** - Has `build:` prefix but is an executor
   ```json
   "build:esnext": "tsc --project ./tsconfig.json"
   ```
   - **Issue:** Runs tool directly (tsc) but has orchestrator-style prefix
   - **Should be:** `esnext` (Tier 3 executor)

2. **`api`** - Workflow orchestrator but missing context
   ```json
   "api": "fluid-build . --task api"
   ```
   - **Issue:** Calls fluid-build (orchestrator) but name doesn't indicate tier
   - **Will be removed** in Phase 2 (replaced by nx/turbo orchestration)
   - **No rename needed** - will be deleted

3. **`api-extractor:esnext`** - Tool invocation with unclear naming
   ```json
   "api-extractor:esnext": "flub generate entrypoints ..."
   ```
   - **Issue:** Runs tool but name is verbose
   - **Acceptable as-is** - clearly identifies the tool and variant

4. **`test:mocha`**, `test:mocha:cjs`, `test:mocha:esm` - Executor or stage?
   ```json
   "test:mocha": "mocha",
   "test:mocha:cjs": "mocha dist/test/**/*.spec.js",
   "test:mocha:esm": "mocha lib/test/**/*.spec.mjs"
   ```
   - **Analysis:** These run mocha directly (executor level)
   - **Keep as-is:** Naming is clear and follows pattern

---

## Rename Mapping

### Critical Renames (Breaking Changes)

These renames are necessary but may break existing workflows:

| Current Name | New Name | Reason | Tier |
|-------------|----------|--------|------|
| `build:esnext` | `esnext` | Executor should not have `build:` prefix | 3 |
| `build:test` | `test:build` | Better semantic grouping | 2 |
| `build:test:cjs` | `test:build:cjs` | Consistent with test:build | 2 |
| `build:test:esm` | `test:build:esm` | Consistent with test:build | 2 |

### Optional Renames (Clarity Improvements)

These improve consistency but are lower priority:

| Current Name | New Name | Reason | Tier |
|-------------|----------|--------|------|
| `format-and-build` | `build:format-first` | More descriptive | 2 |
| `format-and-compile` | `compile:format-first` | More descriptive | 2 |

### Keep As-Is (Already Correct)

| Script Name | Tier | Reason |
|------------|------|--------|
| `tsc` | 3 | Correct executor name |
| `eslint` | 3 | Correct executor name |
| `clean` | 1 | Correct workflow name |
| `format` | 1 | Correct workflow name |
| `test` | 1 | Correct workflow name |
| `build:docs` | 2 | Correct stage orchestrator |
| `build:api-reports` | 2 | Correct stage orchestrator |
| `ci:build:docs` | 2 | Correct stage orchestrator |
| `check:format` | 2 | Correct stage orchestrator |
| `check:exports` | 2 | Correct stage orchestrator |
| `test:mocha` | 3 | Clear executor name |
| `test:coverage` | 2 | Correct stage orchestrator |
| `typetests:gen` | 3 | Clear executor name |

### Will Be Removed (Phase 2)

These call fluid-build and will be removed when overlaying:

| Script Name | Replacement |
|------------|-------------|
| `api` | Removed - nx/turbo orchestrates via config |
| `build` | Removed - nx/turbo orchestrates via config |
| `lint` | Removed - nx/turbo orchestrates via config |
| Any script with `fluid-build` | Removed in Phase 2 |

---

## Implementation Plan

### Step 1: Create Rename Command

Add new command to CLI:
```bash
tbu fluid task-rename --repo-dir <path> [--dry-run] [--branch <name>]
```

**Features:**
- Analyzes package.json scripts
- Applies rename mapping
- Updates cross-references (scripts calling other scripts)
- Creates git branch with changes
- Validates no scripts are orphaned

### Step 2: Implement Rename Logic

**Module:** `src/lib/fluid-repo-overlay/task-rename.ts`

```typescript
interface RenameRule {
  pattern: RegExp | string;  // Match pattern
  replacement: string;        // New name
  condition?: (script: string) => boolean;  // Optional condition
  tier: 1 | 2 | 3;           // Target tier
  reason: string;            // Why this rename
}

const RENAME_RULES: RenameRule[] = [
  {
    pattern: 'build:esnext',
    replacement: 'esnext',
    tier: 3,
    reason: 'Executor should use tool name only'
  },
  {
    pattern: /^build:test$/,
    replacement: 'test:build',
    tier: 2,
    reason: 'Group test-related orchestrators under test:'
  },
  // ...more rules
];
```

### Step 3: Update Cross-References

Scripts can reference other scripts. Need to update these references too:

```json
// Before
{
  "scripts": {
    "build:esnext": "tsc --project ./tsconfig.json",
    "build:full": "npm run build:esnext && npm run build:docs"
  }
}

// After
{
  "scripts": {
    "esnext": "tsc --project ./tsconfig.json",
    "build:full": "npm run esnext && npm run build:docs"
  }
}
```

**Algorithm:**
1. Build rename map: `{old: new}`
2. Rename all script keys
3. Scan all script values for `npm run <old>`, `pnpm <old>`, etc.
4. Replace with new names
5. Handle parallel/sequential combinators (`&&`, `||`, `;`)

### Step 4: Validation

After renaming, validate:

1. **No orphaned references:**
   ```bash
   # Check for scripts referencing non-existent scripts
   grep -r "npm run" packages/**/package.json | check against actual scripts
   ```

2. **Tier compliance:**
   ```bash
   # Verify executors don't call npm run (would make them orchestrators)
   - Tier 3 scripts should NOT contain: npm run, pnpm, yarn
   - Tier 2 scripts SHOULD contain cross-references or tools
   - Tier 1 scripts should call build tool (fluid-build) or npm run
   ```

3. **Build still works:**
   ```bash
   # Run fluid-build after rename to ensure compatibility
   cd FluidFramework
   pnpm install
   pnpm build  # (still using fluid-build at this point)
   ```

---

## Testing Strategy

### Test in test-fixture

```bash
cd packages/cli/test-fixtures

# 1. Reset to clean state
./reset.sh

# 2. Create branch for rename
cd FluidFramework
git checkout -b task-rename-standardization

# 3. Run rename command
cd ../..
./bin/dev.js fluid task-rename \
  --repo-dir test-fixtures/FluidFramework \
  --branch task-rename-standardization

# 4. Review changes
cd test-fixtures/FluidFramework
git diff --stat
git diff packages/common/core-utils/package.json

# 5. Validate builds (with fluid-build still)
pnpm install
pnpm build  # Should still work!

# 6. Check for broken references
./scripts/check-script-references.sh  # (create this)

# 7. If all good, prepare PR summary
git log -1 --format=full
```

### Validation Checklist

- [ ] All `build:esnext` renamed to `esnext`
- [ ] All `build:test` renamed to `test:build`
- [ ] Cross-references updated (no broken `npm run` calls)
- [ ] No new scripts added (only renames)
- [ ] fluid-build scripts untouched (removed in Phase 2)
- [ ] Builds complete successfully with fluid-build
- [ ] No orphaned script references
- [ ] Git diff is clean (only intended changes)

---

## Risk Assessment

### Low Risk Renames

✅ **`build:esnext` → `esnext`**
- Rarely called directly by developers
- Usually orchestrated by fluid-build
- Easy to communicate in PR

### Medium Risk Renames

⚠️ **`build:test` → `test:build`**
- May be called in CI scripts
- Need to update FluidFramework CI config
- Search codebase for references before renaming

### High Risk (Avoid)

❌ **Renaming `tsc`, `eslint`, `test`, `clean`**
- Core developer workflows depend on these
- Don't rename what's already correct
- Focus only on inconsistencies

---

## Command Specification

### Command: `tbu fluid task-rename`

**Purpose:** Rename package.json scripts to follow three-tier naming principles

**Usage:**
```bash
tbu fluid task-rename --repo-dir <path> [options]
```

**Options:**
```
--repo-dir <path>     Path to FluidFramework repository (required)
--dry-run             Show changes without applying them
--branch <name>       Git branch name (default: task-rename-standardization)
--rules <path>        Custom rename rules file (JSON)
--validate-only       Check for naming issues without renaming
--skip-cross-refs     Don't update cross-references (faster, less safe)
```

**Examples:**
```bash
# Dry run to see what would change
tbu fluid task-rename \
  --repo-dir test-fixtures/FluidFramework \
  --dry-run

# Apply renames on custom branch
tbu fluid task-rename \
  --repo-dir test-fixtures/FluidFramework \
  --branch prepare-for-nx

# Validation only (report issues)
tbu fluid task-rename \
  --repo-dir test-fixtures/FluidFramework \
  --validate-only
```

**Output:**
```
📋 Analyzing FluidFramework repository...
  ✓ Found 165 packages
  ✓ Analyzed 3,247 scripts

🔄 Rename Plan:
  build:esnext → esnext (127 packages)
  build:test → test:build (98 packages)
  build:test:cjs → test:build:cjs (98 packages)
  build:test:esm → test:build:esm (98 packages)

📝 Cross-Reference Updates:
  45 scripts reference renamed scripts
  Updating: build:full, ci:build, etc.

✅ Validation:
  ✓ No orphaned references
  ✓ Tier compliance checks pass
  ✓ No duplicate script names

🌿 Git Operations:
  ✓ Created branch: task-rename-standardization
  ✓ Committed changes: 165 files modified
  ✓ Summary: Standardize task names for Nx/Turbo migration

📊 Summary:
  Renamed: 421 scripts across 165 packages
  Updated cross-refs: 45 scripts
  Branch: task-rename-standardization
  Ready for: Review and testing

Next steps:
1. Review changes: git diff main
2. Test builds: pnpm build
3. Create PR to FluidFramework
4. After merge, run Phase 2 (nx/turbo overlay)
```

---

## PR Template for FluidFramework

```markdown
## Standardize Task Names for Build System Migration

### Summary
Renames package.json scripts to follow consistent three-tier naming principles in preparation for migrating from fluid-build to Nx/Turbo.

### Changes
- **Rename `build:esnext` → `esnext`**: Executors use tool names (127 packages)
- **Rename `build:test` → `test:build`**: Better semantic grouping (98 packages)
- **Update cross-references**: 45 scripts updated to reference new names

### Rationale
Establishes clear task hierarchy before build system migration:
- **Tier 1 (Workflows)**: build, test, lint, clean
- **Tier 2 (Stages)**: build:compile, test:unit, check:format
- **Tier 3 (Executors)**: tsc, esnext, eslint, jest

### Testing
- ✅ All builds pass with fluid-build
- ✅ No orphaned script references
- ✅ Tier compliance validated
- ✅ 165 packages updated consistently

### Migration Plan
- **Phase 1** (This PR): Standardize names with fluid-build
- **Phase 2** (Future): Migrate to Nx/Turbo using standardized names

### Breaking Changes
⚠️ Scripts renamed - update any direct references:
- `npm run build:esnext` → `npm run esnext`
- `npm run build:test` → `npm run test:build`

CI scripts may need updates if they call these directly.

### Validation
All packages tested with:
```bash
pnpm build
```
Builds complete successfully with renamed scripts.
```

---

## Next Steps

1. **Implement `task-rename` command**
   - Create `src/commands/fluid/task-rename.ts`
   - Implement `src/lib/fluid-repo-overlay/task-rename.ts`

2. **Test in test-fixture**
   - Create validation scripts
   - Run dry-run and analyze output
   - Apply and validate builds work

3. **Refine rename rules**
   - Based on test results
   - Add more rules if needed
   - Document edge cases

4. **Prepare for Phase 2**
   - Update overlay scripts to expect standardized names
   - Simplify templates (already aligned)
   - Document end-to-end migration

---

## Success Criteria

- [ ] Command implements all rename rules
- [ ] Cross-references updated correctly
- [ ] Validation passes (no orphans, tier compliance)
- [ ] Builds work with fluid-build after rename
- [ ] Git history is clean
- [ ] Documentation complete
- [ ] Ready to create FluidFramework PR

## Document Metadata

- **Created:** 2025-10-18
- **Purpose:** Phase 1 of two-phase Nx/Turbo migration
- **Status:** Design - Ready for Implementation
- **Dependencies:** Requires test-fixture FluidFramework repo
