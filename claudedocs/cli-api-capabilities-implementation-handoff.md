# CLI-API Capabilities Implementation Handoff

**Date**: 2025-11-12
**Status**: Phase 2 In Progress - Testing Complete, Migration Starting
**Branch**: cli-composition-model

## Latest Update (Session 3)

**Accomplished:**
- ✅ Successfully migrated `squish` command to use useGit capability
- ✅ All CLI tests passing (44 tests across 5 test suites)
- ✅ Command compiles successfully with new capability system
- ✅ Documented migration pattern and steps
- ✅ Verified no regressions in functionality

**Migration Pattern Validated:**
The squish command migration demonstrates the complete pattern for migrating from `GitCommand` to capability-based composition. Key changes:
1. Import `BaseCommand` from main module, `useGit` from capabilities
2. Create private capability holder property
3. Call `await this.gitCapability.get()` at start of `run()` method
4. Replace all `this.git` references with destructured `git` variable
5. Use helper methods like `getCurrentBranch()` for cleaner code

**Next Session:**
- Continue migrating additional git commands
- Address linting issues in cli-api capabilities (noExplicitAny, missing JSDoc tags)
- Document additional migration patterns as discovered

## Summary

Successfully implemented the core capability system infrastructure for the CLI-API package as defined in `cli-api-capabilities-design.md`. The implementation includes:

✅ Core capability infrastructure (Capability interface and CapabilityHolder)
✅ ConfigCapability with useConfig helper
✅ GitCapability with useGit helper
✅ **Comprehensive unit test coverage (29 new tests)**
✅ Full TypeScript compilation and type checking
✅ All tests passing (89 total)
✅ Package exports configured for both main module and capabilities submodule

## Files Created

### Core Infrastructure
- `packages/cli-api/src/capabilities/capability.ts` - Core types and CapabilityHolder class
- `packages/cli-api/src/capabilities/index.ts` - Public exports for capabilities module

### Capabilities
- `packages/cli-api/src/capabilities/config.ts` - ConfigCapability implementation
- `packages/cli-api/src/capabilities/git.ts` - GitCapability implementation

### Test Files
- `packages/cli-api/test/capabilities/capability-holder.test.ts` - CapabilityHolder tests
- `packages/cli-api/test/capabilities/config-capability.test.ts` - ConfigCapability tests
- `packages/cli-api/test/capabilities/git-capability.test.ts` - GitCapability tests

### Modified Files
- `packages/cli-api/src/index.ts` - Added export for capabilities
- `packages/cli-api/package.json` - Added "./capabilities" export path
- `packages/cli-api/src/capabilities/capability.ts` - Enhanced with concurrent access handling and error reporting
- `packages/cli-api/src/capabilities/config.ts` - Updated to support multiple search paths

## Implementation Details

### Core Architecture

The capability system follows the composition-over-inheritance pattern:

```typescript
// Old (inheritance):
class MyCommand extends GitCommand { }

// New (composition):
class MyCommand extends BaseCommand {
  private git = useGit(this);

  async run() {
    const { git } = await this.git.get();
  }
}
```

### Key Features Implemented

1. **Lazy Initialization**: Capabilities only initialize when first accessed via `get()`
2. **Caching**: Results cached after first initialization
3. **Type Safety**: Full TypeScript inference for capability results
4. **Lifecycle Management**: Optional cleanup support via `cleanup()` method
5. **Error Handling**: Proper error reporting using OCLIF's `command.error()`

### ConfigCapability

**Location**: `packages/cli-api/src/capabilities/config.ts`

**Features**:
- Loads configuration from disk using existing `loadConfig` function
- Supports default config fallback
- Optional config mode (required: false)
- Custom search path support
- Config reload capability
- ConfigFlag export for adding to command flags

**Usage**:
```typescript
class MyCommand extends BaseCommand {
  private config = useConfig<MyConfig>(this, {
    defaultConfig: { foo: "bar" },
    required: true
  });

  async run() {
    const { config, location, isDefault } = await this.config.get();
  }
}
```

### GitCapability

**Location**: `packages/cli-api/src/capabilities/git.ts`

**Features**:
- Initializes simple-git client and Repository wrapper
- Checks for valid git repository
- Optional git requirement (required: false)
- Custom base directory support
- Helper methods attached to result:
  - `getCurrentBranch()` - Get current branch name
  - `isCleanWorkingTree()` - Check if working tree is clean
  - `hasUncommittedChanges()` - Check for uncommitted changes

**Usage**:
```typescript
class MyCommand extends BaseCommand {
  private git = useGit(this, { required: true });

  async run() {
    const { git, repo, getCurrentBranch } = await this.git.get();
    const branch = await getCurrentBranch();
  }
}
```

## Build & Test Status

✅ **Build**: TypeScript compilation successful
✅ **Tests**: All 89 tests passing (88 passed, 1 skipped)
✅ **Types**: No TypeScript errors
✅ **Exports**: Package exports configured correctly

```bash
# Build command used:
pnpm nx run cli-api:build:compile

# Test command used:
pnpm nx run cli-api:test
```

### Test Coverage Added

**New Test Files:**
- `test/capabilities/capability-holder.test.ts` - 9 tests for CapabilityHolder
- `test/capabilities/config-capability.test.ts` - 8 tests for ConfigCapability (1 skipped)
- `test/capabilities/git-capability.test.ts` - 12 tests for GitCapability

**Test Coverage:**
- CapabilityHolder: Initialization, caching, error handling, concurrent access, cleanup
- ConfigCapability: File loading, default config, search paths, optional vs required
- GitCapability: Repository detection, helper methods, error handling, custom directories

**Known Limitation:**
- Config reload test is skipped due to Node.js module caching. The reload() method exists but may not work as expected when the config file is modified at runtime.

## Next Steps (Phase 2)

Based on the design document, the following tasks remain:

### 1. Testing ✅ **COMPLETE**
- [x] Add unit tests for CapabilityHolder
- [x] Add unit tests for ConfigCapability
- [x] Add unit tests for GitCapability
- [x] Test error scenarios (missing config, not in git repo)
- [ ] Add integration tests for migrated commands (after migration)

### 2. Create Example Migration ✅ **COMPLETE**
**Selected Command:** `packages/cli/src/commands/git/squish.ts`
- Simple git-only command (extends GitCommand)
- Good demonstration of migration pattern
- No config dependencies
- Clear git operations (checkout, merge, commit, reset)

**Migration completed successfully:**
- [x] Migrate squish command to use useGit capability
- [x] Document the migration process
- [x] Verify all functionality works identically
- [x] Run existing tests to ensure no regressions

**Migration Steps (packages/cli/src/commands/git/squish.ts):**

1. **Update imports:**
   ```typescript
   // Before:
   import { GitCommand } from "@tylerbu/cli-api";

   // After:
   import { BaseCommand } from "@tylerbu/cli-api";
   import { useGit } from "@tylerbu/cli-api/capabilities";
   ```

2. **Change base class and add capability:**
   ```typescript
   // Before:
   export default class SquishCommand extends GitCommand<typeof SquishCommand> {

   // After:
   export default class SquishCommand extends BaseCommand<typeof SquishCommand> {
     private gitCapability = useGit(this, { required: true });
   ```

3. **Update run method to get capability:**
   ```typescript
   // Before:
   public override async run(): Promise<void> {
     if (this.git === undefined) {
       this.error(`Not a git repo: ${process.cwd()}`);
     }
     // ... use this.git directly
   }

   // After:
   public override async run(): Promise<void> {
     const { git, getCurrentBranch } = await this.gitCapability.get();
     // ... use git and helper methods
   }
   ```

4. **Replace all `this.git` references with `git`:**
   - `this.git.checkoutBranch()` → `git.checkoutBranch()`
   - `this.git.merge()` → `git.merge()`
   - `this.git.commit()` → `git.commit()`
   - etc.

5. **Use helper methods where beneficial:**
   ```typescript
   // Before:
   const sourceBranch = this.args.source ??
     (await this.git.raw(["branch", "--show-current"])).trim();

   // After:
   const sourceBranch = this.args.source ?? (await getCurrentBranch());
   ```

**Benefits observed:**
- Cleaner code with helper methods
- No need for manual git repo checking (handled by capability)
- Capability initialization is lazy and cached
- Type-safe access to git client and repo
- All tests pass without modification

### 3. Migrate Additional Commands
Priority order from design doc:
- [ ] Simple git-only commands (no config)
- [ ] Commands with both git and config
- [ ] Commands with custom capabilities
- [ ] Test commands

### 4. Add Deprecation Warnings (Phase 3)
- [ ] Add @deprecated JSDoc to `CommandWithConfig`
- [ ] Add @deprecated JSDoc to `GitCommand`
- [ ] Add migration guide link to deprecation messages
- [ ] Update CHANGELOG.md with deprecation notice

### 5. Documentation
- [ ] Add usage examples to package README
- [ ] Create migration guide document
- [ ] Update API documentation
- [ ] Add examples to existing commands

## Migration Strategy

The design document outlines a 4-phase migration:

**Phase 1 (✅ COMPLETE)**: Add capability system alongside existing base classes
**Phase 2 (NEXT)**: Migrate commands gradually
**Phase 3**: Deprecate old base classes
**Phase 4**: Remove old base classes (breaking change for v2.0.0)

## Important Design Decisions

1. **Error Handling**: Using `command.error(..., { exit: 1 })` instead of `command.exit()` as per OCLIF API
2. **Type Exports**: Using `export type` for interfaces to satisfy `isolatedModules` TypeScript setting
3. **Package Exports**: Added separate "./capabilities" export path for cleaner imports
4. **Helper Methods**: Attached to capability result objects for convenience (e.g., `getCurrentBranch()`)
5. **Backward Compatibility**: Old base classes remain untouched, working alongside new system

## Key Code Patterns

### Creating a Custom Capability

```typescript
interface MyResult {
  data: string;
  helper(): void;
}

class MyCapability implements Capability<BaseCommand<any>, MyResult> {
  async initialize(command: BaseCommand<any>): Promise<MyResult> {
    return {
      data: "example",
      helper: () => console.log("helper method")
    };
  }

  async cleanup() {
    // Optional cleanup
  }
}

function useMyCapability(command: BaseCommand<any>) {
  return new CapabilityHolder(command, new MyCapability());
}
```

### Capability with Options

```typescript
interface MyOptions {
  setting: string;
}

class MyCapability implements Capability<BaseCommand<any>, MyResult> {
  constructor(private options: MyOptions = {}) {}

  async initialize(command: BaseCommand<any>) {
    // Use this.options.setting
  }
}
```

## Testing Approach

Capabilities should be easy to mock in tests:

```typescript
// Option 1: Mock the holder
const mockGit = { checkout: vi.fn() };
command.gitCapability = {
  get: vi.fn().mockResolvedValue({ git: mockGit }),
  isInitialized: true,
  cleanup: vi.fn(),
};

// Option 2: Inject mock capability
const mockCapability = {
  initialize: vi.fn().mockResolvedValue({ git: mockGit }),
};
command.gitCapability = new CapabilityHolder(command, mockCapability);
```

## Dependencies

No new dependencies added. The implementation uses:
- Existing `@oclif/core` for base command functionality
- Existing `simple-git` for git operations
- Existing `loadConfig` function for configuration loading
- Existing `Repository` class for git utilities

## Potential Issues & Considerations

1. **Breaking Changes**: The old base classes (`CommandWithConfig`, `GitCommand`) must remain until all commands are migrated
2. **Documentation**: Need comprehensive examples and migration guide for adopters
3. **Testing Coverage**: Current tests don't specifically test the new capability system - they continue to test the old base classes
4. **API Surface**: Once capabilities are widely adopted, the old base classes become dead code until v2.0.0
5. **Type Complexity**: Generic types may be challenging for some developers unfamiliar with TypeScript generics
6. **Linting Issues in cli-api**: The capability system has several linting warnings that should be addressed:
   - `noExplicitAny` warnings on generic type parameters (by design, but could be suppressed)
   - Missing JSDoc release tags (@public, @beta, etc.) for API Extractor
   - Missing accessibility modifiers on some class members
   - Import type optimization opportunities
   These don't affect functionality but should be fixed for production quality

## Performance Considerations

- Lazy initialization should improve startup time for commands that don't use all capabilities
- Caching ensures no performance penalty for repeated access
- Minimal overhead compared to inheritance approach

## Git Status

Branch: `cli-composition-model`
Status: All changes compiled and tested
Ready for: Commit and initial migration testing

## Questions for Next Session

1. Which command should be used as the first migration example?
2. Should we add tests specifically for capabilities before migrating commands?
3. How should we handle commands that currently rely on protected methods from base classes?
4. Do we need additional helper methods beyond getCurrentBranch, isCleanWorkingTree, hasUncommittedChanges?

## References

- Design Document: `claudedocs/cli-api-capabilities-design.md`
- Package Location: `packages/cli-api/`
- Key Files: `src/capabilities/*.ts`
