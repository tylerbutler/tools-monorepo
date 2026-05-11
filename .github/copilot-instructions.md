# Copilot Instructions for tools-monorepo

pnpm workspace monorepo with TypeScript, Nx build orchestration, Biome formatting/linting, and Vitest testing. Contains CLI tools (OCLIF-based) and libraries in `packages/`.

## Commands

```bash
# Setup
corepack enable                          # REQUIRED before pnpm works
pnpm install --ignore-scripts            # --ignore-scripts avoids slow native deps (re2, sharp)

# Build & test
pnpm build                               # Build all packages (Nx-cached)
pnpm test                                # Test all packages
pnpm nx run <pkg>:<task>                 # Target one package: pnpm nx run cli:build
pnpm nx affected -t build               # Build only packages affected by your changes
pnpm nx affected -t test                # Test only affected packages

# Run a single test file or pattern
pnpm vitest <pattern>                    # e.g. pnpm vitest sort-tsconfig

# Format, lint, policy
pnpm format                              # Auto-fix formatting (Biome)
pnpm lint:fix                            # Auto-fix lint issues (Biome)
pnpm run fix:policy                      # Auto-fix repo policy violations (repopo)

# Pre-commit validation
pnpm run ci:check                        # format + deps + policies + lint
pnpm run ci                              # full CI pipeline (check, build, lint, test)
```

## Architecture

### Two-Tier Task System

Nx uses **orchestration targets** (e.g. `build`, `test`, `ci`) defined in `nx.json` that coordinate **implementation tasks** (e.g. `build:compile`, `test:vitest`) defined in each package's `package.json` scripts. Orchestration targets have no implementation themselves — they only declare `dependsOn` relationships.

**Package-type build pipelines:**
- **Libraries:** `build:compile` → `build:api` → `build:docs`
- **CLI tools:** `build:compile` → `build:manifest` → `build:readme`
- **Rust crates:** `build`, `test`, `lint` (via `@monodon/rust` executors)
- **Doc sites (Astro):** `build:site`

All orchestration config lives in root `nx.json`. Rust crates use `project.json` for executor configuration.

### OCLIF CLI Packages

CLI packages (`cli`, `dill-cli`, `repopo`, `sort-tsconfig`) use OCLIF:
- Commands live in `src/commands/`, compiled to `esm/commands/`
- `bin/dev.js` — development mode (runs from TypeScript source)
- `bin/run.js` — production mode (runs from compiled output)
- `oclif.manifest.json` and README are auto-generated during build

### Testing

Vitest with shared base config (`config/vitest.config.ts`). Test files: `test/**/*.test.ts`.

### Key Configuration Files

| File | Purpose |
|------|---------|
| `nx.json` | Task orchestration, caching, dependency chains |
| `biome.jsonc` | Formatting and linting rules |
| `repopo.config.ts` | Repository policy enforcement |
| `syncpack.config.cjs` | Dependency version synchronization |
| `config/tsconfig*.json` | Shared TypeScript base configs |
| `Cargo.toml` (root) | Cargo workspace definition |
| `packages/repopo-core/project.json` | Rust crate Nx executor config |

## Conventions

- **pnpm only** — never use npm or yarn. Version enforced via `packageManager` field.
- **Tabs for indentation** — not spaces.
- **No `.js` files** — use `.mjs` or `.cjs` for JavaScript. Enforced by repopo `NoJsFileExtensions` policy.
- **Use `pathe`** instead of `node:path` for cross-platform path operations.
- **Async file I/O** — prefer `fs/promises` (e.g. `readFile`) over sync variants.
- **No barrel re-exports** — import from the source module directly, not through index files.
- **`workspace:^`** for all internal workspace dependencies.
- **Sorted configs** — `package.json` and `tsconfig.json` files must be sorted (enforced by repopo).
- **`type: "module"`** — all packages are ESM.

## Troubleshooting

- **pnpm not found:** Run `corepack enable` first.
- **Stale Nx cache:** `pnpm nx reset && pnpm build`
- **Format/lint/policy errors:** `pnpm format && pnpm lint:fix && pnpm run fix:policy`
- **xkcd2-api test failures:** Pre-existing — ignore unless modifying that package.
- **Uncommitted files after build:** CLI manifests and READMEs are auto-generated. Commit them if expected.

## Additional Context

- `CLAUDE.md` at root has comprehensive architecture documentation.
- Many packages have their own `CLAUDE.md` with package-specific guidance — check `packages/<name>/CLAUDE.md`.
