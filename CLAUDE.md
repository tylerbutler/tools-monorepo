# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo containing personal tools and CLI utilities, managed with pnpm workspaces and Turbo for build orchestration.

**Key Technologies:**
- **Package Manager**: pnpm 10.10.0 (required - do not use npm or yarn)
- **Build Orchestration**: Turbo (task caching and parallel execution)
- **Testing**: Vitest with coverage support
- **Formatting/Linting**: Biome (unified toolchain replacing ESLint/Prettier)
- **CLI Framework**: OCLIF for command-line tools
- **Policy Enforcement**: repopo (custom repository policy tool)

## Essential Commands

**Note on Task Naming**: Root scripts use user-friendly names (`pnpm build`, `pnpm test`), which internally call Turbo orchestration tasks (`:all` suffix) that coordinate executor tasks (tool names like `tsc`, `typedoc`). See Architecture Patterns section for details.

### Root-Level Development

```bash
# Install dependencies (always use pnpm, never npm/yarn)
pnpm install

# Build all packages (runs turbo build:all)
pnpm build

# Run all tests (runs turbo test:all)
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

Turbo orchestrates builds using a **two-tier task structure**:

**Orchestration Tasks** (top-level with `:all` suffix, coordinate execution):
- `build:all` - Builds all packages (orchestrates all executor tasks)
- `test:all` - Runs tests (depends on tsc, vitest, vitest-coverage)
- `lint:all` - Linting (orchestrates biome-lint)
- `check:all` - Runs all quality checks (orchestrates format, type, astro, svelte checks)
- `clean:all` - Clean build artifacts
- `release` - Prepares releases (build:all + generate-license)

**Executor Tasks** (package-specific, do actual work):
- `tsc` - TypeScript compilation (src → esm/)
- `api-extractor` - API Extractor documentation
- `typedoc` - TypeDoc documentation generation
- `oclif-manifest` - OCLIF manifest generation
- `oclif-readme` - OCLIF readme generation
- `oclif-generate` - OCLIF command snapshots
- `astro` - Astro site builds
- `vite` / `tauri` - Svelte/Tauri builds
- `copyfiles` - Copy template files to esm/
- `vitest` - Run unit tests
- `vitest-coverage` - Run tests with coverage
- `biome-lint` - Biome linting
- `biome-format` - Biome format checking
- `tsc-check` - TypeScript type checking (no emit)
- `astro-check` - Astro project validation
- `svelte-check` - Svelte project validation
- `syncpack` - Dependency version sync checking
- `repopo` - Repository policy checking
- `generate-license` - Third-party license generation

**Package-Specific Pipelines:**
- **Libraries**: tsc → api-extractor → typedoc
- **CLI tools**: tsc → oclif-manifest → oclif-readme → oclif-generate
- **Astro sites**: astro only
- **Svelte apps**: vite (or vite → tauri for desktop)

**Key Principles:**
- Orchestration tasks use `:all` suffix and coordinate executor tasks
- Executor tasks use direct tool names (e.g., `tsc`, `typedoc`, not `build:compile`, `build:docs`)
- Root package.json scripts reference executor tasks directly (e.g., `turbo run typedoc`, not `build:docs`)
- Turbo runs only tasks that exist in each package
- All configuration in root `turbo.jsonc` (no package-level configs)

### TypeScript Configuration

All packages extend base tsconfig files from `config/`:

- `tsconfig.base.json` - Common compiler options
- `tsconfig.strict.json` - Strict type checking
- `tsconfig.super-strict.json` - Maximum strictness
- `tsconfig.node.json` - Node-specific settings

**Important:** This monorepo uses **explicit .mjs/.cjs extensions** - no ambiguous .js files allowed. This is enforced via the `NoJsFileExtensions` policy in repopo.

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

# Update README after command changes (runs oclif-readme task)
pnpm readme

# Update manifest (runs oclif-manifest task)
pnpm manifest

# Generate command snapshots (runs oclif-generate task)
pnpm generate
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
- Auto-fix: `pnpm run fix:policy` (runs `repopo check --fix`)
- Check specific package: `./packages/repopo/bin/dev.js check --path packages/<name>`

**Version mismatches:**
- Sync dependencies: `pnpm syncpack:fix`
- Check for mismatches: `turbo run syncpack`

**TypeScript errors:**
- Ensure you're extending the correct base config
- Check that `esm/` output is current: `pnpm compile`
- Verify imports use explicit extensions (.mjs/.cjs)
