# @tylerbu/cli-monorepo

This is a monorepo containing @tylerbutler's personal tools and CLI utilities.

## Quick Start

```bash
# Install dependencies (requires pnpm 10.10.0)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Check code quality
pnpm check

# Format code
pnpm format
```

## Available Tasks

The monorepo uses Nx for intelligent task orchestration with a two-tier architecture:

**Orchestration Tasks** (defined via `nx.targets` in package.json):
- `build` - Compile and bundle all packages
- `test` - Run test suites
- `check` - Validate code quality (format, types, dependencies, policies)
- `lint` - Analyze code for errors
- `ci` - Complete CI pipeline (check + build + lint + test:coverage)
- `clean` - Remove build artifacts

**Implementation Tasks** (actual commands with `:` prefix):
- `build:compile` - TypeScript compilation
- `build:api` - API documentation generation
- `build:site` - Static site builds (Astro)
- `test:vitest` - Vitest unit tests
- `test:coverage` - Tests with coverage
- `check:format` - Biome format checking
- `check:types` - TypeScript type checking

### Usage Examples

```bash
# Build only affected packages (compares to main branch)
pnpm nx affected -t build

# Run CI on all packages
pnpm run ci:all

# Build specific package
pnpm nx run cli:build

# View task execution plan
pnpm nx run cli:build --dry-run

# Visualize dependency graph
pnpm nx graph
```

## Key Packages

**CLI Tools:**
- `@tylerbu/cli` - Personal CLI utility (bin: `tbu`)
- `dill-cli` - File download/extraction tool
- `repopo` - Repository policy enforcement
- `sort-tsconfig` - TypeScript config sorter

**Libraries:**
- `@tylerbu/fundamentals` - Zero-dependency utilities
- `@tylerbu/cli-api` - OCLIF command infrastructure
- `@tylerbu/levee-client` - HTTP client library

**Documentation Sites:**
- `ccl-docs` - CCL language documentation
- `dill-docs` - Dill CLI documentation
- `repopo-docs` - Repopo tool documentation

## Documentation

For detailed information, see [CLAUDE.md](./CLAUDE.md):
- Architecture patterns and task orchestration
- Build pipeline configuration
- Development workflows
- Testing strategies
- Package-specific guidelines

## Requirements

- **Node.js**: >= 18.0.0
- **pnpm**: 10.10.0 (enforced via `packageManager` field)
- **Nx**: Workspace orchestration
- **Biome**: Formatting and linting

