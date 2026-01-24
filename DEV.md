# Notes for developers

## Nx Task Organization

This monorepo uses a **hierarchical task structure** where top-level tasks orchestrate and implementation tasks do the actual work.

### Task Hierarchy

**Orchestration Targets** (defined in root `nx.json` targetDefaults):
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

1. **Top-level tasks orchestrate, never implement** - The `build` target in `nx.json` calls implementation tasks
2. **Implementation tasks use `:` separator** - e.g., `build:compile`, `test:coverage`
3. **Nx runs only what exists** - If a package doesn't define `build:api`, it won't run
4. **All config in root** - No package-level `project.json` files (all in root `nx.json`)
5. **Package scripts define implementations** - Each package's `package.json` defines its specific build steps

### Adding New Tasks

When adding a new task type:

1. **Add to root `nx.json`** with appropriate `dependsOn`, `inputs`, `outputs`
2. **Add to package `package.json`** scripts for packages that need it
3. **Follow naming convention**: Use `:` separator for implementation tasks
4. **Define dependencies**: Use `dependsOn` to ensure proper task ordering

Example:
```jsonc
// nx.json targetDefaults
"build:lint": {
  "dependsOn": ["build:compile"],
  "inputs": ["default", "{projectRoot}/biome.jsonc"],
  "cache": true
}

// packages/my-package/package.json
{
  "scripts": {
    "build:lint": "biome lint src/"
  }
}
```

## TypeScript Native (tsgo) Shadow Testing

This monorepo includes infrastructure for testing with `tsgo`, the Go-based TypeScript compiler that will become TypeScript 7.0. Shadow testing helps validate compatibility before the official release.

### Background

- **TypeScript 6.0** - Final JavaScript-based TypeScript (bridge release)
- **TypeScript 7.0** - Go-based compiler (`tsgo`) with ~10x performance improvement
- **`@typescript/native-preview`** - npm package providing `tsgo` for testing

### Available Scripts

```bash
# Type-check only with tsgo (no emit)
pnpm check:types:native

# Build with tsgo (compiles to esm/)
pnpm compile:native

# Clean build with tsgo (removes old output first)
pnpm compile:native:clean

# Run smoke tests against tsgo-compiled output
pnpm test:tsgo-build

# Full workflow: build with tsgo + run smoke tests
pnpm test:tsgo-build:full
```

### Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.tsgo.json` | Solution file listing packages for tsgo builds |
| `scripts/test-tsgo-build.mts` | Smoke test that validates compiled JS output |

### What Gets Tested

The `tsconfig.tsgo.json` solution file includes 17 packages. Excluded packages:

- **Astro sites** (`ccl-docs`, `dill-docs`, `repopo-docs`) - Use special `astro/tsconfigs/*` extends
- **Svelte apps** (`ccl-test-viewer`) - Different build toolchain

The smoke test validates 13 packages by importing compiled output and executing basic functions:

```
@tylerbu/fundamentals     - isSorted()
@tylerbu/fundamentals/set - addAll()
@tylerbu/cli-api          - CommandWithConfig class
lilconfig-loader-ts       - TypeScriptLoader class
xkcd2-api                 - getRandomComicId()
levee-client              - LeveeClient class
ccl-ts                    - parse()
rehype-footnotes          - plugin export
remark-lazy-links         - plugin export
remark-shift-headings     - plugin export
remark-task-table         - plugin export
sort-tsconfig             - sortTsconfigFile()
repopo                    - module loads
```

### Performance Comparison

Typical build times on this codebase:

| Compiler | Time | Speedup |
|----------|------|---------|
| `tsgo` | ~0.8s | **4.3x faster** |
| `tsc` | ~3.5s | baseline |

### Adding Packages to Shadow Testing

1. Add the package path to `tsconfig.tsgo.json`:
   ```json
   { "path": "./packages/new-package" }
   ```

2. Add a smoke test in `scripts/test-tsgo-build.mts`:
   ```typescript
   results.push(
     await testPackage(
       "new-package",
       "packages/new-package/esm/index.js",
       (mod: any) => {
         if (typeof mod.someExport !== "function") {
           throw new Error("someExport is not a function");
         }
       },
     ),
   );
   ```

3. Run tests to verify:
   ```bash
   pnpm compile:native && pnpm test:tsgo-build
   ```

### CI Integration

The `tsgo-validation` job in `.github/workflows/pr-build.yml` runs in parallel with the main build:

1. Builds all packages with `tsgo`
2. Runs smoke tests to validate the compiled output

This catches tsgo compatibility issues early, before TypeScript 7.0 is released.

### Troubleshooting

**"Cannot find module" errors during tsgo build:**
- Ensure the package is listed in `tsconfig.tsgo.json`
- Check that project references are correctly configured in the package's `tsconfig.json`
- Verify dependencies are installed (`pnpm install`)

**Smoke test failures:**
- Check the actual exports in `packages/<name>/esm/index.js`
- Update the test function to match actual export names
- Some packages may have different default exports

### Resources

- [TypeScript 6.0 Migration Guide](https://github.com/microsoft/TypeScript/issues/62508)
- [@typescript/native-preview on npm](https://www.npmjs.com/package/@typescript/native-preview)
- [Progress on TypeScript 7](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/)
