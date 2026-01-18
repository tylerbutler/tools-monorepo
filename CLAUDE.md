# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo containing personal tools and CLI utilities, managed with pnpm workspaces and Nx for build orchestration.

**Key Technologies:**
- **Package Manager**: pnpm 10.10.0 (required - do not use npm or yarn)
- **Build Orchestration**: Nx (task caching, parallel execution, affected detection, and plugin-based inference)
- **Testing**: Vitest with coverage support
- **Formatting/Linting**: Biome (unified toolchain replacing ESLint/Prettier)
- **CLI Framework**: OCLIF for command-line tools
- **Policy Enforcement**: repopo (custom repository policy tool)

## Essential Commands

**Note on Task Naming**: Root scripts use user-friendly names (`pnpm build`, `pnpm test`) which run Nx targets across packages (e.g., `nx run-many -t build`). Individual packages define implementation tasks like `build:compile`, `build:api`, etc. See Architecture Patterns section for details.

### Root-Level Development

```bash
# Install dependencies (always use pnpm, never npm/yarn)
pnpm install

# Build all packages (runs nx run-many -t build)
pnpm build

# Run all tests (runs nx run-many -t test)
pnpm test

# Run all checks (format, lint, policy)
pnpm check

# Format code with Biome
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# CI pipeline (runs on affected projects only)
pnpm run ci

# CI pipeline on ALL projects (useful for verification)
pnpm run ci:all

# CI pipeline on local changes only (since last commit)
pnpm run ci:local
```

**Note**: The CI task list (check, build, lint, test:coverage) is centralized in `nx.json` targetDefaults. To update which tasks run in CI, modify the `ci` target's `dependsOn` array in `nx.json` - all projects will automatically use the updated configuration.

### Nx-Specific Commands

The monorepo uses Nx for intelligent task orchestration:

```bash
# Run affected tasks (compares to main branch)
pnpm nx affected -t build
pnpm nx affected -t test
pnpm nx affected -t ci

# Run tasks on all projects
pnpm nx run-many -t build
pnpm nx run-many -t test

# Run task on specific project
pnpm nx run cli:build
pnpm nx run cli:test

# View project details and task configuration
pnpm nx show project cli --web

# Visualize project graph
pnpm nx graph
```

### Package-Level Development

Each package can be built/tested independently:

```bash
cd packages/<package-name>

# Build single package
pnpm build

# Test single package
pnpm test

# Run package-specific commands
pnpm run <script>
```

### Policy and Maintenance

```bash
# Check repository policies
pnpm run check:policy
./packages/repopo/bin/dev.js check

# Fix policy violations
pnpm run fix:policy

# Sync package.json dependencies
pnpm syncpack:fix

# Update dependencies interactively
pnpm deps
```

## Task Reference

This section documents the top-level tasks available in the monorepo and their purposes.

### Orchestration vs Implementation Tasks

The monorepo uses a two-tier task architecture:

**Orchestration Tasks** (no prefix):
- Defined as empty synthetic targets in `nx.targets` section of package.json
- Actual orchestration happens via `dependsOn` in `nx.json` targetDefaults
- Examples: `build`, `test`, `check`, `ci`
- **Never** run implementation code directly in package.json scripts

**Implementation Tasks** (`:` prefix):
- Contain actual shell commands to execute
- Examples: `build:compile`, `build:api`, `test:vitest`, `check:format`
- Run by Nx based on dependency graph defined in `nx.json`

### Top-Level Tasks

#### `build`
**Purpose**: Compile, bundle, and prepare all packages for distribution
**Orchestration**: Runs implementation tasks based on package type
**Common implementations**:
- `build:compile` - TypeScript compilation (tsc)
- `build:api` - API Extractor documentation generation
- `build:docs` - TypeDoc documentation generation
- `build:manifest` - OCLIF manifest generation for CLI tools
- `build:readme` - OCLIF readme generation for CLI tools
- `build:site` - Astro/Vite site builds
- `build:vite` - Vite builds for Svelte apps

**Usage**:
```bash
pnpm build              # Build all packages
pnpm nx run cli:build   # Build specific package
pnpm nx affected -t build  # Build only affected packages
```

#### `test`
**Purpose**: Run test suites to verify code correctness
**Orchestration**: Runs `build:compile` first, then test implementations
**Common implementations**:
- `test:vitest` - Vitest unit tests
- `test:unit` - Unit tests
- `test:coverage` - Tests with coverage reporting
- `test:e2e` - End-to-end tests
- `test:snapshots` - OCLIF command snapshot tests

**Usage**:
```bash
pnpm test                    # Test all packages
pnpm test:coverage          # Test with coverage
pnpm nx run cli:test        # Test specific package
pnpm nx affected -t test    # Test only affected packages
```

#### `check`
**Purpose**: Validate code quality without modification
**Orchestration**: Runs various validation tasks
**Common implementations**:
- `check:format` - Biome format checking
- `check:types` - TypeScript type checking
- `check:deps` - Dependency version synchronization
- `check:policy` - Repository policy validation (repopo)
- `check:astro` - Astro project validation
- `check:svelte` - Svelte component validation

**Usage**:
```bash
pnpm check                  # Check all packages
pnpm nx run cli:check       # Check specific package
```

#### `lint`
**Purpose**: Analyze code for potential errors and style issues
**Implementation**: Typically runs Biome linter directly (not orchestration)
**Common scripts**:
- `lint` - Run Biome linter
- `lint:fix` - Auto-fix linting issues

**Usage**:
```bash
pnpm lint                   # Lint all packages
pnpm lint:fix              # Fix lint issues
```

#### `format`
**Purpose**: Auto-format code to match style guidelines
**Implementation**: Typically runs Biome formatter directly

**Usage**:
```bash
pnpm format                 # Format all packages
```

#### `ci`
**Purpose**: Run complete CI pipeline (check, build, lint, test:coverage)
**Orchestration**: Centralized in `nx.json` - all packages inherit same pipeline
**Task list**: Defined once in `nx.json` targetDefaults, used by all packages

**Usage**:
```bash
pnpm run ci                 # CI on affected packages
pnpm run ci:all             # CI on all packages
pnpm run ci:local          # CI on local changes
```

#### `clean`
**Purpose**: Remove build artifacts and generated files
**Implementations**: Package-specific cleanup scripts

**Usage**:
```bash
pnpm clean                  # Clean all packages
```

### Package-Specific Tasks

Some packages have specialized tasks:

**OCLIF CLI packages** (cli, dill-cli, repopo, sort-tsconfig):
- `build:manifest` - Generate OCLIF command manifest
- `build:readme` - Generate README from command help
- `build:generate` - Generate command snapshots for testing

**Documentation sites** (ccl-docs, dill-docs, repopo-docs):
- `build:site` - Build Astro static site
- `check:astro` - Validate Astro configuration
- `dev` - Development server with hot reload
- `preview` - Preview production build

**Library packages**:
- `build:api` - Generate API documentation with API Extractor
- `build:docs` - Generate TypeDoc documentation

### Task Execution Flow

Example: Running `pnpm nx run cli:build`

1. Nx reads `cli` package.json and finds `nx.targets.build: {}`
2. Nx checks `nx.json` targetDefaults for `build` dependencies
3. Nx sees `dependsOn: ["^build", "build:compile", "build:manifest", "build:readme", ...]`
4. Nx runs `build` on workspace dependencies first (`^build`)
5. Nx runs implementation tasks in parallel where possible:
   - `build:compile` (TypeScript compilation)
   - After compile: `build:manifest` (OCLIF manifest)
   - After manifest: `build:readme` (OCLIF readme)
6. All tasks use caching - unchanged inputs skip execution

### Adding New Tasks

To add a task to a package:

1. **Add implementation script** to package.json:
   ```json
   "scripts": {
     "build:custom": "your-command-here"
   }
   ```

2. **Add to orchestration** in nx.json targetDefaults:
   ```json
   "build": {
     "dependsOn": [
       "^build",
       "build:compile",
       "build:custom"  // Add your task
     ]
   }
   ```

3. **Enable orchestration** in package.json:
   ```json
   "nx": {
     "targets": {
       "build": {}  // Synthetic target using nx.json orchestration
     }
   }
   ```

## Workspace Structure

The monorepo contains these key packages:

**CLI Tools (OCLIF-based):**
- `packages/cli` - @tylerbu/cli - Personal CLI tool (bin: `tbu`)
- `packages/dill-cli` - dill-cli - File download/extraction utility
- `packages/repopo` - Repository policy enforcement tool
- `packages/sort-tsconfig` - TypeScript config sorting utility

**Libraries:**
- `packages/fundamentals` - Shared utilities (array, git, etc.) with zero dependencies
- `packages/cli-api` - Shared CLI command infrastructure for OCLIF projects
- `packages/levee-client` - HTTP client library
- `packages/xkcd2-api` - XKCD API wrapper
- `packages/lilconfig-loader-ts` - TypeScript loader for lilconfig

**Documentation Sites (Astro/Starlight):**
- `packages/ccl-docs` - CCL documentation (deployed to ccl.tylerbutler.com)
- `packages/dill-docs` - Dill documentation
- `packages/repopo-docs` - Repopo documentation

**Shared Configuration:**
- `config/` - Base TypeScript configs and API Extractor settings

## Architecture Patterns

### Build Pipeline & Task Architecture

Nx orchestrates builds using **pure dependency-based orchestration** - no shell scripts, just dependency graphs.

#### **Task Naming Convention**

This monorepo uses a two-tier task architecture:

1. **Orchestration Targets** (no prefix) - Defined in `nx.json` targetDefaults
   - Examples: `build`, `test`, `check`, `ci`, `release`
   - **Purpose**: Coordinate multiple implementation tasks via `dependsOn`
   - **Configuration**: Only dependencies, no inputs/outputs (delegates to implementation tasks)
   - **Location**: Centralized in `nx.json` targetDefaults

2. **Implementation Tasks** (with `:` prefix) - Defined in package.json scripts
   - Examples: `build:compile`, `test:unit`, `check:format`
   - **Purpose**: Perform actual work (compile, test, lint, etc.)
   - **Configuration**: Specific inputs, outputs, and caching rules
   - **Location**: Package-specific in package.json, orchestrated via `nx.json`

**Why This Matters:**
- Orchestration targets provide simple commands (`pnpm build`) that run complex pipelines
- Implementation tasks enable granular caching (change README → only `build:readme` reruns)
- Clear separation makes it easy to understand what runs when and why

#### **Architecture Overview**

**Orchestration via `nx.json`, Implementation via package.json scripts**

**Orchestration Targets** (defined in `nx.json` targetDefaults):
- `ci` - Full CI pipeline (**centralized task list**: check, build, lint, test:coverage)
  - Configured once in `nx.json` targetDefaults
  - Each package enables via minimal package.json entry
  - Update task list in ONE place (nx.json) to affect all projects
- `build` - Coordinates all build implementation tasks via `dependsOn`
- `test` - Coordinates compile + all test variants (unit, vitest, snapshots)
- `check` - Coordinates all quality checks (format, types, deps, policy)
- `release` - Prepares releases (build + license generation)

**Implementation Tasks** (package-specific, defined in package.json):
- `build:compile` - TypeScript compilation (src → esm/)
- `build:api` - API Extractor documentation
- `build:docs` - TypeDoc documentation
- `build:manifest` - OCLIF manifest generation
- `build:readme` - OCLIF readme generation
- `build:generate` - OCLIF command snapshots
- `build:site` - Astro/Vite site builds
- `build:vite` / `build:tauri` - Svelte/Tauri builds
- `test:unit`, `test:coverage`, `test:e2e` - Testing variants
- `check:format`, `check:types`, `check:deps`, `check:policy` - Quality checks

**Plugin-Inferred Tasks** (auto-detected by Nx plugins):
- `test:vitest` - Auto-inferred from vitest.config.ts (via @nx/vite plugin)

**Package-Specific Pipelines:**
- **Libraries**: build:compile → build:api → build:docs
- **CLI tools**: build:compile → build:manifest → build:readme → build:generate
- **Astro sites**: build:site only
- **Svelte apps**: build:vite (or build:vite → build:tauri for desktop)

**Key Principles:**
- **Orchestration in `nx.json`** - Dependency chains defined via `dependsOn`
- **Implementation in package.json** - Actual work performed by scripts
- **No orchestrator scripts** - Package.json contains minimal entries (e.g., `"build": ""`) to register targets
- **Granular caching** - Each implementation task caches independently with specific inputs/outputs
- **Parallel execution** - Nx runs tasks without dependencies concurrently (up to 8 parallel tasks)
- **Colon separator** - Implementation tasks use `:` (e.g., `build:compile`, `test:unit`)
- **Plugin inference** - Nx plugins auto-detect tasks from config files (vitest.config.ts, etc.)
- **Centralized config** - All orchestration in root `nx.json` (no package-level project.json files)

**Benefits:**
- **Precise caching**: Change README → only `build:readme` runs (others use cache)
- **Smart rebuilds**: Change source → only affected tasks rebuild
- **Parallel execution**: API Extractor configs run in parallel across packages
- **Performance**: 60-80% faster CI for isolated changes due to granular caching
- **Maintainability**: Update CI tasks once in `nx.json`, all packages inherit changes

### TypeScript Configuration

All packages extend base tsconfig files from `config/`:

- `tsconfig.base.json` - Common compiler options
- `tsconfig.strict.json` - Strict type checking
- `tsconfig.super-strict.json` - Maximum strictness
- `tsconfig.node.json` - Node-specific settings

**Important:** This monorepo uses **explicit .mjs/.cjs extensions** - no ambiguous .js files allowed. This is enforced via the `NoJsFileExtensions` policy in repopo.

### Nx Plugin Configuration

Nx uses plugins to automatically infer tasks from configuration files, reducing manual configuration:

**Active Plugins:**
- `@nx/vite/plugin` - Auto-infers test tasks from `vitest.config.ts` files

**Plugin Exclusions** (projects with non-standard configurations):
- `packages/ccl-test-viewer/**` - Svelte app with custom Vite setup
- `packages/ccl-docs/**` - Astro site (uses Vite internally but different structure)
- `packages/dill-docs/**` - Astro site
- `packages/repopo-docs/**` - Astro site

**Inferred Targets:**
- `test:vitest` - Automatically created for packages with `vitest.config.ts`
  - Uses same caching and configuration as manually defined tasks
  - Available on: fundamentals, cli-api, cli, repopo, sort-tsconfig, xkcd2-api, dill

**Why Use Plugins?**
- Automatic task discovery when adding new packages
- Less manual configuration in `nx.json`
- Consistent task naming across projects
- Better IDE/Nx Console integration

**Configuration Location:** See `nx.json` → `plugins` array

### OCLIF CLI Structure

CLI packages follow OCLIF conventions:

- Commands in `src/commands/` (compiled to `esm/commands/`)
- Binary entry point in `bin/run.js` (production) or `bin/dev.js` (development)
- Manifest auto-generated in `oclif.manifest.json`
- README auto-generated from command help text

**Testing CLI Commands:**
- Use `@oclif/plugin-command-snapshot` for snapshot testing
- Generate snapshots: `./bin/dev.js snapshot:generate`
- Compare snapshots: `./bin/dev.js snapshot:compare`

### Repository Policies (repopo)

The monorepo enforces consistency via `repopo.config.ts`:

- **NoJsFileExtensions** - No .js files (use .mjs/.cjs)
- **PackageJsonProperties** - Standardized package.json fields
- **PackageJsonSorted** - Sorted package.json (via sort-package-json)
- **SortTsconfigsPolicy** - Sorted tsconfig files

Run `./packages/repopo/bin/dev.js check --fix` to auto-fix violations.

### Testing Strategy

Each package uses Vitest with a shared base configuration:

- Base config: `config/vitest.config.ts`
- Per-package: `packages/*/vitest.config.ts` (merges base config)
- Test files: `test/**/*.test.ts`
- Coverage output: `.coverage/`
- JUnit reports: `_temp/junit.xml`

**Run tests:**
```bash
# All packages
pnpm test

# Single package
cd packages/<name> && pnpm test

# With coverage
pnpm test:coverage
```

### Dependency Management

**Workspace Dependencies:**
- Internal packages use `workspace:^` protocol
- Versions synchronized via syncpack
- Peer dependencies configured in root package.json

**Key Constraints:**
- Node >= 18.0.0
- TypeScript ~5.5.4 (pinned minor version)
- Biome 2.0.4 (shared across all packages)

## Common Development Workflows

### Adding a New Package

1. Create `packages/<name>/` directory
2. Add `package.json` with required fields (license, author, bugs, repository)
3. Add to `pnpm-workspace.yaml` (already includes `packages/*`)
4. Extend base tsconfig: `{ "extends": "../../config/tsconfig.strict.json" }`
5. Run `pnpm install` from root
6. Run `pnpm run repopo` to verify compliance (or `pnpm run fix:policy` to auto-fix)

### Working with OCLIF Commands

```bash
# Development mode (uses TypeScript source)
./bin/dev.js <command>

# Production mode (uses compiled JavaScript)
./bin/run.js <command>

# Update README after command changes (runs build:readme task)
pnpm nx run cli:build:readme

# Update manifest (runs build:manifest task)
pnpm nx run cli:build:manifest

# Generate command snapshots (runs build:generate task)
pnpm nx run cli:build:generate
```

### Running Individual Package Scripts

Nx caches based on inputs/outputs, so repeated builds are fast:

```bash
# Build with cache
pnpm build

# Force rebuild without cache
pnpm nx reset && pnpm build

# See what would be built
pnpm nx run-many -t build --dry-run
```

### Formatting and Linting

Biome replaces both ESLint and Prettier:

```bash
# Check formatting only (no linting)
pnpm run check:format

# Fix formatting
pnpm format

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix

# Both format and lint
pnpm check
```

**CI Mode:**
```bash
# GitHub Actions reporter
pnpm run ci:lint
```

## Important Constraints

1. **Always use pnpm** - The `packageManager` field enforces pnpm 10.10.0
2. **No .js files** - Use .mjs or .cjs for JavaScript files (enforced by repopo)
3. **Use pathe for path handling** - Always use `pathe` instead of `node:path` for cross-platform path operations
4. **Async file I/O** - Prefer `fs/promises` over sync fs operations (e.g., `readFile` over `readFileSync`)
5. **Workspace protocol** - Internal deps use `workspace:^`
6. **Synchronized versions** - Run `pnpm syncpack:fix` to sync dependency versions
7. **Sorted configs** - package.json and tsconfig.json must be sorted
8. **Biome formatting** - Code must pass Biome checks before commit
9. **Policy compliance** - All packages must pass repopo policy checks

## File Organization

```
tools-monorepo/
├── packages/           # All packages
│   ├── cli/           # OCLIF CLI tools
│   ├── */src/         # TypeScript source
│   ├── */esm/         # Compiled output
│   ├── */test/        # Test files
│   └── */docs/        # Generated docs
├── config/            # Shared configs
│   ├── tsconfig*.json # Base TypeScript configs
│   ├── vitest.config.ts
│   └── api-extractor.base.json
├── nx.json            # Nx task configuration
├── biome.jsonc        # Biome configuration
├── repopo.config.ts   # Repository policies
└── syncpack.config.cjs # Dependency version sync
```

## Troubleshooting

**Build failures:**
- Clear Nx cache: `pnpm nx reset`
- Clear package builds: `pnpm clean`
- Reinstall: `rm -rf node_modules && pnpm install`

**Policy violations:**
- Auto-fix: `pnpm run fix:policy` (runs `repopo check --fix`)
- Check specific package: `./packages/repopo/bin/dev.js check --path packages/<name>`

**Version mismatches:**
- Sync dependencies: `pnpm syncpack:fix`
- Check for mismatches: `pnpm nx run-many -t syncpack`

**TypeScript errors:**
- Ensure you're extending the correct base config
- Check that `esm/` output is current: `pnpm compile`
- Verify imports use explicit extensions (.mjs/.cjs)


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `pnpm nx run`, `pnpm nx run-many`, `pnpm nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:
- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix their problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool


<!-- nx configuration end-->

- This project uses tabs primarily for indentation. Not spaces.
- We do not use re-export patterns. Always import from the module directly.
- Use "pnpm vitest" to run specific tests and test files. pnpm test will typically run all tests no matter what arguments you pass.