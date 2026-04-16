# TypeScript Project References Cache Bug Fixture

This fixture reproduces the cache restoration bug where TypeScript test compilation tasks with project references fail to restore from cache.

## Bug Description

When building a package with TypeScript project references (test configs that reference the main tsconfig), the test compilation tasks are rebuilt instead of being restored from cache, even when their inputs and dependencies haven't changed.

## Structure

```
packages/lib-a/
├── package.json
├── tsconfig.json           # Main compilation (references by test configs)
└── src/
    ├── index.ts           # Main source code
    └── test/
        ├── index.test.ts  # Test files
        ├── tsconfig.json  # ESM test config (references ../..)
        ├── tsconfig.cjs.json  # CJS test config (references ../..)
        └── tsconfig.no-exactOptionalPropertyTypes.json  # Alternative test config (references ../..)
```

## Reproduction Steps

1. **Initial Build**:
   ```bash
   cd tools-monorepo/packages/sail/test/integration/fixtures/cache-validity/typescript-project-references
   pnpm install
   sail build lib-a --all
   ```
   Expected: 4 tasks run (1 main build + 3 test builds)

2. **Clean Outputs**:
   ```bash
   cd packages/lib-a
   rm -rf dist/ *.tsbuildinfo src/test/*.tsbuildinfo
   ```

3. **Rebuild**:
   ```bash
   cd ../..
   sail build lib-a --all
   ```
   
   **Expected**: All 4 tasks restore from cache (100% hit rate)
   **Actual**: Main build restores, but test builds rebuild (cache miss)

## Expected Behavior

All test compilation tasks should restore from cache because:
- Input files haven't changed (src/test/**/*.ts, tsconfig files)
- Dependencies haven't changed (main build task)
- Only outputs were removed

## Actual Behavior

The three test compilation tasks fail to restore from cache:
- `build:test:esm`
- `build:test:cjs`
- `build:test:no-exact`

## Key Characteristics

This fixture mirrors the real-world bug found in FluidFramework's `@fluidframework/core-interfaces` package:

1. **Multiple test configs**: All reference the main tsconfig via project references
2. **Identical inputs**: All test tasks use the same source files
3. **Different outputs**: Each test task outputs to a different directory
4. **Dependency on main build**: All test tasks depend on the main `build` task

## Investigation Points

The bug likely involves:
1. Cache key computation for tasks with TypeScript project references
2. How dependency hashes are computed from tsbuildinfo files
3. Potential differences in file timestamps or tsbuildinfo content after cache restoration
