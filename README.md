# @tylerbu/cli-monorepo

This is a monorepo containing @tylerbutler's personal tools and CLI utilities.

## Contents

* [Quick Start](#quick-start)
* [Packages](#packages)
* [Documentation](#documentation)
* [Available Tasks](#available-tasks)
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
| [`@tylerbu/sail`](./packages/sail)                                  | Build orchestration CLI tool                                                                    |
| [`@tylerbu/sail-infrastructure`](./packages/sail-infrastructure)    | Sail build infrastructure                                                                       |
| [`@tylerbu/xkcd2-api`](./packages/xkcd2-api)                        | TypeScript APIs used in implementations of xkcd2.com.                                           |
| [`dill-cli`](./packages/dill-cli)                                   | Command-line (CLI) program to download and optionally decompress gzipped files.                 |
| [`rehype-footnotes`](./packages/rehype-footnotes)                   | Rehype plugin to transform GFM footnotes for Littlefoot.js integration                          |
| [`remark-lazy-links`](./packages/remark-lazy-links)                 | Remark plugin to transform lazy markdown links \[\*] into numbered references                   |
| [`remark-shift-headings`](./packages/remark-shift-headings)         | Remark plugin to shift heading levels based on rendering context                                |
| [`remark-task-table`](./packages/remark-task-table)                 | Remark plugin to generate and update task tables from package.json scripts and justfile recipes |
| [`remark-workspace-packages`](./packages/remark-workspace-packages) | Remark plugin to generate and update workspace package tables in markdown                       |
| [`repopo`](./packages/repopo)                                       | Enforce policies on all or some of the files in a git repository.                               |
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

## Requirements

* **Node.js**: >= 18.0.0
* **pnpm**: 10.10.0 (enforced via `packageManager` field)
* **Nx**: Workspace orchestration
* **Biome**: Formatting and linting
