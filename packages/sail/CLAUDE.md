# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sail is a build orchestration CLI tool designed for monorepos, providing intelligent task execution with dependency resolution, incremental builds, and parallel processing. It's an OCLIF-based command-line tool that analyzes package dependencies and executes build tasks in optimal order.

**Key Technologies:**
- **CLI Framework**: OCLIF v4 (command-line interface framework)
- **Testing**: Vitest for unit tests
- **Build Tool**: TypeScript ~5.9.3 with strict mode
- **Formatting/Linting**: Biome (unified toolchain)
- **Dependency Injection**: Custom ServiceContainer implementation
- **Parallelization**: async library for priority queues and parallel execution

## Essential Commands

### Development Workflow

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build the package
pnpm build

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode (development)
pnpm test -- --watch

# Format code
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Development mode (uses TypeScript source directly)
./bin/dev.js build
./bin/dev.js scan

# Production mode (uses compiled JavaScript)
./bin/run.js build
./bin/run.js scan
```

### OCLIF-Specific Commands

```bash
# Generate command snapshots (for testing)
./bin/dev.js snapshot:generate

# Compare command snapshots
./bin/dev.js snapshot:compare

# Update README from command help text
pnpm nx run sail:build:readme

# Update OCLIF manifest
pnpm nx run sail:build:manifest
```

### Running Sail Commands

```bash
# Build all packages
./bin/dev.js build

# Build specific package (by name/regex)
./bin/dev.js build <partial_name>

# Build with specific tasks
./bin/dev.js build --task clean --task build

# Scan directory to see how Sail interprets it
./bin/dev.js scan
./bin/dev.js scan --infer  # Skip config loading

# Force rebuild (ignore cache)
./bin/dev.js build --force

# Parallel execution control
./bin/dev.js build --concurrency 8
./bin/dev.js build --worker  # Use worker threads
```

## Architecture Overview

### High-Level Architecture

Sail follows a **layered architecture** with clear separation of concerns:

```
Commands (OCLIF CLI)
    ↓
BuildGraph (orchestration)
    ↓
┌─────────────────┬──────────────────┬────────────────┐
│  TaskManager    │ DependencyResolver│ BuildExecutor  │
│  (task lifecycle)│ (graph building) │ (execution)    │
└─────────────────┴──────────────────┴────────────────┘
    ↓
Tasks (leaf/group)
    ↓
Workers (optional parallelization)
```

**Key Components:**

1. **BuildGraph** (src/core/buildGraph.ts)
   - Central orchestrator that coordinates the entire build process
   - Creates BuildGraphPackage nodes for each package in the dependency graph
   - Delegates specialized work to TaskManager, DependencyResolver, and BuildExecutor
   - Manages the overall build lifecycle: package initialization → task creation → execution

2. **BuildGraphPackage** (src/core/buildGraph.ts)
   - Represents a single package node in the build dependency graph
   - Holds package-specific task definitions and manages task lifecycle
   - Delegates task operations to TaskManager
   - Implements BuildablePackage interface for build execution

3. **TaskManager** (src/core/tasks/TaskManager.ts)
   - Manages task creation, initialization, and lifecycle for a package
   - Maintains task registry and handles task dependency resolution
   - Creates appropriate task types (leaf tasks, group tasks)
   - Handles "before" and "after" task relationships

4. **DependencyResolver** (src/core/dependencies/DependencyResolver.ts)
   - Resolves package-level dependencies within the monorepo
   - Builds the dependency graph and detects circular dependencies
   - Assigns levels to packages based on dependency depth
   - Filters packages based on workspace/release group configuration

5. **BuildExecutor** (src/core/execution/BuildExecutor.ts)
   - Executes the build process across all packages
   - Manages the priority queue for task execution
   - Handles build statistics, timing, and error reporting
   - Coordinates worker pool usage for parallel execution

### Task System

Sail supports two main task types:

**LeafTask** (src/core/tasks/leaf/leafTask.ts)
- Represents executable tasks (compile, lint, test, etc.)
- Specific implementations:
  - `TscTask`: TypeScript compilation with incremental support
  - `BiomeTask`: Biome formatting/linting
  - `ApiExtractorTask`: API documentation generation
  - `DeclarativeTask`: Generic tasks defined via configuration
  - `WebpackTask`, `PrettierTask`, etc.

**GroupTask** (src/core/tasks/groupTask.ts)
- Logical grouping of related tasks
- No execution logic, only orchestrates dependencies
- Used for meta-tasks like "build" or "test"

### Configuration System

Sail configuration is managed through:

1. **ISailConfig** (src/core/sailConfig.ts)
   - Top-level configuration schema
   - Defines tasks, declarative tasks, and multi-command executables
   - Loaded via cosmiconfig (supports `.sailrc`, `sail.config.js`, etc.)

2. **TaskDefinitions** (src/core/taskDefinitions.ts)
   - Defines task dependencies using `dependsOn`, `before`, `after`
   - Supports dependency expansion syntax:
     - `"<name>"`: another task in same package
     - `"^<name>"`: task in all dependent packages
     - `"*"`: all tasks (for before/after only)
     - `"<package>#<name>"`: specific package's task
   - Can be defined globally or per-package in package.json

3. **ConfigurationParser** (src/core/config/ConfigurationParser.ts)
   - Parses task definitions from configuration files
   - Validates configuration structure

4. **ConfigurationMerger** (src/core/config/ConfigurationMerger.ts)
   - Merges global and package-specific configurations
   - Handles configuration inheritance and overrides

### Dependency Injection

Sail uses a custom DI container for managing service lifetimes:

- **ServiceContainer** (src/core/di/ServiceContainer.ts)
- Supports singleton and transient lifetimes
- Service identifiers defined in `SERVICE_IDENTIFIERS`
- Enables testability and modularity

### Caching System

Multiple caching layers improve performance:

1. **PersistentFileHashCache** (src/core/cache/PersistentFileHashCache.ts)
   - Caches file hashes to detect changes
   - Persisted across builds for incremental build support

2. **TaskDefinitionCache** (src/core/cache/TaskDefinitionCache.ts)
   - Caches parsed task definitions
   - Avoids re-parsing configuration files

### Performance Optimization

1. **WorkerPool** (src/core/tasks/workers/workerPool.ts)
   - Reuses worker threads for expensive tasks (TypeScript compilation)
   - Configurable memory limits and thread count
   - Reduces overhead for repeated compilation tasks

2. **BuildProfiler** (src/core/performance/BuildProfiler.ts)
   - Tracks build performance metrics
   - Identifies bottlenecks in the build process

3. **ParallelProcessor** (src/core/optimization/ParallelProcessor.ts)
   - Optimizes parallel task execution
   - Manages task prioritization in the queue

## Project Structure

```
packages/sail/
├── src/
│   ├── commands/          # OCLIF command definitions
│   │   ├── build.ts       # Main build command
│   │   └── scan.ts        # Configuration scan command
│   ├── core/              # Core build engine
│   │   ├── analysis/      # Script and configuration analysis
│   │   ├── cache/         # Caching implementations
│   │   ├── config/        # Configuration parsing and merging
│   │   ├── dependencies/  # Dependency resolution
│   │   ├── di/            # Dependency injection container
│   │   ├── errors/        # Error types and handling
│   │   ├── execution/     # Build execution logic
│   │   ├── interfaces/    # Core interfaces and contracts
│   │   ├── optimization/  # Performance optimizations
│   │   ├── performance/   # Performance monitoring
│   │   ├── tasks/         # Task implementations
│   │   │   ├── leaf/      # Concrete task types (tsc, biome, etc.)
│   │   │   └── workers/   # Worker thread implementations
│   │   ├── buildContext.ts
│   │   ├── buildGraph.ts  # Core orchestration
│   │   ├── buildRepo.ts
│   │   ├── config.ts
│   │   ├── hash.ts
│   │   ├── options.ts
│   │   ├── runBuild.ts
│   │   ├── sailConfig.ts
│   │   └── taskDefinitions.ts
│   ├── common/            # Shared utilities
│   │   ├── biomeConfig.ts
│   │   ├── gitRepo.ts
│   │   ├── npmPackage.ts
│   │   ├── stopwatch.ts
│   │   └── utils.ts
│   ├── baseCommand.ts     # Shared OCLIF command base
│   ├── flags.ts           # Shared command flags
│   └── index.ts           # Public API exports
├── test/                  # Test files
│   ├── unit/              # Unit tests (organized by src/ structure)
│   ├── helpers/           # Test utilities and builders
│   ├── fixtures/          # Test data
│   └── TESTING_GUIDELINES.md
├── bin/
│   ├── dev.js             # Development entry point (TypeScript source)
│   └── run.js             # Production entry point (compiled JS)
├── esm/                   # Compiled TypeScript output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Development Guidelines

### Testing Strategy

From `test/TESTING_GUIDELINES.md`:

- **Framework**: Vitest for unit tests, Mocha for integration tests
- **Coverage Requirements**:
  - Minimum 80% line coverage
  - 90% function coverage
  - 75% branch coverage
  - Critical areas (BuildGraphPackage, task resolution, config parsing) require 90%+ coverage

**Test Structure:**
```typescript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should behave correctly when given valid input", () => {
      // Arrange
      const input = TestDataBuilder.createValidInput();

      // Act
      const result = component.methodName(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

**Running Tests:**
```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Coverage report
pnpm test:coverage

# Watch mode for development
pnpm test -- --watch

# Run specific test file
pnpm test test/unit/core/buildGraph.test.ts
```

### OCLIF CLI Development

Sail follows OCLIF conventions:

1. **Commands** are in `src/commands/` (compiled to `esm/commands/`)
2. **Binary entry points**:
   - `bin/dev.js`: Development mode (uses TypeScript via ts-node)
   - `bin/run.js`: Production mode (uses compiled JavaScript)
3. **Manifest**: Auto-generated in `oclif.manifest.json`
4. **README**: Auto-generated from command help text

**After modifying commands:**
```bash
# Update README
pnpm nx run sail:build:readme

# Update manifest
pnpm nx run sail:build:manifest

# Generate command snapshots for testing
./bin/dev.js snapshot:generate
```

### Configuration Files

Sail looks for configuration in these locations (via cosmiconfig):
- `.sailrc` (JSON or YAML)
- `.sailrc.json`
- `.sailrc.yaml` / `.sailrc.yml`
- `sail.config.js` / `sail.config.cjs` / `sail.config.mjs`
- `sail.config.ts`
- `sail` property in `package.json`

**Configuration Schema:**
```typescript
{
  version: 1,  // Config version (will be required in future)
  tasks: {
    // Task definitions
    build: {
      dependsOn: ["^build"],  // Depend on "build" in dependencies
      script: true
    }
  },
  declarativeTasks: {
    // For tools that don't have native incremental support
    "vite build": {
      inputGlobs: ["src/**/*.ts"],
      outputGlobs: ["dist/**/*"]
    }
  }
}
```

### Refactoring Status

The codebase is **currently undergoing refactoring** to improve modularity and testability. See `REFACTORING_TASKS.md` for detailed progress.

**Completed:**
- TaskManager extraction (delegated task lifecycle management)
- DependencyResolver extraction (delegated package dependency resolution)
- BuildExecutor extraction (delegated build execution)
- Testing infrastructure setup

**In Progress:**
- Comprehensive test coverage for core modules
- Performance optimization implementation

**Key Architectural Principles:**
- Single Responsibility: Each class has one clear purpose
- Dependency Injection: Services registered in DI container
- Interface-Based Design: Core operations defined by interfaces
- Testability: All components designed for unit testing

### Common Patterns

**Task Dependency Syntax:**
```typescript
// Task in same package
"dependsOn": ["compile"]

// Task in all dependencies
"dependsOn": ["^build"]

// Task in specific package
"dependsOn": ["@myorg/utils#build"]

// Multiple dependencies
"dependsOn": ["clean", "^build", "generate"]

// Weak dependencies (won't schedule if not already running)
"before": ["build"]  // Run before build if build is scheduled
"after": ["compile"]  // Run after compile if compile is scheduled
```

**Debug Logging:**
Sail uses the `debug` library with namespaces:
```bash
# Enable all debug logs
DEBUG=sail:* ./bin/dev.js build

# Enable specific namespaces
DEBUG=sail:task:* ./bin/dev.js build
DEBUG=sail:graph ./bin/dev.js build
```

Common namespaces:
- `sail:task:definition` - Task definition loading
- `sail:task:init` - Task initialization
- `sail:task:exec` - Task execution
- `sail:graph` - Build graph construction
- `sail:cache` - Caching operations

### Error Handling

Sail has a structured error hierarchy in `src/core/errors/`:

- **SailError**: Base error class
  - **ConfigurationError**: Invalid configuration
  - **BuildError**: Build execution failures
  - **DependencyError**: Dependency resolution issues
  - **FileSystemError**: File system operations
  - **ExecutionError**: Task execution failures

All errors include context for debugging and support error recovery where possible.

## Important Constraints

1. **Part of Monorepo**: This package is in a monorepo managed by pnpm workspaces and Nx
2. **Workspace Dependencies**: Uses `workspace:^` protocol for internal dependencies
3. **TypeScript**: Strict mode enabled with specific compiler options
4. **No .js Files**: Use .mjs or .cjs for JavaScript files (monorepo policy)
5. **OCLIF Structure**: Follow OCLIF conventions for commands and manifest
6. **Biome Formatting**: Code must pass Biome checks
7. **Test Coverage**: Maintain minimum 80% coverage for new code

## Integration with @tylerbu/sail-infrastructure

Sail depends on `@tylerbu/sail-infrastructure` (workspace dependency) which provides:
- Core type definitions (`BuildProjectConfig`, `Stopwatch`, etc.)
- Shared infrastructure utilities
- Common interfaces used across Sail components

When modifying interfaces or types, consider impact on sail-infrastructure package.
