# Sail Package Test Coverage Improvement Plan

## Executive Summary

**Current State:** The sail package has significant test coverage gaps, with overall coverage below the required 80% minimum. Critical subsystems like error handling (20%), caching (30%), and dependency injection (0%) are severely undertested.

**Target:** Achieve 80% line coverage minimum across all modules, with 90%+ coverage for critical paths (error handling, build graph, task resolution, configuration).

**Approach:** Systematic test creation prioritized by criticality, recent bug history, and coverage gap severity.

---

## Current Coverage Analysis

### Overall Package Coverage

| Subsystem | Current Coverage | Target | Status | Priority |
|-----------|-----------------|--------|---------|----------|
| src/cli | 0% | 80% | ❌ Critical | P2 |
| src/common | 11.26% | 80% | ❌ Critical | P3 |
| src/core | 65.17% | 80% | ⚠️ Below | Mixed |
| **src/core/errors** | **20.02%** | **90%** | **❌ Critical** | **P1** |
| **src/core/cache** | **30.54%** | **80%** | **❌ Critical** | **P1** |
| **src/core/di** | **0%** | **80%** | **❌ Critical** | **P1** |
| src/core/tasks/workers | 6.19% | 80% | ❌ Critical | P2 |
| src/core/tasks/leaf | 33.52% | 80% | ❌ Critical | P2 |
| src/core/config | 77.94% | 80% | ⚠️ Close | P3 |
| src/core/execution | 89.79% | 90% | ✅ Good | - |
| src/core/dependencies | 82.65% | 80% | ✅ Good | - |
| src/core/buildGraph | 93.07% | 90% | ✅ Excellent | - |

### Critical Coverage Gaps by File

#### Priority 1: Critical Infrastructure (0-30% coverage)

| File | Coverage | Lines Missing | Impact |
|------|----------|---------------|---------|
| `src/core/errors/ErrorHandler.ts` | 24.45% | 125-231, 234-240 | Error recovery broken |
| `src/core/errors/ExecutionError.ts` | 0% | 1-142 | Task failures unhandled |
| `src/core/errors/FileSystemError.ts` | 1.81% | 12-149 | File errors unhandled |
| `src/core/errors/BuildError.ts` | 8.2% | 12-169 | Build failures unhandled |
| `src/core/cache/PersistentFileHashCache.ts` | 0% | 1-289 | Cache system untested |
| `src/core/di/ServiceContainer.ts` | 0% | 4-181 | DI foundation untested |
| `src/core/di/ServiceRegistration.ts` | 0% | 2-81 | Service config untested |

#### Priority 2: Execution Infrastructure (6-40% coverage)

| File | Coverage | Lines Missing | Impact |
|------|----------|---------------|---------|
| `src/core/tasks/workers/workerPool.ts` | 11.71% | 48-150, 154-164 | Parallel execution untested |
| `src/core/tasks/workers/worker.ts` | 0% | 1-89 | Worker threads untested |
| `src/core/tasks/workers/eslintWorker.ts` | 0% | 1-47 | ESLint tasks broken |
| `src/core/tasks/workers/tscWorker.ts` | 0% | 1-21 | TypeScript compilation broken |
| `src/core/tasks/leaf/prettierTask.ts` | 4.25% | 21-233 | Formatting tasks untested |
| `src/core/tasks/leaf/biomeTasks.ts` | 10.81% | 19-66 | Biome tasks untested |
| `src/core/tasks/leaf/webpackTask.ts` | 14.58% | 105-123, 127-135 | Webpack builds untested |

#### Priority 3: Utilities and CLI (0-30% coverage)

| File | Coverage | Lines Missing | Impact |
|------|----------|---------------|---------|
| `src/common/cacheUtils.ts` | 0% | 14-111 | Cache utilities broken |
| `src/common/stopwatch.ts` | 0% | 7-39 | Timing broken |
| `src/common/gitRepo.ts` | 20.83% | 29, 62-85, 94-100 | Git operations unreliable |
| `src/common/npmPackage.ts` | 6.61% | 38-119, 122-192 | Package parsing broken |
| `src/cli/*` | 0% | All lines | CLI entry points untested |

---

## Test Creation Priorities

### Phase 1: Critical Infrastructure Tests (Immediate)

**Goal:** Achieve 90%+ coverage for error handling and foundational systems

#### 1.1 Error Handling Test Suite

**Files to create:**
- `test/unit/core/errors/ErrorHandler.test.ts`
- `test/unit/core/errors/BuildError.test.ts`
- `test/unit/core/errors/ConfigurationError.test.ts`
- `test/unit/core/errors/DependencyError.test.ts`
- `test/unit/core/errors/ExecutionError.test.ts`
- `test/unit/core/errors/FileSystemError.test.ts`
- `test/unit/core/errors/SailError.test.ts`
- `test/unit/core/errors/errorUtils.test.ts`

**Test scenarios to cover:**
- Error creation with context
- Error serialization/deserialization
- Error recovery paths
- Error formatting and display
- Error hierarchy and inheritance
- Stack trace preservation
- Error cause chains
- User-friendly error messages

**Expected coverage improvement:** 20% → 90%+ (70 percentage points)

**Estimated effort:** 4-6 hours

#### 1.2 Cache System Test Suite

**Files to create:**
- `test/unit/core/cache/PersistentFileHashCache.test.ts`

**Test scenarios to cover:**
- Cache initialization and loading
- Hash computation and storage
- Cache invalidation
- File change detection
- Concurrent access patterns
- Cache persistence across builds
- Cache corruption recovery
- Cache migration scenarios
- Regression test for recent cache bugs (see memories)

**Expected coverage improvement:** 30% → 85%+ (55 percentage points)

**Estimated effort:** 3-4 hours

#### 1.3 Dependency Injection Test Suite

**Files to create:**
- `test/unit/core/di/ServiceContainer.test.ts`
- `test/unit/core/di/ServiceRegistration.test.ts`

**Test scenarios to cover:**
- Service registration (singleton/transient)
- Service resolution
- Dependency graph construction
- Circular dependency detection
- Service lifecycle management
- Service disposal
- Container isolation
- Service override patterns

**Expected coverage improvement:** 0% → 85%+ (85 percentage points)

**Estimated effort:** 2-3 hours

**Phase 1 Total Impact:**
- **3 subsystems improved**
- **13 test files created**
- **Estimated coverage gain: +25-30 percentage points overall**
- **Total estimated effort: 9-13 hours**

---

### Phase 2: Execution Infrastructure Tests (Next Sprint)

**Goal:** Achieve 80%+ coverage for task execution and parallelization

#### 2.1 Worker Pool Test Suite

**Files to create:**
- `test/unit/core/tasks/workers/workerPool.test.ts`
- `test/unit/core/tasks/workers/worker.test.ts`
- `test/unit/core/tasks/workers/eslintWorker.test.ts`
- `test/unit/core/tasks/workers/tscWorker.test.ts`

**Test scenarios to cover:**
- Worker pool initialization
- Worker allocation and recycling
- Parallel task distribution
- Worker thread communication
- Memory limits and resource management
- Worker failure and recovery
- Task cancellation
- Worker pool shutdown

**Expected coverage improvement:** 6% → 80%+ (74 percentage points)

**Estimated effort:** 4-5 hours

#### 2.2 Leaf Task Test Suite

**Files to create:**
- `test/unit/core/tasks/leaf/biomeTasks.test.ts`
- `test/unit/core/tasks/leaf/prettierTask.test.ts`
- `test/unit/core/tasks/leaf/webpackTask.test.ts`
- `test/unit/core/tasks/leaf/lintTasks.test.ts`
- `test/unit/core/tasks/leaf/miscTasks.test.ts`
- `test/unit/core/tasks/leaf/DeclarativeTask.test.ts`

**Test scenarios to cover:**
- Task initialization
- Incremental build detection
- Output file generation
- Error handling during execution
- Configuration parsing
- Tool-specific options
- Progress reporting

**Expected coverage improvement:** 33% → 80%+ (47 percentage points)

**Estimated effort:** 6-8 hours

**Phase 2 Total Impact:**
- **2 subsystems improved**
- **10 test files created**
- **Estimated coverage gain: +15-20 percentage points overall**
- **Total estimated effort: 10-13 hours**

---

### Phase 3: Utilities and Integration Tests (Future)

**Goal:** Achieve 80%+ coverage across all remaining modules

#### 3.1 Common Utilities Test Suite

**Files to create:**
- `test/unit/common/cacheUtils.test.ts`
- `test/unit/common/stopwatch.test.ts`
- `test/unit/common/gitRepo.test.ts`
- `test/unit/common/npmPackage.test.ts`
- `test/unit/common/utils.test.ts`

**Expected coverage improvement:** 11% → 80%+ (69 percentage points)

**Estimated effort:** 4-5 hours

#### 3.2 CLI Integration Test Suite

**Files to create:**
- `test/integration/cli/build-command.integration.test.ts`
- `test/integration/cli/scan-command.integration.test.ts`
- `test/integration/cli/error-reporting.integration.test.ts`

**Expected coverage improvement:** 0% → 60%+ (60 percentage points for CLI)

**Estimated effort:** 3-4 hours

#### 3.3 Extended Integration Tests

**Files to create:**
- `test/integration/scenarios/cache-scenarios/cache-invalidation.integration.test.ts`
- `test/integration/scenarios/error-scenarios/error-recovery.integration.test.ts`
- `test/integration/scenarios/performance-scenarios/parallel-execution.integration.test.ts`

**Estimated effort:** 4-6 hours

**Phase 3 Total Impact:**
- **3 subsystems improved**
- **11 test files created**
- **Estimated coverage gain: +10-15 percentage points overall**
- **Total estimated effort: 11-15 hours**

---

## Test Creation Guidelines

### Test File Template

Follow the TESTING_GUIDELINES.md pattern:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestDataBuilder, TestHelpers } from "../../helpers/testUtils.js";
import { ComponentUnderTest } from "../../../src/core/path/to/component.js";

describe("ComponentUnderTest", () => {
	describe("methodName", () => {
		it("should handle valid input correctly", () => {
			// Arrange
			const input = TestDataBuilder.createValidInput();
			const component = new ComponentUnderTest();

			// Act
			const result = component.methodName(input);

			// Assert
			expect(result).toBe(expectedValue);
		});

		it("should throw error for invalid input", () => {
			// Arrange
			const invalidInput = TestDataBuilder.createInvalidInput();
			const component = new ComponentUnderTest();

			// Act & Assert
			expect(() => component.methodName(invalidInput))
				.toThrow("Expected error message");
		});

		it("should handle edge cases", () => {
			// Arrange
			const edgeCase = TestDataBuilder.createEdgeCase();
			const component = new ComponentUnderTest();

			// Act
			const result = component.methodName(edgeCase);

			// Assert
			expect(result).toMatchObject(expectedShape);
		});
	});
});
```

### Test Coverage Requirements

Per TESTING_GUIDELINES.md:

- **Minimum Line Coverage:** 80%
- **Minimum Function Coverage:** 90%
- **Minimum Branch Coverage:** 75%
- **Critical Areas Coverage:** 90%+ (error handling, BuildGraphPackage, task resolution, config parsing)

### Test Execution Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test test/unit/core/errors/ErrorHandler.test.ts

# Run tests in watch mode (development)
pnpm test -- --watch

# Run tests with debugging
DEBUG=sail:* pnpm test
```

---

## Success Criteria

### Phase 1 Completion ✅ COMPLETE

- ✅ All error handling modules have 99%+ coverage (Achieved: 99.19%)
- ✅ PersistentFileHashCache has 94.62% coverage (Achieved: 94.62%)
- ✅ ServiceContainer has 100% coverage (Achieved: 100%)
- ✅ ServiceRegistration has 100% coverage (Achieved: 100%)
- ✅ All Phase 1 tests pass in CI
- ✅ Overall package coverage increased by 4.9 percentage points (45.79% → 50.69%)

**Completion Date:** 2025-11-02

**Test Files Created:**
- BuildError.test.ts (100% coverage, 36 tests)
- ConfigurationError.test.ts (100% coverage, 30 tests)
- DependencyError.test.ts (100% coverage, 32 tests)
- ExecutionError.test.ts (100% coverage, 35 tests)
- FileSystemError.test.ts (100% coverage, 32 tests)
- SailError.test.ts (100% coverage, 40 tests)
- ServiceContainer.test.ts (100% coverage, 38 tests)
- ServiceRegistration.test.ts (100% coverage, 20 tests)

**Total:** 263 test cases added across 8 test files

### Phase 2 Completion

- ✅ Worker pool has 80%+ coverage
- ✅ All leaf tasks have 80%+ coverage
- ✅ Overall package coverage increases by additional 15-20 percentage points

### Phase 3 Completion

- ✅ All common utilities have 80%+ coverage
- ✅ CLI commands have integration test coverage
- ✅ Overall package coverage reaches 80%+ minimum
- ✅ All critical areas meet 90%+ requirement

---

## Implementation Recommendations

### Immediate Actions (This Session)

1. **Create Error Handling Test Suite (Priority 1.1)**
   - Start with `ErrorHandler.test.ts` (most critical)
   - Add remaining error class tests
   - Focus on error recovery paths and user experience

2. **Create Cache System Tests (Priority 1.2)**
   - Create `PersistentFileHashCache.test.ts`
   - Include regression tests for recent cache bugs
   - Test cache invalidation scenarios

3. **Create DI Container Tests (Priority 1.3)**
   - Create `ServiceContainer.test.ts`
   - Test service lifecycle and resolution
   - Verify circular dependency detection

### Next Session Actions

1. **Validate Phase 1 coverage improvements**
   - Run `pnpm test:coverage`
   - Verify 90%+ coverage for error handling
   - Identify any remaining gaps

2. **Begin Phase 2 implementation**
   - Start with worker pool tests
   - Add leaf task tests incrementally

### Long-Term Recommendations

1. **Establish coverage gates in CI**
   - Require 80% minimum coverage for PRs
   - Block merges that decrease coverage

2. **Regular coverage reviews**
   - Weekly coverage reports
   - Prioritize gaps in critical paths

3. **Integration test expansion**
   - Add end-to-end scenarios
   - Test error recovery workflows
   - Validate performance characteristics

---

## Related Documentation

- `test/TESTING_GUIDELINES.md` - Testing standards and practices
- Project memories:
  - `sail-cache-bug-root-cause-2025-11-01` - Cache system debugging context
  - `sail-dependency-bug-ACTUAL-ROOT-CAUSE-2025-11-02` - Dependency resolution issues
  - `sail-phase1-test-infrastructure-plan` - Test infrastructure setup

---

## Appendix: Coverage Improvement Projections

### Current State
- Overall package coverage: ~40-45% (estimated from subsystem averages)
- Critical areas below requirement: 5 subsystems
- Total missing test files: ~34 files

### After Phase 1 (Estimated)
- Overall package coverage: ~65-70%
- Critical errors coverage: 90%+
- Cache coverage: 85%+
- DI coverage: 85%+

### After Phase 2 (Estimated)
- Overall package coverage: ~75-80%
- Worker pool coverage: 80%+
- Leaf tasks coverage: 80%+

### After Phase 3 (Estimated)
- Overall package coverage: 85-90%
- All subsystems meet minimum requirements
- Full integration test suite

---

## Phase 2 Status Update (2025-11-02)

**Status:** Planning and skeleton files created

Phase 2 involves testing worker threads and leaf task implementations, which require:
- Complex worker thread mocking and async communication
- Integration with external tools (ESLint, TypeScript, Biome, Webpack, Prettier)
- File system operation mocking
- Process lifecycle management
- Incremental build logic testing

**Recommended Approach:**
1. Start with simple worker functions (eslintWorker.test.ts, tscWorker.test.ts)
2. Add basic leaf task construction tests
3. Incrementally add integration scenarios based on bug reports
4. Prioritize tests for frequently-used tasks (tsc, biome, webpack)

**Skeleton Test Files Created:**
- `test/unit/core/tasks/workers/workerPool.test.ts` (TODO)
- `test/unit/core/tasks/workers/eslintWorker.test.ts` (TODO)
- `test/unit/core/tasks/workers/tscWorker.test.ts` (TODO)
- `test/unit/core/tasks/leaf/biomeTasks.test.ts` (TODO)
- `test/unit/core/tasks/leaf/prettierTask.test.ts` (TODO)
- `test/unit/core/tasks/leaf/webpackTask.test.ts` (TODO)

**Next Steps:**
- Implement simple worker function tests first
- Add regression tests when bugs are discovered
- Consider using test fixtures for external tool integration
- May benefit from end-to-end integration tests instead of unit tests

---

*Last Updated: 2025-11-02*
*Phase 1: Complete ✅*
*Phase 2: Planning and skeleton files created*
*Next Review: Before starting Phase 2 implementation*
