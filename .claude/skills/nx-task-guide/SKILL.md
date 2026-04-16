---
name: nx-task-guide
description: Reference for Nx task architecture, orchestration patterns, and how to add or modify build tasks
user-invocable: false
---

## Nx Task Architecture

This monorepo uses a two-tier task system. Understanding it prevents misconfiguration.

### Tier 1: Orchestration Targets (no prefix)

Defined in `nx.json` targetDefaults. These coordinate work — they have `dependsOn` but no scripts.

- `build` → depends on: `^build`, `build:compile`, `build:api`, `build:docs`, `build:manifest`, `build:readme`, `build:generate`, `build:site`, `build:vite`
- `test` → depends on: `build:compile`, `test:unit`, `test:vitest`, `test:snapshots`
- `check` → depends on: `check:format`, `check:types`, `check:deps`, `check:policy`, `check:references`, `check:astro`, `check:svelte`
- `ci` → depends on: `check`, `build`, `lint`, `test:coverage` (centralized — update once, all packages inherit)
- `release` → depends on: `build`, `release:license`

Packages opt in with a minimal entry in package.json:
```json
"nx": { "targets": { "build": {} } }
```

### Tier 2: Implementation Tasks (with `:` prefix)

Defined as scripts in each package's `package.json`. These do the actual work.

Examples: `build:compile`, `build:manifest`, `test:vitest`, `check:format`

Each has specific `inputs` and `outputs` in `nx.json` for granular caching.

### Key Rules

1. **Never put orchestration logic in package.json scripts** — that goes in `nx.json` targetDefaults
2. **Prefer `affected` over `run-many`** — `pnpm nx affected -t build` only builds changed packages
3. **Don't create `project.json` files** — all config is centralized in `nx.json`
4. **Implementation tasks cache independently** — changing README only reruns `build:readme`, not `build:compile`
5. **`^` prefix means workspace deps first** — `^build` builds dependencies before the current package

### Adding a New Task

1. Add the implementation script to the package's `package.json`:
   ```json
   "scripts": { "build:custom": "your-command" }
   ```

2. If it should run as part of an orchestration target, add it to `nx.json` targetDefaults:
   ```json
   "build": { "dependsOn": [..., "build:custom"] }
   ```

3. Add caching config in `nx.json` if needed:
   ```json
   "build:custom": {
     "inputs": ["production", "^production"],
     "outputs": ["{projectRoot}/output-dir"]
   }
   ```

### Common Commands

```bash
pnpm nx affected -t build          # Build changed packages
pnpm nx affected -t test           # Test changed packages
pnpm nx run cli:build              # Build specific package
pnpm nx run-many -t build          # Build ALL packages
pnpm nx affected -t build --dry-run # Preview what would run
pnpm nx reset                       # Clear cache
pnpm nx graph                       # Visualize dependency graph
```

### Plugin-Inferred Tasks

The `@nx/vite/plugin` auto-creates `test:vitest` for packages with `vitest.config.ts`. These work like manually defined tasks but require no configuration.
