# CLI-API Capabilities Implementation Handoff

**Date**: 2025-11-12
**Status**: Phase 1 Complete - Core Infrastructure Implemented
**Branch**: cli-composition-model

## Summary

Successfully implemented the core capability system infrastructure for the CLI-API package as defined in `cli-api-capabilities-design.md`. The implementation includes:

✅ Core capability infrastructure (Capability interface and CapabilityHolder)
✅ ConfigCapability with useConfig helper
✅ GitCapability with useGit helper
✅ Full TypeScript compilation and type checking
✅ All existing tests passing
✅ Package exports configured for both main module and capabilities submodule

## Files Created

### Core Infrastructure
- `packages/cli-api/src/capabilities/capability.ts` - Core types and CapabilityHolder class
- `packages/cli-api/src/capabilities/index.ts` - Public exports for capabilities module

### Capabilities
- `packages/cli-api/src/capabilities/config.ts` - ConfigCapability implementation
- `packages/cli-api/src/capabilities/git.ts` - GitCapability implementation

### Modified Files
- `packages/cli-api/src/index.ts` - Added export for capabilities
- `packages/cli-api/package.json` - Added "./capabilities" export path

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
✅ **Tests**: All 58 existing tests passing
✅ **Types**: No TypeScript errors
✅ **Exports**: Package exports configured correctly

```bash
# Build command used:
pnpm nx run cli-api:build:compile

# Test command used:
pnpm nx run cli-api:test
```

## Next Steps (Phase 2)

Based on the design document, the following tasks remain:

### 1. Create Example Migration
- [ ] Pick a simple command using GitCommand (e.g., from packages/cli)
- [ ] Migrate to use useGit capability
- [ ] Document the migration process
- [ ] Verify all functionality works identically

### 2. Migrate Additional Commands
Priority order from design doc:
- [ ] Simple git-only commands (no config)
- [ ] Commands with both git and config
- [ ] Commands with custom capabilities
- [ ] Test commands

### 3. Add Deprecation Warnings (Phase 3)
- [ ] Add @deprecated JSDoc to `CommandWithConfig`
- [ ] Add @deprecated JSDoc to `GitCommand`
- [ ] Add migration guide link to deprecation messages
- [ ] Update CHANGELOG.md with deprecation notice

### 4. Documentation
- [ ] Add usage examples to package README
- [ ] Create migration guide document
- [ ] Update API documentation
- [ ] Add examples to existing commands

### 5. Testing
- [ ] Add unit tests for ConfigCapability
- [ ] Add unit tests for GitCapability
- [ ] Add unit tests for CapabilityHolder
- [ ] Add integration tests for migrated commands
- [ ] Test error scenarios (missing config, not in git repo)

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
