# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo containing personal tools and CLI utilities, managed with pnpm workspaces and Turbo for build orchestration.

**Key Technologies:**
- **Package Manager**: pnpm 10.10.0 (required - do not use npm or yarn)
- **Build Orchestration**: Nx (task caching, parallel execution, and plugin-based inference)
- **Testing**: Vitest with coverage support
- **Formatting/Linting**: Biome (unified toolchain replacing ESLint/Prettier)
- **CLI Framework**: OCLIF for command-line tools
- **Policy Enforcement**: repopo (custom repository policy tool)

## Essential Commands

### Root-Level Development

```bash
# Install dependencies (always use pnpm, never npm/yarn)
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run all checks (format, lint, policy)
pnpm check

# Format code with Biome
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# CI pipeline (comprehensive checks)
pnpm ci
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

## Workspace Structure

The monorepo contains these key packages:

**CLI Tools (OCLIF-based):**
- `packages/cli` - @tylerbu/cli - Personal CLI tool (bin: `tbu`)
- `packages/dill` - dill-cli - File download/extraction utility
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

### Build Pipeline

Nx orchestrates builds using a **hierarchical task structure** with **plugin-based auto-inference**:

**Orchestration Tasks** (top-level, call implementation tasks):
- `build` - Builds all packages (calls build:compile, build:api, build:docs, etc.)
- `test` - Runs tests (depends on build:compile)
- `check` - Runs all quality checks (format, types, deps, policy, lint)
- `release` - Prepares releases (build + release:license)

**Implementation Tasks** (package-specific, do actual work):
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
- **Svelte apps**: build:vite (or build:tauri for desktop)

**Key Principles:**
- Top-level tasks orchestrate, never implement
- Implementation tasks use `:` separator (e.g., `build:compile`)
- Nx plugins auto-infer tasks from config files (vitest.config.ts, etc.)
- All configuration in root `nx.json` (no package-level project.json files)

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
6. Run `pnpm run check:policy` to verify compliance

### Working with OCLIF Commands

```bash
# Development mode (uses TypeScript source)
./bin/dev.js <command>

# Production mode (uses compiled JavaScript)
./bin/run.js <command>

# Update README after command changes
pnpm readme

# Update manifest
pnpm manifest
```

### Running Individual Package Scripts

Turbo caches based on inputs/outputs, so repeated builds are fast:

```bash
# Build with cache
pnpm build

# Force rebuild without cache
pnpm build --force

# See what would be built
pnpm build --dry-run
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
3. **Workspace protocol** - Internal deps use `workspace:^`
4. **Synchronized versions** - Run `pnpm syncpack:fix` to sync dependency versions
5. **Sorted configs** - package.json and tsconfig.json must be sorted
6. **Biome formatting** - Code must pass Biome checks before commit
7. **Policy compliance** - All packages must pass repopo policy checks

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
├── turbo.json         # Turbo task configuration
├── biome.jsonc        # Biome configuration
├── repopo.config.ts   # Repository policies
└── syncpack.config.cjs # Dependency version sync
```

## Troubleshooting

**Build failures:**
- Clear Turbo cache: `rm -rf .turbo`
- Clear package builds: `pnpm clean`
- Reinstall: `rm -rf node_modules && pnpm install`

**Policy violations:**
- Auto-fix: `pnpm run fix:policy`
- Check specific package: `./packages/repopo/bin/dev.js check --path packages/<name>`

**Version mismatches:**
- Sync dependencies: `pnpm syncpack:fix`
- Check for mismatches: `pnpm run check:deps`

**TypeScript errors:**
- Ensure you're extending the correct base config
- Check that `esm/` output is current: `pnpm compile`
- Verify imports use explicit extensions (.mjs/.cjs)


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors


<!-- nx configuration end-->