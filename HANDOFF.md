# Handoff Document: CCL Result Types Migration

**Date:** 2026-01-15
**Branch:** `feat/cli-generate-commit-config`
**Status:** Migration Complete ✅

## Summary

Successfully migrated ccl-ts and ccl-test-runner-ts packages from throwing error patterns to Result types using the `true-myth` library. This aligns the TypeScript implementation with the Gleam/OCaml CCL implementations.

## What Was Done

### ccl-ts Package

1. **Added `true-myth` dependency** (^9.3.1)
2. **Added `/types` export entrypoint** in package.json
3. **Created `src/types-export.ts`** - Re-exports CCL types + Result/ok/err from true-myth
4. **Updated `src/types.ts`**:
   - Added `AccessError` interface for typed access function errors
   - Removed legacy `ParseResult`/`HierarchyResult` types (moved to test runner)
5. **Updated `src/index.ts`**:
   - Re-exports types for API Extractor compatibility
   - Re-exports Result types from true-myth
6. **Migrated `src/ccl.ts`** - All functions now return `Result<T, E>`:
   - `parse()` → `Result<Entry[], ParseError>`
   - `buildHierarchy()` → `Result<CCLObject, ParseError>`
   - `getString()` → `Result<string, AccessError>`
   - `getInt()` → `Result<number, AccessError>`
   - `getBool()` → `Result<boolean, AccessError>`
   - `getFloat()` → `Result<number, AccessError>`
   - `getList()` → `Result<string[], AccessError>`
   - `canonicalFormat()` → `Result<string, ParseError>`
   - `print()` - unchanged (infallible, no Result needed)

### ccl-test-runner-ts Package

1. **Defined types locally** in `src/types.ts` to avoid cyclic dependency with ccl-ts
2. **Kept normalization utilities** to support BOTH patterns:
   - Throwing functions (legacy)
   - true-myth Result functions (new)
   - Legacy `{ success, ... }` result objects
3. **Updated `src/vitest.ts`**:
   - Added `unwrapTypedAccessResult()` helper for handling both patterns
   - Updated validation handlers to use `.isOk`/`.isErr`
4. **Updated tests** in `test/runner/types.test.ts`

### CLI Package (@tylerbu/cli)

- Updated `src/commands/generate/commit-config.ts` to handle Result types

## Key Design Decisions

1. **Types duplicated in test runner** - The test runner defines its own copies of `Entry`, `CCLObject`, etc. to avoid a cyclic workspace dependency (ccl-ts → ccl-test-runner-ts for tests, test-runner → ccl-ts for types would create a cycle)

2. **Test runner supports both patterns** - The normalization utilities (`normalizeParseFunction`, `normalizeBuildHierarchyFunction`) convert any function pattern to true-myth Result, allowing backwards compatibility

3. **API Extractor compatibility** - Types are re-exported from both the main entrypoint and `/types` entrypoint since function signatures reference these types

## Files Modified

### ccl-ts
- `package.json` - Added true-myth dependency, /types export
- `src/types.ts` - Added AccessError, simplified
- `src/types-export.ts` - NEW: Type re-export entrypoint
- `src/index.ts` - Added type re-exports
- `src/ccl.ts` - Migrated to Result types
- `test/unit.test.ts` - Updated assertions for Result types

### ccl-test-runner-ts
- `package.json` - Removed ccl-ts dependency (was causing cycle)
- `src/types.ts` - Complete rewrite with local type definitions
- `src/vitest.ts` - Updated for Result handling
- `test/runner/types.test.ts` - Updated tests

### cli
- `src/commands/generate/commit-config.ts` - Handle Result types

## How to Verify

```bash
# Run all tests
pnpm test

# Run CI on affected packages
pnpm run ci:local

# Build everything
pnpm build
```

## Usage Examples

### Before (throwing pattern)
```typescript
import { parse, buildHierarchy, getString } from 'ccl-ts';

try {
  const entries = parse(text);
  const obj = buildHierarchy(entries);
  const host = getString(obj, "server", "host");
} catch (error) {
  console.error(error.message);
}
```

### After (Result pattern)
```typescript
import { parse, buildHierarchy, getString } from 'ccl-ts';

const entriesResult = parse(text);
if (entriesResult.isErr) {
  console.error(entriesResult.error.message);
  return;
}

const objResult = buildHierarchy(entriesResult.value);
if (objResult.isErr) {
  console.error(objResult.error.message);
  return;
}

const hostResult = getString(objResult.value, "server", "host");
hostResult.match({
  Ok: (host) => console.log(host),
  Err: (error) => console.error(error.message),
});
```

## Breaking Changes

This is a **breaking change** for ccl-ts consumers:
1. All functions now return `Result<T, E>` instead of throwing
2. Error handling must use `.isOk`/`.isErr` or `.match()` pattern
3. Types can be imported from `ccl-ts/types` or `ccl-ts`

## Next Steps

1. Create a changeset for the breaking change with major version bump
2. Update any other consumers of ccl-ts in the monorepo
3. Update documentation on ccl.tylerbutler.com

## Related Resources

- Plan file: `~/.claude/plans/wise-riding-aurora.md`
- true-myth docs: https://true-myth.js.org/
- CCL spec: https://ccl.tylerbutler.com
