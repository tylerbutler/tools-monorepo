# FluidFramework Task Rename - Comprehensive Mapping

## Complete Rename Mapping

### Summary Statistics

| Metric | Count |
|--------|-------|
| Total Rename Patterns | 6 |
| Total Packages Affected | 413 instances across patterns |
| Total Cross-Reference Updates | 236 scripts |
| Total Packages in Repository | 165 |

---

## Rename Rules by Tier

### Tier 3 Renames (Executors)

Executors should use tool names only, not orchestrator-style prefixes.

#### Rule 1: build:esnext → esnext

**Affected**: 154 packages
**Tier**: 3 (Executor)
**Reason**: Executor should use tool name only (runs tsc directly)

**Pattern Match**: Exact string match `"build:esnext"`

**Typical Script Content**:
```json
{
  "build:esnext": "tsc --project ./tsconfig.esnext.json"
}
```

**After Rename**:
```json
{
  "esnext": "tsc --project ./tsconfig.esnext.json"
}
```

**Why This Matters**:
- `build:esnext` runs `tsc` directly (a tool executor)
- The `build:` prefix suggests it's an orchestrator
- In three-tier naming, executors use tool names only
- Corrected name `esnext` clearly indicates "TypeScript ESNext compilation executor"

---

### Tier 2 Renames (Stage Orchestrators)

Stage orchestrators should group by semantic purpose (test:*, build:*, check:*).

#### Rule 2: build:test → test:build

**Affected**: 88 packages
**Tier**: 2 (Stage Orchestrator)
**Reason**: Group test-related orchestrators under test: prefix

**Pattern Match**: Regex `^build:test$` (exact match)

**Typical Script Content**:
```json
{
  "build:test": "tsc --project ./src/test/tsconfig.json"
}
```

**After Rename**:
```json
{
  "test:build": "tsc --project ./src/test/tsconfig.json"
}
```

**Why This Matters**:
- Semantic grouping: all test-related tasks under `test:*`
- Makes it easier to find test infrastructure tasks
- Distinguishes from production build tasks
- Aligns with `test:unit`, `test:coverage`, etc.

---

#### Rule 3: build:test:cjs → test:build:cjs

**Affected**: 74 packages
**Tier**: 2 (Stage Orchestrator)
**Reason**: Consistent with test:build grouping

**Pattern Match**: Exact string match `"build:test:cjs"`

**Typical Script Content**:
```json
{
  "build:test:cjs": "tsc --project ./src/test/tsconfig.cjs.json"
}
```

**After Rename**:
```json
{
  "test:build:cjs": "tsc --project ./src/test/tsconfig.cjs.json"
}
```

**Why This Matters**:
- Consistent with `test:build` rename
- Groups all test builds together
- `test:build:cjs` = "test infrastructure build for CommonJS"

---

#### Rule 4: build:test:esm → test:build:esm

**Affected**: 81 packages
**Tier**: 2 (Stage Orchestrator)
**Reason**: Consistent with test:build grouping

**Pattern Match**: Exact string match `"build:test:esm"`

**Typical Script Content**:
```json
{
  "build:test:esm": "tsc --project ./src/test/tsconfig.esm.json"
}
```

**After Rename**:
```json
{
  "test:build:esm": "tsc --project ./src/test/tsconfig.esm.json"
}
```

**Why This Matters**:
- Consistent with `test:build` rename
- Groups all test builds together
- `test:build:esm` = "test infrastructure build for ESM"

---

#### Rule 5: format-and-build → build:format-first

**Affected**: 8 packages
**Tier**: 2 (Stage Orchestrator)
**Reason**: More descriptive stage orchestrator name

**Pattern Match**: Exact string match `"format-and-build"`

**Typical Script Content**:
```json
{
  "format-and-build": "npm run format && npm run build"
}
```

**After Rename**:
```json
{
  "build:format-first": "npm run format && npm run build"
}
```

**Why This Matters**:
- More descriptive: "build with formatting first"
- Follows `build:*` semantic grouping
- Indicates this is a build variant, not a formatter

---

#### Rule 6: format-and-compile → compile:format-first

**Affected**: 8 packages
**Tier**: 2 (Stage Orchestrator)
**Reason**: More descriptive stage orchestrator name

**Pattern Match**: Exact string match `"format-and-compile"`

**Typical Script Content**:
```json
{
  "format-and-compile": "npm run format && npm run compile"
}
```

**After Rename**:
```json
{
  "compile:format-first": "npm run format && npm run compile"
}
```

**Why This Matters**:
- More descriptive: "compile with formatting first"
- Follows `compile:*` semantic grouping
- Indicates this is a compile variant, not a formatter

---

## Scripts NOT Renamed (Ignored)

These scripts call `fluid-build` and will be removed in Phase 2:

```json
{
  "api": "fluid-build . --task api",
  "build": "fluid-build .",
  "lint": "fluid-build . --task lint",
  "test": "fluid-build . --task test"
}
```

**Why Ignored**:
- These are workflow orchestrators for fluid-build
- Will be completely removed when switching to Nx/Turbo
- No point in renaming what will be deleted

---

## Cross-Reference Updates

### Automatic Reference Updates

When a script is renamed, the tool automatically updates references in other scripts:

**Example 1: npm run references**
```json
// Before
{
  "build:esnext": "tsc --project ./tsconfig.esnext.json",
  "build:full": "npm run build:esnext && npm run build:docs"
}

// After
{
  "esnext": "tsc --project ./tsconfig.esnext.json",
  "build:full": "npm run esnext && npm run build:docs"
}
```

**Example 2: pnpm references**
```json
// Before
{
  "build:test": "tsc --project ./src/test/tsconfig.json",
  "ci:test": "pnpm build:test && pnpm test:mocha"
}

// After
{
  "test:build": "tsc --project ./src/test/tsconfig.json",
  "ci:test": "pnpm test:build && pnpm test:mocha"
}
```

### Patterns Detected and Updated

The tool handles all common script runner patterns:

- `npm run <script>` → `npm run <new-name>`
- `pnpm <script>` → `pnpm <new-name>`
- `yarn <script>` → `yarn <new-name>`

With word boundary detection to avoid partial matches:
- `npm run build:test` ✅ matches and updates
- `npm run build:test:esm` ❌ does NOT match `build:test` rule

---

## Impact Analysis

### By Package Type

**Framework Core Packages** (highest impact):
- Most have `build:esnext` → `esnext` (TypeScript compilation)
- Many have test build variants (cjs/esm)

**Example Package** (@fluidframework/common-utils):
```json
// Before
{
  "scripts": {
    "build:esnext": "tsc --project ./tsconfig.json",
    "build:test": "tsc --project ./src/test/tsconfig.json",
    "build:test:esm": "tsc --project ./src/test/tsconfig.esm.json",
    "build:full": "npm run build:esnext && npm run build:docs"
  }
}

// After
{
  "scripts": {
    "esnext": "tsc --project ./tsconfig.json",
    "test:build": "tsc --project ./src/test/tsconfig.json",
    "test:build:esm": "tsc --project ./src/test/tsconfig.esm.json",
    "build:full": "npm run esnext && npm run build:docs"
  }
}
```

**Changes**: 3 renames + 1 cross-reference update

---

## Validation Rules

After renaming, the tool validates:

### 1. No Orphaned References

**Check**: All script references point to existing scripts

**Example Failure**:
```json
{
  "scripts": {
    "esnext": "tsc --project ./tsconfig.json",
    "build:full": "npm run build:esnext"  // ❌ Orphaned!
  }
}
```

This would fail validation because `build:esnext` no longer exists.

### 2. Tier Compliance

**Check**: Executors (no colon) don't call `npm run` (which would make them orchestrators)

**Example Failure**:
```json
{
  "scripts": {
    "tsc": "npm run setup && tsc"  // ❌ Executor calling npm run!
  }
}
```

This would fail because `tsc` (executor) shouldn't orchestrate other scripts.

### 3. No Duplicate Script Names

**Check**: No duplicate keys within a package's scripts

**Example Failure**:
```json
{
  "scripts": {
    "build": "tsc",
    "build": "fluid-build"  // ❌ Duplicate key!
  }
}
```

JSON doesn't allow duplicate keys, but this validates the parsed result.

---

## Quick Reference Table

| Old Name | New Name | Tier | Packages | Type |
|----------|----------|------|----------|------|
| `build:esnext` | `esnext` | 3 | 154 | Executor |
| `build:test` | `test:build` | 2 | 88 | Stage Orchestrator |
| `build:test:cjs` | `test:build:cjs` | 2 | 74 | Stage Orchestrator |
| `build:test:esm` | `test:build:esm` | 2 | 81 | Stage Orchestrator |
| `format-and-build` | `build:format-first` | 2 | 8 | Stage Orchestrator |
| `format-and-compile` | `compile:format-first` | 2 | 8 | Stage Orchestrator |

---

## Before/After Examples

### Small Package (1 rename)

**Before**:
```json
{
  "name": "@fluidframework/simple-package",
  "scripts": {
    "build:esnext": "tsc --project ./tsconfig.json",
    "clean": "rimraf dist",
    "lint": "eslint src"
  }
}
```

**After**:
```json
{
  "name": "@fluidframework/simple-package",
  "scripts": {
    "esnext": "tsc --project ./tsconfig.json",
    "clean": "rimraf dist",
    "lint": "eslint src"
  }
}
```

**Changes**: 1 rename (`build:esnext` → `esnext`)

---

### Medium Package (3 renames)

**Before**:
```json
{
  "name": "@fluidframework/medium-package",
  "scripts": {
    "build:esnext": "tsc --project ./tsconfig.json",
    "build:test": "tsc --project ./src/test/tsconfig.json",
    "build:test:esm": "tsc --project ./src/test/tsconfig.esm.json",
    "test:mocha": "mocha --recursive dist/test"
  }
}
```

**After**:
```json
{
  "name": "@fluidframework/medium-package",
  "scripts": {
    "esnext": "tsc --project ./tsconfig.json",
    "test:build": "tsc --project ./src/test/tsconfig.json",
    "test:build:esm": "tsc --project ./src/test/tsconfig.esm.json",
    "test:mocha": "mocha --recursive dist/test"
  }
}
```

**Changes**: 3 renames

---

### Complex Package (4 renames + cross-refs)

**Before**:
```json
{
  "name": "@fluidframework/complex-package",
  "scripts": {
    "build:esnext": "tsc --project ./tsconfig.json",
    "build:test": "tsc --project ./src/test/tsconfig.json",
    "build:test:cjs": "tsc --project ./src/test/tsconfig.cjs.json",
    "build:test:esm": "tsc --project ./src/test/tsconfig.esm.json",
    "build:full": "npm run build:esnext && npm run build:docs",
    "test:all": "npm run build:test && npm run test:mocha"
  }
}
```

**After**:
```json
{
  "name": "@fluidframework/complex-package",
  "scripts": {
    "esnext": "tsc --project ./tsconfig.json",
    "test:build": "tsc --project ./src/test/tsconfig.json",
    "test:build:cjs": "tsc --project ./src/test/tsconfig.cjs.json",
    "test:build:esm": "tsc --project ./src/test/tsconfig.esm.json",
    "build:full": "npm run esnext && npm run build:docs",
    "test:all": "npm run test:build && npm run test:mocha"
  }
}
```

**Changes**: 4 renames + 2 cross-reference updates

---

## Backwards Compatibility

### Breaking Changes

⚠️ **These renames ARE breaking changes** for any workflows that call these scripts directly:

**Example CI Script**:
```bash
# Before (will break)
pnpm run build:esnext

# After (correct)
pnpm run esnext
```

**Example Make Target**:
```makefile
# Before (will break)
build:
	cd packages/foo && npm run build:test

# After (correct)
build:
	cd packages/foo && npm run test:build
```

### What's NOT Affected

✅ Internal package.json cross-references (automatically updated)
✅ Scripts that don't call renamed scripts
✅ External tools calling top-level `build`, `test`, `lint` (those aren't renamed)

### Migration Guide for External Scripts

If you have external scripts (CI, Makefiles, docs) that reference these scripts:

1. **Find all references**:
   ```bash
   grep -r "build:esnext" .github/workflows/
   grep -r "build:test" scripts/
   ```

2. **Update to new names** using the mapping table above

3. **Test thoroughly** before merging

---

## Statistics by Rename Pattern

| Pattern | Packages | % of Total | Avg Cross-Refs per Package |
|---------|----------|------------|----------------------------|
| `build:esnext` → `esnext` | 154 | 93.3% | ~1.0 |
| `build:test` → `test:build` | 88 | 53.3% | ~0.8 |
| `build:test:cjs` → `test:build:cjs` | 74 | 44.8% | ~0.3 |
| `build:test:esm` → `test:build:esm` | 81 | 49.1% | ~0.3 |
| `format-and-build` → `build:format-first` | 8 | 4.8% | ~0.5 |
| `format-and-compile` → `compile:format-first` | 8 | 4.8% | ~0.5 |

**Total**: 413 rename instances across 165 packages
**Average**: 2.5 renames per package
**Max**: Some packages have 4+ renames

---

## Command Output Legend

When running the tool, you'll see output like:

```
🔄 Rename Plan:
  build:esnext → esnext (154 packages)
```

**Reading this**:
- **Left side** (`build:esnext`): Current script name in package.json
- **Right side** (`esnext`): New script name after rename
- **Number** (`154 packages`): How many packages have this script

**Cross-Reference Updates**:
```
📝 Cross-Reference Updates: 236 scripts
```

This means 236 scripts in various packages reference renamed scripts and will be automatically updated.

---

## Related Documentation

- **Three-Tier Principles**: See `task-naming-principles.md`
- **Implementation Strategy**: See `fluid-task-rename-strategy.md`
- **Implementation Details**: See `fluid-task-rename-implementation.md`
