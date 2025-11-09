# Cache Validity Test Fixtures

This directory contains test fixtures for validating Sail's cache reliability and correctness.

## Multi-Level Multi-Task Monorepo

A comprehensive test fixture with 12 packages across 4 dependency levels, each with build, test, and lint tasks.

### Purpose

This fixture is designed to test cache behavior under realistic conditions:
- **High parallelism**: Multiple packages can build simultaneously at each level
- **Complex dependencies**: Diamond dependencies create cache contention
- **Multiple task types**: Tests cache behavior across different task types
- **Deep dependency chains**: Tests transitive cache invalidation

### Structure

```
packages/
├── Level 0: utils, types, config (3 packages)
├── Level 1: core, validation, parser, formatter (4 packages)
├── Level 2: cli, server, client (3 packages)
└── Level 3: app-web, app-desktop (2 packages)
```

Total: 12 packages × 3 tasks = 36 tasks

### Usage

The fixture is automatically copied to temporary directories during test execution. See `test/integration/scenarios/cache-validity.integration.test.ts` for usage examples.

### Maintenance

To regenerate the lockfile after dependency changes:

```bash
cd test/integration/fixtures/cache-validity/multi-level-multi-task
pnpm install --lockfile-only
```

## Test Scenarios

The fixture supports testing:
1. Cache population on first build
2. Full cache hits on repeated builds
3. Partial cache invalidation when files change
4. Cache corruption recovery
5. High concurrency cache operations
6. Cache statistics and tracking

See `CACHE_VALIDITY_TEST_PLAN.md` for detailed test scenarios.
