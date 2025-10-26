# Copilot Instructions for tools-monorepo

## Overview
**pnpm workspace monorepo** with TypeScript, Nx build system, Biome linting/formatting, and Vitest testing. Contains 13 workspace packages including CLI tools (@tylerbu/cli, dill-cli, repopo, sort-tsconfig) and libraries.

**Tech Stack:** pnpm 10.10.0 (via corepack) | Node 20+ | Nx 21+ | Biome 2.0.4 | Vitest 3.2+ | TypeScript 5.5

## Setup & Build (CRITICAL)

```bash
# 1. ALWAYS enable corepack first (REQUIRED before pnpm works)
corepack enable

# 2. Install dependencies (use --ignore-scripts for speed, native deps like re2 are slow)
pnpm install --ignore-scripts

# 3. Build all packages (uses Nx cache, ~200ms when cached, ~20-30s clean)
pnpm run build

# 4. Run checks before committing
pnpm run ci:check    # format, deps, policies, lint
pnpm run test        # run tests (@tylerbu/xkcd2-api has pre-existing failures - ignore)
```

## Common Commands

**Build:** `pnpm run build` (cached) | `pnpm run clean && pnpm run build` (clean) | `pnpm run ci:build` (with generation)
**Test:** `pnpm run test` | `pnpm run test:coverage` | `pnpm run ci:test`
**Format:** `pnpm format` (fix) | `pnpm run check:format` (check)
**Lint:** `pnpm lint` | `pnpm run lint:fix`
**Policy:** `pnpm run check:policy` | `pnpm run fix:policy`
**Full CI:** `pnpm run ci` (runs ci:check, ci:build, ci:lint, ci:test)

## Project Layout

**Root:** pnpm-workspace.yaml (workspace def) | nx.json (build config) | biome.jsonc (lint/format) | repopo.config.ts (policies) | syncpack.config.cjs (dep sync)

**Packages (packages/*):**
- CLI: @tylerbu/cli, dill-cli, repopo, sort-tsconfig
- Libs: @tylerbu/cli-api, fundamentals, xkcd2-api, lilconfig-loader-ts, levee-client
- Docs (Astro): dill-docs, repopo-docs
- Config: config/ (shared tsconfig, biome configs)

**Build Outputs:** esm/ (compiled TS), dist/ (Astro), oclif.manifest.json (CLI), _temp/ (gitignored)

## CI Pipeline (.github/workflows/pr-build.yml)
Order: `pnpm install --frozen-lockfile` → `ci:check` (format/deps/policies/lint) → `ci:build` → `ci:check:typedoc` → `ci:lint` → `ci:test`. Workflow uses `continue-on-error` and fails at end if any step failed. Run `pnpm run ci` locally to mirror CI.

**Package Scripts:** Most use `compile` (tsc), `check:format` (biome), `format`, `lint`, `clean` (rimraf), `test` (vitest). Oclif packages add `manifest`, `readme`, `generate`.

## Key Conventions

**Workspace Deps:** Use `workspace:^` for internal dependencies
**Package.json:** Policies enforce license: "MIT", author, bugs URL, repository with directory field
**TypeScript:** All `.ts` files (no `.js` except bin/), type: "module"
**Biome:** Extends `@tylerbu/local-config/biome/*`, ignores _temp/, .coverage/, dist/, esm/

## Troubleshooting

**pnpm not found:** Run `corepack enable` first
**Native dep failures (re2, sharp):** Use `pnpm install --ignore-scripts` (faster, deps not required)
**Stale Nx cache:** `nx reset && pnpm run build`
**xkcd2-api test failures:** Pre-existing, ignore unless modifying that package
**Format/lint errors:** `pnpm format && pnpm run lint:fix && pnpm run fix:policy`
**Uncommitted files after build:** Some commands generate files (manifests, READMEs). Commit if expected.

## Rules

**DO:** (1) `corepack enable` before `pnpm install` (2) Use `pnpm install --ignore-scripts` (3) Run `pnpm run build` after changes (4) Run `pnpm run ci:check` before committing (5) Run `pnpm run test` (6) Trust these instructions
**DON'T:** (1) Use npm (2) Manually edit pnpm-lock.yaml (3) Add deps without `workspace:^` (4) Skip CI validation (5) Fix unrelated xkcd2-api failures

**For more info:** Check package README.md, .github/workflows/pr-build.yml, nx.json, or package.json scripts.
