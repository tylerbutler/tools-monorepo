# Notes for developers

## Turborepo Task Organization

This monorepo uses a **hierarchical task structure** where top-level tasks orchestrate and implementation tasks do the actual work.

### Task Hierarchy

**Orchestration Tasks** (defined in root `turbo.jsonc`):
- `build` - Orchestrates all build steps across packages
- `test` - Runs tests (depends on `build:compile`)
- `check` - Runs all quality checks
- `release` - Prepares release artifacts
- `clean` - Cleanup tasks
- `dev` - Development servers

**Implementation Tasks** (package-specific scripts in `package.json`):
- `build:compile` - TypeScript compilation
- `build:api` - API Extractor documentation
- `build:docs` - TypeDoc generation
- `build:manifest` - OCLIF manifest (CLI packages)
- `build:readme` - OCLIF readme (CLI packages)
- `build:generate` - Command snapshots (CLI packages)
- `build:site` - Astro builds (doc sites)
- `build:vite` - Vite builds (Svelte apps)
- `build:tauri` - Tauri desktop builds
- `test:unit`, `test:coverage`, `test:e2e` - Test variants
- `check:format`, `check:types`, `check:deps`, `check:policy` - Quality checks

### Package-Type Pipelines

**Libraries** (`fundamentals`, `cli-api`, `levee-client`, etc.):
```bash
build:compile → build:api → build:docs
```

**CLI Tools** (`cli`, `dill`, `repopo`, `sort-tsconfig`):
```bash
build:compile → build:manifest → build:readme → build:generate
```

**Documentation Sites** (`ccl-docs`, `dill-docs`, `repopo-docs`):
```bash
build:site (Astro only)
```

**Svelte Apps** (`ccl-test-viewer`):
```bash
build:vite (or build:tauri for desktop)
```

### Key Principles

1. **Top-level tasks orchestrate, never implement** - The `build` task in `turbo.jsonc` calls implementation tasks
2. **Implementation tasks use `:` separator** - e.g., `build:compile`, `test:coverage`
3. **Turbo runs only what exists** - If a package doesn't define `build:api`, it won't run
4. **All config in root** - No package-level `turbo.jsonc` files
5. **Package scripts define implementations** - Each package's `package.json` defines its specific build steps

### Adding New Tasks

When adding a new task type:

1. **Add to root `turbo.jsonc`** with appropriate `dependsOn`, `inputs`, `outputs`
2. **Add to package `package.json`** scripts for packages that need it
3. **Follow naming convention**: Use `:` separator for implementation tasks
4. **Define dependencies**: Use `dependsOn` to ensure proper task ordering

Example:
```jsonc
// turbo.jsonc
"build:lint": {
  "dependsOn": ["build:compile"],
  "inputs": ["src/**", "biome.jsonc"],
  "outputs": []
}

// packages/my-package/package.json
{
  "scripts": {
    "build:lint": "biome lint src/"
  }
}
```
