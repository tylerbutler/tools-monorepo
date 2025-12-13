# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

TypeScript test runner and library for validating CCL (Categorical Configuration Language) implementations against the `ccl-test-data` JSON test suite. This package provides:

- **Capability-based test filtering** - Run only tests compatible with your implementation
- **Test data loading** - Load and filter tests from ccl-test-data releases
- **Schema validation** - Type-safe test structures derived from JSON schema
- **CCL function stubs** - Placeholder implementations for incremental development

## Commands

```bash
# Build
pnpm build:compile    # TypeScript compilation

# Test
pnpm test             # Run all tests
pnpm vitest test/ccl.test.ts  # Run specific test file
pnpm test:coverage    # Tests with coverage

# Lint/Format
pnpm lint             # Check linting
pnpm lint:fix         # Auto-fix lint issues
pnpm format           # Format code

# Test data management
pnpm download-tests   # Download test data from ccl-test-data releases
pnpm sync-schema      # Update JSON schema from ccl-test-data

# Type generation
pnpm build:types      # Generate TypeScript types from JSON schema
```

## Architecture

### Core Modules

**`src/capabilities.ts`** - Implementation capability declarations
- `ImplementationCapabilities` - Declare supported functions, features, behaviors, variants
- `CCLFunction`, `CCLFeature`, `CCLBehavior`, `CCLVariant` - Tag types
- `BEHAVIOR_CONFLICTS` - Mutually exclusive behavior groups (boolean_strict vs boolean_lenient, etc.)
- `createCapabilities()` / `getStubCapabilities()` - Factory functions

**`src/test-data.ts`** - Test data loading and filtering
- `loadTestData()` - Load tests with capability filtering
- `loadAllTests()` - Load all tests without filtering
- `shouldRunTest()` - Check if single test matches capabilities
- `groupTestsByFunction()` / `groupTestsBySourceTest()` - Grouping utilities
- `getTestStats()` - Calculate test statistics

**`src/ccl.ts`** - CCL function stubs (to be implemented)
- `parse()` - Parse CCL text to flat entries
- `parseIndented()` - Parse with indentation normalization
- `buildHierarchy()` - Build nested objects from flat entries
- `parseToObject()` - Convenience: parse + buildHierarchy
- All functions throw `NotYetImplementedError` until implemented

**`src/schema-validation.ts`** - Type definitions from JSON schema
- Uses `json-schema-to-ts` for compile-time type derivation
- `TestCase`, `TestFile`, `TestExpected`, `TestConflicts` types
- Schema defined inline with `as const satisfies JSONSchema` pattern

**`src/download.ts`** - Test data download from GitHub releases
- `downloadTestData()` - Download test files from ccl-test-data releases
- `downloadSchema()` - Download JSON schema
- Version tracking via `.version` marker file
- Can run as script: `node --loader ts-node/esm src/download.ts`

### Test Data Flow

```
ccl-test-data (GitHub releases)
    ↓ pnpm download-tests
.test-data/*.json (local test files)
    ↓ loadTestData({ capabilities })
LoadedTestData (filtered tests)
    ↓ vitest
Test execution
```

### Capability Filtering Logic

Tests are filtered by checking all requirements (ALL must pass):
1. **Functions** - All required functions must be implemented
2. **Features** - All required features must be supported
3. **Behaviors** - Implementation behaviors must match (no conflicts)
4. **Variants** - Implementation variant must match if specified
5. **Conflicts** - Test must not conflict with implementation capabilities

### Type Generation Pattern

The package uses `json-schema-to-ts` for deriving types from JSON schema at compile time:

```typescript
// Schema defined with `as const satisfies JSONSchema`
const testCaseSchema = { ... } as const satisfies JSONSchema;

// Types derived using FromSchema
export type TestCase = FromSchema<typeof testCaseSchema>;
```

This ensures types stay synchronized with the upstream schema from ccl-test-data.

## File Organization

```
src/
├── capabilities.ts    # Capability declarations and validation
├── ccl.ts            # CCL function stubs
├── download.ts       # Test data download from GitHub
├── errors.ts         # NotYetImplementedError
├── index.ts          # Public API exports
├── schema-validation.ts  # JSON schema types
├── test-data.ts      # Test loading and filtering
├── types.ts          # CCL domain types (Entry, CCLObject, etc.)
└── generated/        # Generated files (do not edit)
    └── test-schema.ts

test/
└── ccl.test.ts       # Test suite

.test-data/           # Downloaded test JSON files (gitignored)
schemas/              # JSON schema from ccl-test-data
```

## Key Dependencies

- **dill-cli** - File download/extraction (workspace dependency)
- **pathe** - Cross-platform path handling
- **json-schema-to-ts** - Compile-time type derivation from JSON schema
- **vitest** - Test framework

## Implementation Notes

- CCL functions in `src/ccl.ts` are stubs that throw `NotYetImplementedError`
- Implementing a function: remove the throw, implement the logic, add to `getImplementedFunctions()`
- Update capabilities in tests when implementing new functions
- Test data is downloaded on first test run if `.test-data/` doesn't exist
