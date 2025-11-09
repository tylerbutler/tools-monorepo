# Cache Validity Tests Implementation

## Overview

This document describes the implementation of cache validity integration tests for Sail, based on the test plan in `CACHE_VALIDITY_TEST_PLAN.md`.

## Implementation Summary

### Test Fixture: Multi-Level Multi-Task Monorepo

Created a comprehensive test fixture at `test/integration/fixtures/cache-validity/multi-level-multi-task/` with:

- **12 packages** organized in 4 dependency levels
- **3 task types** per package: build, test, lint
- **36 total tasks** to create sufficient complexity for testing cache behavior
- **Diamond dependency patterns** to maximize parallelism and cache contention

#### Package Structure

```
Level 0 (Foundation - 3 packages):
  - @cache-test/utils
  - @cache-test/types  
  - @cache-test/config

Level 1 (Core Libraries - 4 packages):
  - @cache-test/core        → depends on: utils, types
  - @cache-test/validation  → depends on: types, config
  - @cache-test/parser      → depends on: utils, types
  - @cache-test/formatter   → depends on: utils, config

Level 2 (Integration - 3 packages):
  - @cache-test/cli         → depends on: core, validation, parser
  - @cache-test/server      → depends on: core, formatter
  - @cache-test/client      → depends on: parser, formatter

Level 3 (Applications - 2 packages):
  - @cache-test/app-web     → depends on: cli, client
  - @cache-test/app-desktop → depends on: cli, client, server
```

### Cache Validation Helpers

Created `test/integration/support/cacheValidationHelpers.ts` with utilities for:

1. **Cache Statistics**: `getCacheStatistics(cacheDir)` - Analyzes cache directory structure
2. **Entry Validation**: `verifyCacheEntry(cacheDir, taskId)` - Validates cache entry integrity
3. **Corruption Testing**: `corruptCacheEntry(cacheDir, taskId, type)` - Deliberately corrupts entries
4. **Assertions**: Helper functions for common test assertions

#### Key Implementation Details

- Cache entries are stored in `{cacheDir}/v1/entries/` subdirectory
- Each entry must have a valid `manifest.json` with `version` and `cacheKey` fields
- Cache entry validation checks for:
  - Directory existence
  - manifest.json presence and valid JSON
  - Required manifest fields (version, cacheKey)

### Test Scenarios Implemented

#### ✅ Scenario 1: First Build - Cache Population
- Verifies all tasks execute and cache entries are created
- Checks for cache corruption after initial build
- Validates cache entry count > 0

#### ✅ Scenario 2: Second Build - Full Cache Hit
- Verifies cache is used on second build without changes
- Confirms fewer tasks built on second run
- Validates `leafUpToDateCount` > 0 (cache hits)

#### ✅ Scenario 3: Partial Cache Invalidation
- Modifies source file in `types` package
- Verifies affected packages rebuild
- Confirms unaffected packages use cache
- Validates at least 3 tasks rebuilt (types + dependents)

#### ✅ Scenario 6: Cache Recovery from Corruption
- **Missing manifest.json**: Removes manifest from cache entry
- **Invalid JSON**: Writes malformed JSON to manifest
- Verifies builds succeed despite corruption
- Confirms corrupted entries are rebuilt

#### ✅ Scenario 7: Cache Under High Parallelism
- Executes build with `concurrency: 16`
- Verifies no cache corruption under high load
- Confirms second build uses cache successfully

#### ✅ Cache Entry Validation
- Validates cache entries have proper structure
- Checks manifest.json validity
- Confirms no corrupted entries after builds

#### ✅ Cache Statistics
- Tracks cache hits vs builds across multiple runs
- Verifies cache hit rate improves on subsequent builds
- Validates `leafUpToDateCount >= leafBuiltCount` on cached builds

### Multi-Build Correctness & Cache Hit Rate Analysis

These tests focus on verifying cache correctness over multiple build cycles and tracking both donefile and shared cache hit rates separately.

#### ✅ 100% Donefile Hit Rate on Repeated Builds
- Verifies first build executes all tasks (0% cached)
- Confirms second build achieves 100% cache hits via donefiles
- Validates third build maintains 100% hit rate
- Ensures no tasks are rebuilt when nothing changes

#### ✅ Shared Cache Usage After Output Deletion
- Populates cache with initial build
- Deletes all output directories (dist/)
- Forces shared cache restoration on next build
- Verifies shared cache hit rate > 30%
- Confirms all tasks are satisfied via shared cache (no rebuilds)

#### ✅ Correctness Across 5 Consecutive Builds
- Build 1: Populates cache (builds all tasks)
- Builds 2-5: Each achieves 100% cache hits
- Verifies 0 tasks built on builds 2-5
- Validates consistent task counts across all builds
- Ensures cache remains valid over multiple iterations

#### ✅ Transition Between Cache Types
- Tests donefile hits when outputs exist
- Tests shared cache hits when outputs are deleted
- Tests mixed scenarios (some outputs deleted, some present)
- Verifies seamless transitions between cache strategies
- Confirms no rebuilds during cache type transitions

#### ✅ Multiple Task Types Hit Rates
- Tests build, test, and lint tasks together
- Verifies cache behavior across different task types
- Confirms subset task execution (e.g., only "build" tasks)
- Validates 100% hit rate for build tasks specifically

#### ✅ Cache Performance Metrics Tracking
- Tracks cache entry counts across builds
- Verifies no cache corruption after multiple builds
- Monitors time saved by caching (`timeSavedMs`)
- Validates cache statistics accuracy

## Running the Tests

### Run All Cache Validity Tests
```bash
cd tools-monorepo/packages/sail
pnpm vitest test/integration/scenarios/cache-validity.integration.test.ts
```

### Run Individual Test
```bash
pnpm vitest test/integration/scenarios/cache-validity.integration.test.ts -t "should execute all tasks and store cache entries"
```

### Run with Coverage
```bash
pnpm vitest test/integration/scenarios/cache-validity.integration.test.ts --coverage
```

## Test Results

All 14 test scenarios pass successfully:
- ✅ Scenario 1: First Build - Cache Population
- ✅ Scenario 2: Second Build - Full Cache Hit  
- ✅ Scenario 3: Partial Cache Invalidation
- ✅ Scenario 6: Cache Recovery from Corruption (2 tests)
- ✅ Scenario 7: Cache Under High Parallelism
- ✅ Cache Entry Validation
- ✅ Cache Statistics
- ✅ Multi-Build Correctness (6 tests)
  - 100% donefile hit rate on repeated builds
  - Shared cache usage after output deletion
  - Correctness across 5 consecutive builds
  - Transition between cache types
  - Multiple task types hit rates
  - Cache performance metrics tracking

**Total Duration**: ~54 seconds for all tests

## Key Findings

1. **Cache Structure**: Sail stores cache entries in `{cacheDir}/v1/entries/` subdirectory
2. **Manifest Format**: Cache manifests require `version` and `cacheKey` fields, plus `outputFiles` array
3. **Cache Tracking**: Cache hits are tracked via `leafUpToDateCount` (total), with separate tracking for:
   - **Donefile hits**: Local cache via donefile checks (outputs already exist)
   - **Shared cache hits**: Remote cache via shared cache restoration (outputs restored from cache)
4. **Corruption Handling**: Sail gracefully handles corrupted cache entries by rebuilding affected tasks
5. **Cache Types**: Two distinct caching mechanisms work together:
   - **Donefiles**: Fast local checks that skip tasks when outputs haven't changed
   - **Shared Cache**: Stores and restores actual output files across builds/machines
6. **Hit Rate Expectations**:
   - Repeated builds without changes: 100% hit rate via donefiles
   - Builds after output deletion: High shared cache hit rate (30%+ depending on task types)
   - Builds after source changes: Selective rebuilds with partial cache hits

## Future Enhancements

Additional scenarios from the test plan that could be implemented:

- **Scenario 4**: Concurrent Builds (multiple processes sharing cache)
- **Scenario 5**: Cross-Process Cache Validity
- **Scenario 8**: LRU Cache Pruning Verification
- **Scenario 9**: Configuration Validation
- **Scenario 10**: Multi-Task Cache Restoration Order

## Files Created/Modified

### New Files
- `test/integration/fixtures/cache-validity/multi-level-multi-task/` - Complete test fixture
- `test/integration/support/cacheValidationHelpers.ts` - Cache validation utilities
- `test/integration/scenarios/cache-validity.integration.test.ts` - Test scenarios

### Modified Files
None - all changes are new additions

## Maintenance Notes

- Test fixture packages use minimal TypeScript to keep tests fast
- Each test uses isolated temporary directory to avoid interference
- Cache entries are automatically cleaned up after test completion
- Tests reuse build context to avoid redundant dependency installs
