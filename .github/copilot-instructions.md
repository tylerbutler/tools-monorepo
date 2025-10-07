# Copilot Coding Agent Instructions for tools-monorepo

## Repository Overview

This is a **pnpm workspace monorepo** containing @tylerbutler's personal tools and CLI utilities. The repository uses **Turbo** for build orchestration, **TypeScript** for type safety, **Biome** for linting/formatting, and **Vitest** for testing.

**Key Details:**
- **Package Manager:** pnpm 10.10.0 (via corepack)
- **Node Version:** 20+ (specified in .nvmrc)
- **Monorepo Tool:** Turbo 2.5+
- **Build System:** TypeScript + Turbo
- **Linter/Formatter:** Biome 2.0.4
- **Test Framework:** Vitest 3.2+
- **Total Packages:** 13 workspace packages

## Critical Setup Steps

### 1. Environment Setup (ALWAYS DO THIS FIRST)

```bash
# Enable pnpm via corepack (REQUIRED)
corepack enable

# Install dependencies
# Use --ignore-scripts for faster install (native deps like re2 can be slow)
pnpm install --ignore-scripts

# For full install with native dependencies (slower, ~5+ minutes):
# pnpm install --frozen-lockfile
```

**IMPORTANT:** Always run `corepack enable` before `pnpm install`. Without this, pnpm will not be available.

### 2. Build Process

```bash
# Build all packages (uses Turbo cache, very fast when cached)
pnpm run build

# Clean build from scratch
pnpm run clean
pnpm run build

# Build and generate artifacts
pnpm run ci:build
```

**Build Times:**
- Cached build: ~200ms (turbo cache hit)
- Clean build: ~20-30 seconds
- First install: ~5+ minutes (if native deps are built)

### 3. Testing

```bash
# Run all tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# CI test command
pnpm run ci:test
```

**Known Test Issues:**
- `@tylerbu/xkcd2-api` package has failing snapshot tests (pre-existing)
- This is NOT your responsibility to fix unless directly related to your changes

### 4. Linting and Formatting

```bash
# Check format (no changes)
pnpm run check:format

# Format code
pnpm format

# Lint code
pnpm lint

# Fix lint issues
pnpm run lint:fix

# CI check (includes deps, format, policy, lint)
pnpm run ci:check

# Check all (deps, format, policy, lint)
pnpm run check:all
```

### 5. Policy Checks

```bash
# Check repository policies
pnpm run check:policy

# Fix policy violations
pnpm run fix:policy
```

**Policy Tool:** The repo uses `repopo` (one of the packages) to enforce file policies like package.json properties, tsconfig sorting, etc.

## Project Structure

### Root Configuration Files

- **pnpm-workspace.yaml** - Defines workspace packages (packages/* and config)
- **turbo.json** - Turbo build pipeline configuration
- **biome.jsonc** - Biome linter/formatter configuration
- **repopo.config.ts** - Repository policy configuration
- **syncpack.config.cjs** - Dependency version synchronization
- **lefthook.yml** - Git hooks (pre-commit, pre-push) - currently disabled
- **.nvmrc** - Node.js version (20)
- **package.json** - Root package with workspace scripts

### Key Packages

**CLI Tools:**
- **@tylerbu/cli** (`packages/cli`) - Personal CLI tool (oclif-based)
- **dill-cli** (`packages/dill`) - Download and decompress utility
- **repopo** (`packages/repopo`) - Repository policy enforcement tool
- **sort-tsconfig** (`packages/sort-tsconfig`) - TSConfig sorter

**Libraries:**
- **@tylerbu/cli-api** (`packages/cli-api`) - Shared CLI utilities
- **@tylerbu/fundamentals** (`packages/fundamentals`) - Core utilities
- **@tylerbu/xkcd2-api** (`packages/xkcd2-api`) - XKCD API wrapper
- **@tylerbu/lilconfig-loader-ts** (`packages/lilconfig-loader-ts`) - Config loader
- **@tylerbu/levee-client** (`packages/levee-client`) - Levee client library

**Documentation (Astro/Starlight):**
- **dill-docs** (`packages/dill-docs`) - Dill CLI documentation
- **repopo-docs** (`packages/repopo-docs`) - Repopo documentation

**Configuration:**
- **config** - Shared TypeScript, Biome, and other configs

### TypeScript Configuration

All packages extend from shared configs in `config/`:
- **tsconfig.base.json** - Base config (extends @tsconfig/node18)
- **tsconfig.strict.json** - Strict type checking
- **tsconfig.super-strict.json** - Maximum strictness
- **tsconfig.default.json** - Default package config

### Build Outputs

Each package typically outputs to:
- **esm/** - Compiled TypeScript (ES modules)
- **dist/** - Built assets (for Astro sites)
- **.astro/** - Astro build cache
- **oclif.manifest.json** - CLI manifest (for oclif packages)
- **_temp/** - Temporary files (gitignored)

## CI/CD Pipeline

### GitHub Actions Workflow (.github/workflows/pr-build.yml)

The CI runs on every PR and executes in this order:

```bash
pnpm install --frozen-lockfile
pnpm run ci:check        # Check format, deps, policies, lint
pnpm run ci:build        # Build all packages
pnpm run ci:check:typedoc # Check TypeDoc for docs packages
pnpm run ci:lint         # Lint with GitHub reporter
pnpm run ci:test         # Run tests with coverage
```

**Important:** The workflow uses `continue-on-error: true` for some steps and collects failures, then fails at the end if any step failed. This means you may see multiple errors - address them all.

### Validation Steps (Mirror CI Locally)

```bash
# Run the full CI pipeline locally
pnpm run ci

# Or run individual steps
pnpm run ci:check
pnpm run ci:build
pnpm run ci:lint
pnpm run ci:test
```

## Common Package Scripts

Most packages follow this pattern:

```json
{
  "build": "turbo run build",           // Build via Turbo
  "compile": "tsc --project ./tsconfig.json",  // Compile TS
  "check": "concurrently npm:check:format",    // Format check
  "check:format": "biome check . --linter-enabled=false",
  "format": "biome check . --linter-enabled=false --write",
  "lint": "biome lint .",
  "lint:fix": "biome lint . --write",
  "clean": "rimraf esm *.tsbuildinfo",
  "test": "vitest run test"             // Run tests
}
```

For oclif packages (CLI tools), additional scripts:
```json
{
  "manifest": "oclif manifest",         // Generate CLI manifest
  "readme": "oclif readme",             // Generate README
  "generate": "...",                    // Generate snapshots/docs
}
```

## Important Patterns and Conventions

### 1. Workspace Dependencies

Use `workspace:^` protocol for internal dependencies:
```json
"dependencies": {
  "@tylerbu/cli-api": "workspace:^"
}
```

### 2. Package.json Requirements

Policies enforce these properties in all package.json files:
```json
{
  "license": "MIT",
  "author": "Tyler Butler <tyler@tylerbutler.com>",
  "bugs": "https://github.com/tylerbutler/tools-monorepo/issues",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tylerbutler/tools-monorepo.git",
    "directory": "packages/<package-name>"
  }
}
```

### 3. TypeScript Files Only

- No `.js` file extensions in TypeScript projects (except bin/ directories)
- All source uses `.ts` extension
- Type: "module" (ES modules)

### 4. Biome Configuration

- Formatting and linting use Biome (not ESLint/Prettier)
- Config extends from `@tylerbu/local-config/biome/*`
- Ignores: `_temp/`, `.coverage/`, `dist/`, `esm/`, `node_modules/`

## Troubleshooting

### Issue: pnpm not found

**Solution:** Run `corepack enable` before installing dependencies.

### Issue: Native dependency build failures (re2, sharp)

**Solution:** Use `pnpm install --ignore-scripts` for faster installs. Native deps are not required for most development work.

### Issue: Turbo cache stale

**Solution:** 
```bash
pnpm run clean
rm -rf .turbo
pnpm run build
```

### Issue: Test failures in @tylerbu/xkcd2-api

**Explanation:** This package has pre-existing test failures. Ignore unless you're modifying that package.

### Issue: Format/lint failures

**Solution:**
```bash
# Auto-fix formatting
pnpm format

# Auto-fix linting
pnpm run lint:fix

# Fix policy violations
pnpm run fix:policy
```

### Issue: Git diff shows uncommitted changes after build

**Explanation:** Some build commands generate files (manifests, READMEs, snapshots). The CI verifies no files are changed after build.

**Solution:** Commit generated files if they're expected, or fix the build process if they shouldn't be generated.

## Performance Tips

1. **Use Turbo cache:** Turbo caches build outputs. Run `pnpm run build` instead of package-specific build commands.

2. **Parallel commands:** Use `pnpm run -r --parallel <command>` to run commands in all packages simultaneously.

3. **Skip native deps:** Use `--ignore-scripts` during install for faster setup.

4. **Clean selectively:** Clean only the packages you're modifying instead of the entire repo.

## File Locations Reference

### Root Files
```
.
├── .github/
│   └── workflows/        # CI/CD workflows
├── config/               # Shared configs (TS, Biome, Vitest)
├── packages/             # All workspace packages
├── scripts/              # Utility scripts
├── biome.jsonc           # Linter/formatter config
├── lefthook.yml          # Git hooks config
├── package.json          # Root package with scripts
├── pnpm-workspace.yaml   # Workspace definition
├── repopo.config.ts      # Policy configuration
├── syncpack.config.cjs   # Dependency sync config
└── turbo.json            # Build pipeline config
```

### Package Files (typical)
```
packages/<name>/
├── src/                  # Source code
├── test/                 # Tests
├── esm/                  # Build output (gitignored)
├── bin/                  # CLI entry points
├── package.json          # Package definition
├── tsconfig.json         # TS config (extends config/)
└── vitest.config.ts      # Test config (optional)
```

## Final Instructions

**ALWAYS:**
1. Run `corepack enable` before `pnpm install`
2. Run `pnpm install --ignore-scripts` for fast setup
3. Run `pnpm run build` after install and after code changes
4. Run `pnpm run ci:check` before committing
5. Run `pnpm run test` to verify tests pass
6. Trust these instructions and only search for additional information if they are incomplete or incorrect

**NEVER:**
1. Run `npm` commands (use `pnpm` exclusively)
2. Modify `pnpm-lock.yaml` manually
3. Add new dependencies without considering workspace protocol
4. Skip the CI validation steps before committing
5. Fix unrelated test failures (like xkcd2-api) unless explicitly asked

## Questions?

If you encounter issues not covered here, check:
1. Package-specific README.md files
2. The CI workflow file (.github/workflows/pr-build.yml)
3. Turbo.json task definitions
4. Package.json scripts in the affected package
