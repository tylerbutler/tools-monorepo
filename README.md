# @tylerbu/cli-monorepo

This is a monorepo containing @tylerbutler's personal tools and CLI utilities.

## Contents

* [Quick Start](#quick-start)
* [Packages](#packages)
* [Documentation](#documentation)
* [Available Tasks](#available-tasks)
  * [Usage Examples](#usage-examples)
  * [Test Resources](#test-resources)
* [Key Packages](#key-packages)
* [AI Agent Instructions](#ai-agent-instructions)
* [Requirements](#requirements)

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

## Packages

<!-- workspace-packages-start -->

| Package                                                             | Description                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`@tylerbu/cli`](./packages/cli)                                    | Tyler Butler's personal CLI.                                                                    |
| [`@tylerbu/cli-api`](./packages/cli-api)                            | Base classes and other API helpers for oclif-based CLI projects.                                |
| [`@tylerbu/fundamentals`](./packages/fundamentals)                  | Fundamental functions and classes that I often need in my projects. Zero dependencies.          |
| [`@tylerbu/lilconfig-loader-ts`](./packages/lilconfig-loader-ts)    | A loader that enables loading TypeScript files in lilconfig.                                    |
| [`@tylerbu/local-config`](./config)                                 |                                                                                                 |
| [`@tylerbu/sail`](./packages/sail)                                  | Build orchestration CLI tool                                                                    |
| [`@tylerbu/sail-infrastructure`](./packages/sail-infrastructure)    | Sail build infrastructure                                                                       |
| [`@tylerbu/sorted-btree-es6`](./packages/btree-typescript)          | A sorted list of key-value pairs in a fast, typed in-memory B+ tree with a powerful API.        |
| [`@tylerbu/xkcd2-api`](./packages/xkcd2-api)                        | TypeScript APIs used in implementations of xkcd2.com.                                           |
| [`astro-tinylytics`](./packages/astro-tinylytics)                   | Astro components for Tinylytics analytics, kudos buttons, and webmentions.                      |
| [`dill-cli`](./packages/dill-cli)                                   | Command-line (CLI) program to download and optionally decompress gzipped files.                 |
| [`dill-docs`](./packages/dill-docs)                                 |                                                                                                 |
| [`rehype-footnotes`](./packages/rehype-footnotes)                   | Rehype plugin to transform GFM footnotes for Littlefoot.js integration                          |
| [`remark-lazy-links`](./packages/remark-lazy-links)                 | Remark plugin to transform lazy markdown links \[\*] into numbered references                   |
| [`remark-repopo-policies`](./packages/remark-repopo-policies)       | Remark plugin to generate documentation tables for repopo repository policies                   |
| [`remark-shift-headings`](./packages/remark-shift-headings)         | Remark plugin to shift heading levels based on rendering context                                |
| [`remark-task-table`](./packages/remark-task-table)                 | Remark plugin to generate and update task tables from package.json scripts and justfile recipes |
| [`remark-workspace-packages`](./packages/remark-workspace-packages) | Remark plugin to generate and update workspace package tables in markdown                       |
| [`repopo`](./packages/repopo)                                       | Enforce policies on all or some of the files in a git repository.                               |
| [`repopo-docs`](./packages/repopo-docs)                             |                                                                                                 |
| [`sort-tsconfig`](./packages/sort-tsconfig)                         | Sorts tsconfig files.                                                                           |

<!-- workspace-packages-end -->

## Documentation

For detailed information, see [CLAUDE.md](./CLAUDE.md):

* Architecture patterns and task orchestration
* Build pipeline configuration
* Development workflows
* Testing strategies
* Package-specific guidelines

## Available Tasks

<!-- task-table-start -->

| Task      | Description                                              |
| --------- | -------------------------------------------------------- |
| `check`   | Orchestrates check pipeline                              |
| `clean`   | nx run tools-monorepo:clean:root && nx run-many -t clean |
| `build`   | nx run-many -t build                                     |
| `ci`      | nx run-many -t ci                                        |
| `compile` | nx run-many -t build:compile                             |
| `docs`    | nx run-many -t build:docs                                |
| `format`  | biome check . --linter-enabled=false --write             |
| `lint`    | lint                                                     |
| `test`    | nx run-many -t test                                      |

<!-- task-table-end -->

**Implementation Tasks** (actual commands with `:` prefix):

* `build:compile` - TypeScript compilation
* `build:api` - API documentation generation
* `build:site` - Static site builds (Astro)
* `test:vitest` - Vitest unit tests
* `test:coverage` - Tests with coverage
* `check:format` - Biome format checking
* `check:types` - TypeScript type checking

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

### Test Resources

Nx runs up to eight tasks in parallel. Vitest uses at most two workers per
package to limit CPU and memory use during `pnpm run ci`. Tests have a 15-second
timeout both locally and in GitHub Actions. The shared settings are in
`config/vitest.config.ts`; the Astro component package uses the same limits in
its Astro-aware Vitest config.

## Key Packages

**CLI Tools:**

* `@tylerbu/cli` - Personal CLI utility (bin: `tbu`)
* `dill-cli` - File download/extraction tool
* `repopo` - Repository policy enforcement
* `sort-tsconfig` - TypeScript config sorter

**Libraries:**

* `@tylerbu/fundamentals` - Zero-dependency utilities
* `@tylerbu/cli-api` - OCLIF command infrastructure

**Documentation Sites:**

* `dill-docs` - Dill CLI documentation
* `repopo-docs` - Repopo tool documentation

## AI Agent Instructions

This repository provides comprehensive instructions for AI coding agents:

* **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - Repository-wide custom instructions for GitHub Copilot
* **[AGENTS.md](./AGENTS.md)** - General agent instructions (used by any AI coding agent)
* **[CLAUDE.md](./CLAUDE.md)** - Detailed instructions specifically for Claude AI

These files follow [GitHub Copilot best practices](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) to help AI agents work effectively in this repository.

## Requirements

* **Node.js**: >= 18.0.0
* **pnpm**: 10.10.0 (enforced via `packageManager` field)
* **Nx**: Workspace orchestration
* **Biome**: Formatting and linting
