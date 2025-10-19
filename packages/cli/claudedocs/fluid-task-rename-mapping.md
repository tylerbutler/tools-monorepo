# FluidFramework Task Rename - Complete Mapping (All 48 Rules)

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Rename Rules** | **48** |
| Total Packages in Repository | 165 |
| Estimated Packages Affected | ~160 (97%) |
| Estimated Cross-Reference Updates | ~250+ scripts |

**Documentation Status**: ✅ All 48 rules documented (100% coverage)
**Last Updated**: 2025-10-19

---

## Three-Tier Naming Principles (Quick Reference)

| Tier | Name Pattern | Purpose | Examples |
|------|--------------|---------|----------|
| **Tier 1** | `build`, `test`, `lint` | Workflow Orchestrators | Top-level user commands |
| **Tier 2** | `build:*`, `test:*`, `check:*` | Stage Orchestrators | Coordinate related tasks |
| **Tier 3** | `tsc`, `eslint`, `esnext` | Executors | Run single tool directly |

---

## Complete Rule Listing (Organized by Category)

### Phase 1: Initial Rules (3 rules)

These were the first rules implemented to establish the naming pattern.

#### Rule 1: `build:esnext:experimental` → `esnext-experimental`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for experimental entry point
- **Pattern**: Exact match `"build:esnext:experimental"`
- **Estimated Packages**: ~15

**Example**:
```json
// Before
"build:esnext:experimental": "tsc --project ./tsconfig.experimental.json"

// After
"esnext-experimental": "tsc --project ./tsconfig.experimental.json"
```

---

#### Rule 2: `build:esnext:main` → `esnext-main`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for main entry point
- **Pattern**: Exact match `"build:esnext:main"`
- **Estimated Packages**: ~20

**Example**:
```json
// Before
"build:esnext:main": "tsc --project ./tsconfig.main.json"

// After
"esnext-main": "tsc --project ./tsconfig.main.json"
```

---

#### Rule 3: `build:esnext` → `esnext`
- **Tier**: 3 (Executor)
- **Reason**: Executor should use tool name only (runs tsc directly)
- **Pattern**: Exact match `"build:esnext"`
- **Estimated Packages**: 154

**Example**:
```json
// Before
"build:esnext": "tsc --project ./tsconfig.esnext.json"

// After
"esnext": "tsc --project ./tsconfig.esnext.json"
```

**Why This Matters**: Most common rename - affects 93% of packages.

---

### Reverse Renames (3 rules)

These reverse earlier incorrect renames from Phase 1.

#### Rule 4: `format-and-build` → `build:format-first`
- **Tier**: 2 (Stage Orchestrator)
- **Reason**: More descriptive stage orchestrator name
- **Pattern**: Exact match `"format-and-build"`
- **Estimated Packages**: 8

**Example**:
```json
// Before
"format-and-build": "npm run format && npm run build"

// After
"build:format-first": "npm run format && npm run build"
```

---

#### Rule 5: `format-and-compile` → `compile:format-first`
- **Tier**: 2 (Stage Orchestrator)
- **Reason**: More descriptive stage orchestrator name
- **Pattern**: Exact match `"format-and-compile"`
- **Estimated Packages**: 8

**Example**:
```json
// Before
"format-and-compile": "npm run format && npm run compile"

// After
"compile:format-first": "npm run format && npm run compile"
```

---

#### Rule 6: `test:build` → `build:test`
- **Tier**: 2 (Stage Orchestrator)
- **Reason**: L2 Orchestrator - called by build L1, not test L1
- **Pattern**: Exact match `"test:build"`
- **Estimated Packages**: 88

**Example**:
```json
// Before
"test:build": "npm run build:test:cjs && npm run build:test:esm"

// After
"build:test": "npm run build:test:cjs && npm run build:test:esm"
```

**Important Note**: This reverses an earlier Phase 1 rename. The `build` orchestrator should build everything (including tests), while the `test` orchestrator should run tests (assuming already built).

---

#### Rule 7: `test:build:cjs` → `build:test:cjs`
- **Tier**: 2 (Stage Orchestrator)
- **Reason**: L2 Orchestrator - build stage variant for CJS
- **Pattern**: Exact match `"test:build:cjs"`
- **Estimated Packages**: 74

**Example**:
```json
// Before
"test:build:cjs": "tsc --project ./src/test/tsconfig.cjs.json"

// After
"build:test:cjs": "tsc --project ./src/test/tsconfig.cjs.json"
```

---

#### Rule 8: `test:build:esm` → `build:test:esm`
- **Tier**: 2 (Stage Orchestrator)
- **Reason**: L2 Orchestrator - build stage variant for ESM
- **Pattern**: Exact match `"test:build:esm"`
- **Estimated Packages**: 81

**Example**:
```json
// Before
"test:build:esm": "tsc --project ./src/test/tsconfig.esm.json"

// After
"build:test:esm": "tsc --project ./src/test/tsconfig.esm.json"
```

---

## Category A: Documentation Generation (5 rules)

API documentation and report generation executors.

#### Rule 9: `build:docs` → `api-extractor`
- **Tier**: 3 (Executor)
- **Reason**: Tool name for api-extractor runner
- **Pattern**: Exact match `"build:docs"`
- **Estimated Packages**: ~30

**Example**:
```json
// Before
"build:docs": "api-extractor run --local --verbose"

// After
"api-extractor": "api-extractor run --local --verbose"
```

---

#### Rule 10: `build:api-reports:current` → `api-reports-current`
- **Tier**: 3 (Executor)
- **Reason**: Semantic name with dash-separated variant
- **Pattern**: Exact match `"build:api-reports:current"`
- **Estimated Packages**: ~40

**Example**:
```json
// Before
"build:api-reports:current": "api-extractor run --config api-extractor/api-extractor-current.json"

// After
"api-reports-current": "api-extractor run --config api-extractor/api-extractor-current.json"
```

---

#### Rule 11: `build:api-reports:legacy` → `api-reports-legacy`
- **Tier**: 3 (Executor)
- **Reason**: Semantic name with dash-separated variant
- **Pattern**: Exact match `"build:api-reports:legacy"`
- **Estimated Packages**: ~25

**Example**:
```json
// Before
"build:api-reports:legacy": "api-extractor run --config api-extractor/api-extractor-legacy.json"

// After
"api-reports-legacy": "api-extractor run --config api-extractor/api-extractor-legacy.json"
```

---

#### Rule 12: `build:api-reports:browser:current` → `api-reports-browser-current`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for browser variant with current API level
- **Pattern**: Exact match `"build:api-reports:browser:current"`
- **Estimated Packages**: ~15

**Example**:
```json
// Before
"build:api-reports:browser:current": "api-extractor run --config api-extractor-browser-current.json"

// After
"api-reports-browser-current": "api-extractor run --config api-extractor-browser-current.json"
```

---

#### Rule 13: `build:api-reports:browser:legacy` → `api-reports-browser-legacy`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for browser variant with legacy API level
- **Pattern**: Exact match `"build:api-reports:browser:legacy"`
- **Estimated Packages**: ~10

**Example**:
```json
// Before
"build:api-reports:browser:legacy": "api-extractor run --config api-extractor-browser-legacy.json"

// After
"api-reports-browser-legacy": "api-extractor run --config api-extractor-browser-legacy.json"
```

---

## Category B: File Operations (2 rules)

File copying and version generation executors.

#### Rule 14: `build:copy` → `copyfiles`
- **Tier**: 3 (Executor)
- **Reason**: Tool name (called directly by L1 build)
- **Pattern**: Exact match `"build:copy"`
- **Estimated Packages**: ~20

**Example**:
```json
// Before
"build:copy": "copyfiles -u 1 \"src/**/*.json\" dist/"

// After
"copyfiles": "copyfiles -u 1 \"src/**/*.json\" dist/"
```

---

#### Rule 15: `build:genver` → `generate-version`
- **Tier**: 3 (Executor)
- **Reason**: Generates version file using gen-version tool
- **Pattern**: Exact match `"build:genver"`
- **Estimated Packages**: ~45

**Example**:
```json
// Before
"build:genver": "gen-version"

// After
"generate-version": "gen-version"
```

---

## Category C: Test Infrastructure (8 rules)

TypeScript compilation for test files and test runners.

#### Rule 16: `build:test` → `tsc-test` (Conditional)
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for test files in test-only packages
- **Pattern**: Exact match `"build:test"`
- **Condition**: Script runs `tsc` directly without `npm run` or `&&`
- **Estimated Packages**: ~15

**Example**:
```json
// Before (test-only package)
"build:test": "tsc --project ./tsconfig.test.json"

// After
"tsc-test": "tsc --project ./tsconfig.test.json"
```

**Important**: This rule only applies when the script is a simple `tsc` executor. If it orchestrates multiple tasks, it won't match.

---

#### Rule 17: `build:test:cjs` → `tsc-test-cjs`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for CJS test files
- **Pattern**: Exact match `"build:test:cjs"`
- **Estimated Packages**: ~50

**Example**:
```json
// Before
"build:test:cjs": "tsc --project ./src/test/tsconfig.cjs.json"

// After
"tsc-test-cjs": "tsc --project ./src/test/tsconfig.cjs.json"
```

---

#### Rule 18: `build:test:esm` → `tsc-test-esm`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for ESM test files
- **Pattern**: Exact match `"build:test:esm"`
- **Estimated Packages**: ~55

**Example**:
```json
// Before
"build:test:esm": "tsc --project ./src/test/tsconfig.esm.json"

// After
"tsc-test-esm": "tsc --project ./src/test/tsconfig.esm.json"
```

---

#### Rule 19: `build:test:esm:no-exactOptionalPropertyTypes` → `tsc-test-esm-no-exactOptionalPropertyTypes`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for ESM test files without exactOptionalPropertyTypes
- **Pattern**: Exact match `"build:test:esm:no-exactOptionalPropertyTypes"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"build:test:esm:no-exactOptionalPropertyTypes": "tsc --project ./tsconfig.test-no-exact.json"

// After
"tsc-test-esm-no-exactOptionalPropertyTypes": "tsc --project ./tsconfig.test-no-exact.json"
```

---

#### Rule 20: `build:test:types` → `tsc-test-types`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for test type definitions
- **Pattern**: Exact match `"build:test:types"`
- **Estimated Packages**: ~10

**Example**:
```json
// Before
"build:test:types": "tsc --project ./src/test/types/tsconfig.json"

// After
"tsc-test-types": "tsc --project ./src/test/types/tsconfig.json"
```

---

#### Rule 21: `build:test:mocha:cjs` → `tsc-test-mocha-cjs`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for CJS mocha test files
- **Pattern**: Exact match `"build:test:mocha:cjs"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"build:test:mocha:cjs": "tsc --project ./src/test/mocha/tsconfig.cjs.json"

// After
"tsc-test-mocha-cjs": "tsc --project ./src/test/mocha/tsconfig.cjs.json"
```

---

#### Rule 22: `build:test:mocha:esm` → `tsc-test-mocha-esm`
- **Tier**: 3 (Executor)
- **Reason**: TypeScript compiler for ESM mocha test files
- **Pattern**: Exact match `"build:test:mocha:esm"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"build:test:mocha:esm": "tsc --project ./src/test/mocha/tsconfig.esm.json"

// After
"tsc-test-mocha-esm": "tsc --project ./src/test/mocha/tsconfig.esm.json"
```

---

#### Rule 23: `build:test:jest` → `jest`
- **Tier**: 3 (Executor)
- **Reason**: Pure test runner tool name
- **Pattern**: Exact match `"build:test:jest"`
- **Estimated Packages**: ~3

**Example**:
```json
// Before
"build:test:jest": "jest --config jest.config.js"

// After
"jest": "jest --config jest.config.js"
```

---

## Category D: Export Generation (2 rules)

Entry point generation executors using flub tool.

#### Rule 24: `build:exports:browser` → `generate-exports-browser`
- **Tier**: 3 (Executor)
- **Reason**: Generates browser entry points using flub
- **Pattern**: Exact match `"build:exports:browser"`
- **Estimated Packages**: ~12

**Example**:
```json
// Before
"build:exports:browser": "flub generate exports --outDir ./browser"

// After
"generate-exports-browser": "flub generate exports --outDir ./browser"
```

---

#### Rule 25: `build:exports:node` → `generate-exports-node`
- **Tier**: 3 (Executor)
- **Reason**: Generates node entry points using flub
- **Pattern**: Exact match `"build:exports:node"`
- **Estimated Packages**: ~15

**Example**:
```json
// Before
"build:exports:node": "flub generate exports --outDir ./node"

// After
"generate-exports-node": "flub generate exports --outDir ./node"
```

---

## Category E: Entrypoint Generation (2 rules)

TypeScript entry point file generation using flub.

#### Rule 26: `api-extractor:commonjs` → `generate-entrypoints-commonjs`
- **Tier**: 3 (Executor)
- **Reason**: Generates TypeScript entry point files for CommonJS using flub
- **Pattern**: Exact match `"api-extractor:commonjs"`
- **Estimated Packages**: ~20

**Example**:
```json
// Before
"api-extractor:commonjs": "flub generate entrypoints --outDir ./cjs"

// After
"generate-entrypoints-commonjs": "flub generate entrypoints --outDir ./cjs"
```

---

#### Rule 27: `api-extractor:esnext` → `generate-entrypoints-esnext`
- **Tier**: 3 (Executor)
- **Reason**: Generates TypeScript entry point files for ESNext using flub
- **Pattern**: Exact match `"api-extractor:esnext"`
- **Estimated Packages**: ~25

**Example**:
```json
// Before
"api-extractor:esnext": "flub generate entrypoints --outDir ./esnext"

// After
"generate-entrypoints-esnext": "flub generate entrypoints --outDir ./esnext"
```

---

## Category F: check: Prefix Executors (14 rules)

Validation and checking executors.

#### Rule 28: `check:biome` → `biome-check`
- **Tier**: 3 (Executor)
- **Reason**: biome formatting/linting checker
- **Pattern**: Exact match `"check:biome"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"check:biome": "biome check ."

// After
"biome-check": "biome check ."
```

---

#### Rule 29: `check:are-the-types-wrong` → `attw`
- **Tier**: 3 (Executor)
- **Reason**: are-the-types-wrong package validation tool
- **Pattern**: Exact match `"check:are-the-types-wrong"`
- **Estimated Packages**: ~30

**Example**:
```json
// Before
"check:are-the-types-wrong": "attw --pack"

// After
"attw": "attw --pack"
```

---

#### Rule 30: `check:exports:bundle-release-tags` → `api-extractor-exports-bundle-release-tags`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for bundle release tag validation
- **Pattern**: Exact match `"check:exports:bundle-release-tags"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"check:exports:bundle-release-tags": "api-extractor run --config api-extractor-bundle.json"

// After
"api-extractor-exports-bundle-release-tags": "api-extractor run --config api-extractor-bundle.json"
```

---

#### Rule 31: `check:exports:cjs:public` → `api-extractor-exports-cjs-public`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CJS public exports validation
- **Pattern**: Exact match `"check:exports:cjs:public"`
- **Estimated Packages**: ~12

**Example**:
```json
// Before
"check:exports:cjs:public": "api-extractor run --config api-extractor-cjs-public.json"

// After
"api-extractor-exports-cjs-public": "api-extractor run --config api-extractor-cjs-public.json"
```

---

#### Rule 32: `check:exports:esm:public` → `api-extractor-exports-esm-public`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for ESM public exports validation
- **Pattern**: Exact match `"check:exports:esm:public"`
- **Estimated Packages**: ~12

**Example**:
```json
// Before
"check:exports:esm:public": "api-extractor run --config api-extractor-esm-public.json"

// After
"api-extractor-exports-esm-public": "api-extractor run --config api-extractor-esm-public.json"
```

---

#### Rule 33: `check:exports:cjs:legacy` → `api-extractor-exports-cjs-legacy`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CJS legacy exports validation
- **Pattern**: Exact match `"check:exports:cjs:legacy"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"check:exports:cjs:legacy": "api-extractor run --config api-extractor-cjs-legacy.json"

// After
"api-extractor-exports-cjs-legacy": "api-extractor run --config api-extractor-cjs-legacy.json"
```

---

#### Rule 34: `check:exports:esm:legacy` → `api-extractor-exports-esm-legacy`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for ESM legacy exports validation
- **Pattern**: Exact match `"check:exports:esm:legacy"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"check:exports:esm:legacy": "api-extractor run --config api-extractor-esm-legacy.json"

// After
"api-extractor-exports-esm-legacy": "api-extractor run --config api-extractor-esm-legacy.json"
```

---

#### Rule 35: `check:exports:cjs:index` → `api-extractor-exports-cjs-index`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CJS index exports validation
- **Pattern**: Exact match `"check:exports:cjs:index"`
- **Estimated Packages**: ~6

**Example**:
```json
// Before
"check:exports:cjs:index": "api-extractor run --config api-extractor-cjs-index.json"

// After
"api-extractor-exports-cjs-index": "api-extractor run --config api-extractor-cjs-index.json"
```

---

#### Rule 36: `check:exports:esm:index` → `api-extractor-exports-esm-index`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for ESM index exports validation
- **Pattern**: Exact match `"check:exports:esm:index"`
- **Estimated Packages**: ~6

**Example**:
```json
// Before
"check:exports:esm:index": "api-extractor run --config api-extractor-esm-index.json"

// After
"api-extractor-exports-esm-index": "api-extractor run --config api-extractor-esm-index.json"
```

---

#### Rule 37: `check:exports:cjs:alpha` → `api-extractor-exports-cjs-alpha`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CJS alpha exports validation
- **Pattern**: Exact match `"check:exports:cjs:alpha"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"check:exports:cjs:alpha": "api-extractor run --config api-extractor-cjs-alpha.json"

// After
"api-extractor-exports-cjs-alpha": "api-extractor run --config api-extractor-cjs-alpha.json"
```

---

#### Rule 38: `check:exports:esm:alpha` → `api-extractor-exports-esm-alpha`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for ESM alpha exports validation
- **Pattern**: Exact match `"check:exports:esm:alpha"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"check:exports:esm:alpha": "api-extractor run --config api-extractor-esm-alpha.json"

// After
"api-extractor-exports-esm-alpha": "api-extractor run --config api-extractor-esm-alpha.json"
```

---

#### Rule 39: `check:exports:cjs:beta` → `api-extractor-exports-cjs-beta`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CJS beta exports validation
- **Pattern**: Exact match `"check:exports:cjs:beta"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"check:exports:cjs:beta": "api-extractor run --config api-extractor-cjs-beta.json"

// After
"api-extractor-exports-cjs-beta": "api-extractor run --config api-extractor-cjs-beta.json"
```

---

#### Rule 40: `check:exports:esm:beta` → `api-extractor-exports-esm-beta`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for ESM beta exports validation
- **Pattern**: Exact match `"check:exports:esm:beta"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"check:exports:esm:beta": "api-extractor run --config api-extractor-esm-beta.json"

// After
"api-extractor-exports-esm-beta": "api-extractor run --config api-extractor-esm-beta.json"
```

---

#### Rule 41: `check:release-tags` → `api-extractor-release-tags`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for release tag validation
- **Pattern**: Exact match `"check:release-tags"`
- **Estimated Packages**: ~10

**Example**:
```json
// Before
"check:release-tags": "api-extractor run --config api-extractor-release-tags.json"

// After
"api-extractor-release-tags": "api-extractor run --config api-extractor-release-tags.json"
```

---

## Category G: ci: Prefix Executors (6 rules)

CI-specific API documentation generation executors.

#### Rule 42: `ci:build:docs` → `api-extractor-ci-docs`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI documentation generation
- **Pattern**: Exact match `"ci:build:docs"`
- **Estimated Packages**: ~25

**Example**:
```json
// Before
"ci:build:docs": "api-extractor run --local=false"

// After
"api-extractor-ci-docs": "api-extractor run --local=false"
```

---

#### Rule 43: `ci:build:api-reports:current` → `api-extractor-ci-api-reports-current`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI API reports (current)
- **Pattern**: Exact match `"ci:build:api-reports:current"`
- **Estimated Packages**: ~30

**Example**:
```json
// Before
"ci:build:api-reports:current": "api-extractor run --config api-extractor-current.json --local=false"

// After
"api-extractor-ci-api-reports-current": "api-extractor run --config api-extractor-current.json --local=false"
```

---

#### Rule 44: `ci:build:api-reports:legacy` → `api-extractor-ci-api-reports-legacy`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI API reports (legacy)
- **Pattern**: Exact match `"ci:build:api-reports:legacy"`
- **Estimated Packages**: ~20

**Example**:
```json
// Before
"ci:build:api-reports:legacy": "api-extractor run --config api-extractor-legacy.json --local=false"

// After
"api-extractor-ci-api-reports-legacy": "api-extractor run --config api-extractor-legacy.json --local=false"
```

---

#### Rule 45: `ci:build:api-reports:browser:current` → `api-extractor-ci-api-reports-browser-current`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI browser variant (current)
- **Pattern**: Exact match `"ci:build:api-reports:browser:current"`
- **Estimated Packages**: ~12

**Example**:
```json
// Before
"ci:build:api-reports:browser:current": "api-extractor run --config api-extractor-browser-current.json --local=false"

// After
"api-extractor-ci-api-reports-browser-current": "api-extractor run --config api-extractor-browser-current.json --local=false"
```

---

#### Rule 46: `ci:build:api-reports:browser:legacy` → `api-extractor-ci-api-reports-browser-legacy`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI browser variant (legacy)
- **Pattern**: Exact match `"ci:build:api-reports:browser:legacy"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"ci:build:api-reports:browser:legacy": "api-extractor run --config api-extractor-browser-legacy.json --local=false"

// After
"api-extractor-ci-api-reports-browser-legacy": "api-extractor run --config api-extractor-browser-legacy.json --local=false"
```

---

#### Rule 47: `ci:build:api-reports:node:current` → `api-extractor-ci-api-reports-node-current`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI node variant (current)
- **Pattern**: Exact match `"ci:build:api-reports:node:current"`
- **Estimated Packages**: ~10

**Example**:
```json
// Before
"ci:build:api-reports:node:current": "api-extractor run --config api-extractor-node-current.json --local=false"

// After
"api-extractor-ci-api-reports-node-current": "api-extractor run --config api-extractor-node-current.json --local=false"
```

---

#### Rule 48: `ci:build:api-reports:node:legacy` → `api-extractor-ci-api-reports-node-legacy`
- **Tier**: 3 (Executor)
- **Reason**: api-extractor for CI node variant (legacy)
- **Pattern**: Exact match `"ci:build:api-reports:node:legacy"`
- **Estimated Packages**: ~8

**Example**:
```json
// Before
"ci:build:api-reports:node:legacy": "api-extractor run --config api-extractor-node-legacy.json --local=false"

// After
"api-extractor-ci-api-reports-node-legacy": "api-extractor run --config api-extractor-node-legacy.json --local=false"
```

---

## Category H: format: Prefix Executors (1 rule)

Formatting executors.

#### Rule 49: `format:biome` → `biome-format`
- **Tier**: 3 (Executor)
- **Reason**: biome formatting with write mode
- **Pattern**: Exact match `"format:biome"`
- **Estimated Packages**: ~5

**Example**:
```json
// Before
"format:biome": "biome format --write ."

// After
"biome-format": "biome format --write ."
```

---

## Scripts NOT Renamed (Ignored)

These scripts call `fluid-build` and will be removed in Phase 2 (Nx/Turbo migration):

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
  "build:full": "npm run esnext && npm run api-extractor"
}
```

**Example 2: fluidBuild.tasks dependencies**
```json
// Before
{
  "fluidBuild": {
    "tasks": {
      "build:esnext": ["^tsc"],
      "build": ["build:esnext", "build:docs"]
    }
  }
}

// After
{
  "fluidBuild": {
    "tasks": {
      "esnext": ["^tsc"],
      "build": ["esnext", "api-extractor"]
    }
  }
}
```

### Patterns Detected and Updated

The tool handles all common script runner patterns:

- `npm run <script>` → `npm run <new-name>`
- `pnpm <script>` → `pnpm <new-name>`
- `yarn <script>` → `yarn <new-name>`
- `npm:<script>` → `npm:<new-name>` (concurrently patterns)
- `@package#<script>` → `@package#<new-name>` (fluidBuild cross-package refs)
- `^<script>`, `~<script>` → `^<new-name>`, `~<new-name>` (fluidBuild prefixes)

With word boundary detection to avoid partial matches:
- `npm run build:test` ✅ matches and updates
- `npm run build:test:esm` ❌ does NOT match `build:test` rule (has more specificity)

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

---

## Quick Reference Table - All 48 Rules

| # | Old Name | New Name | Tier | Category |
|---|----------|----------|------|----------|
| 1 | `build:esnext:experimental` | `esnext-experimental` | 3 | Phase 1 |
| 2 | `build:esnext:main` | `esnext-main` | 3 | Phase 1 |
| 3 | `build:esnext` | `esnext` | 3 | Phase 1 |
| 4 | `format-and-build` | `build:format-first` | 2 | Reverse |
| 5 | `format-and-compile` | `compile:format-first` | 2 | Reverse |
| 6 | `test:build` | `build:test` | 2 | Reverse |
| 7 | `test:build:cjs` | `build:test:cjs` | 2 | Reverse |
| 8 | `test:build:esm` | `build:test:esm` | 2 | Reverse |
| 9 | `build:docs` | `api-extractor` | 3 | Docs (A) |
| 10 | `build:api-reports:current` | `api-reports-current` | 3 | Docs (A) |
| 11 | `build:api-reports:legacy` | `api-reports-legacy` | 3 | Docs (A) |
| 12 | `build:api-reports:browser:current` | `api-reports-browser-current` | 3 | Docs (A) |
| 13 | `build:api-reports:browser:legacy` | `api-reports-browser-legacy` | 3 | Docs (A) |
| 14 | `build:copy` | `copyfiles` | 3 | Files (B) |
| 15 | `build:genver` | `generate-version` | 3 | Files (B) |
| 16 | `build:test` | `tsc-test` | 3 | Test (C) |
| 17 | `build:test:cjs` | `tsc-test-cjs` | 3 | Test (C) |
| 18 | `build:test:esm` | `tsc-test-esm` | 3 | Test (C) |
| 19 | `build:test:esm:no-exactOptionalPropertyTypes` | `tsc-test-esm-no-exactOptionalPropertyTypes` | 3 | Test (C) |
| 20 | `build:test:types` | `tsc-test-types` | 3 | Test (C) |
| 21 | `build:test:mocha:cjs` | `tsc-test-mocha-cjs` | 3 | Test (C) |
| 22 | `build:test:mocha:esm` | `tsc-test-mocha-esm` | 3 | Test (C) |
| 23 | `build:test:jest` | `jest` | 3 | Test (C) |
| 24 | `build:exports:browser` | `generate-exports-browser` | 3 | Exports (D) |
| 25 | `build:exports:node` | `generate-exports-node` | 3 | Exports (D) |
| 26 | `api-extractor:commonjs` | `generate-entrypoints-commonjs` | 3 | Entrypoints (E) |
| 27 | `api-extractor:esnext` | `generate-entrypoints-esnext` | 3 | Entrypoints (E) |
| 28 | `check:biome` | `biome-check` | 3 | Check (F) |
| 29 | `check:are-the-types-wrong` | `attw` | 3 | Check (F) |
| 30 | `check:exports:bundle-release-tags` | `api-extractor-exports-bundle-release-tags` | 3 | Check (F) |
| 31 | `check:exports:cjs:public` | `api-extractor-exports-cjs-public` | 3 | Check (F) |
| 32 | `check:exports:esm:public` | `api-extractor-exports-esm-public` | 3 | Check (F) |
| 33 | `check:exports:cjs:legacy` | `api-extractor-exports-cjs-legacy` | 3 | Check (F) |
| 34 | `check:exports:esm:legacy` | `api-extractor-exports-esm-legacy` | 3 | Check (F) |
| 35 | `check:exports:cjs:index` | `api-extractor-exports-cjs-index` | 3 | Check (F) |
| 36 | `check:exports:esm:index` | `api-extractor-exports-esm-index` | 3 | Check (F) |
| 37 | `check:exports:cjs:alpha` | `api-extractor-exports-cjs-alpha` | 3 | Check (F) |
| 38 | `check:exports:esm:alpha` | `api-extractor-exports-esm-alpha` | 3 | Check (F) |
| 39 | `check:exports:cjs:beta` | `api-extractor-exports-cjs-beta` | 3 | Check (F) |
| 40 | `check:exports:esm:beta` | `api-extractor-exports-esm-beta` | 3 | Check (F) |
| 41 | `check:release-tags` | `api-extractor-release-tags` | 3 | Check (F) |
| 42 | `ci:build:docs` | `api-extractor-ci-docs` | 3 | CI (G) |
| 43 | `ci:build:api-reports:current` | `api-extractor-ci-api-reports-current` | 3 | CI (G) |
| 44 | `ci:build:api-reports:legacy` | `api-extractor-ci-api-reports-legacy` | 3 | CI (G) |
| 45 | `ci:build:api-reports:browser:current` | `api-extractor-ci-api-reports-browser-current` | 3 | CI (G) |
| 46 | `ci:build:api-reports:browser:legacy` | `api-extractor-ci-api-reports-browser-legacy` | 3 | CI (G) |
| 47 | `ci:build:api-reports:node:current` | `api-extractor-ci-api-reports-node-current` | 3 | CI (G) |
| 48 | `ci:build:api-reports:node:legacy` | `api-extractor-ci-api-reports-node-legacy` | 3 | CI (G) |

**Note**: Rule 49 (`format:biome` → `biome-format`) was documented in the table but appears to be missing from the implementation. This brings the total to 48 implemented rules.

---

## Related Documentation

- **Three-Tier Principles**: See `task-naming-principles.md`
- **Implementation Strategy**: See `fluid-task-rename-strategy.md`
- **Implementation Details**: See `fluid-task-rename-implementation.md`
- **Source Code**: `src/lib/fluid-repo-overlay/task-rename.ts`
