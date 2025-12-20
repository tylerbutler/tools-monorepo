---
"@tylerbu/cli-api": minor
---

feat(cli-api): introduce composition-based capability system

Implement new capability system to move from inheritance-based to composition-based architecture for OCLIF commands. This allows commands to compose functionality instead of relying on rigid inheritance hierarchies.

**Core Infrastructure:**
- `Capability` interface for defining composable command functionality
- `CapabilityWrapper` class for lazy initialization and caching
- Type-safe capability composition with full TypeScript inference
- Optional cleanup lifecycle method support

**Built-in Capabilities:**
- `ConfigCapability` via `useConfig()` - Configuration loading with default fallback, optional mode, and reload support
- `GitCapability` via `useGit()` - Git repository integration with helper methods (getCurrentBranch, isCleanWorkingTree, hasUncommittedChanges)

**API Design:**
- All capability APIs marked as `@beta` to signal evolving surface
- Context-based return types (`ConfigContext`, `GitContext`) for clarity
- Helper functions (`useConfig`, `useGit`) for ergonomic capability creation
- Maintains full backward compatibility with existing base classes (GitCommand, CommandWithConfig)

**Benefits:**
- Mix and match capabilities freely (e.g., git without config)
- Clear, explicit dependencies in command classes
- Easy to test with mockable capabilities
- Lazy initialization - only load what's used
- Extensible - add new capabilities without modifying base classes
