# Package Reorganization Plan

## Objective
Reorganize monorepo packages into type-based folders to simplify Turborepo configuration management.

## Final Structure
```
packages/
├── libraries/    # All importable code
├── tools/        # Executable CLI applications
└── sites/        # All web deployments
```

## Design Decisions

### Key Principles
1. **Type-based organization** - Organize by build pipeline, not scope or maturity
2. **3 categories** - libraries, tools, sites (parsers go in libraries)
3. **Deployment-based grouping** - Anything deployed to a URL goes in sites/
4. **Simple naming** - Short, clear folder names (not cli-tools, just tools)

### Questions Resolved
1. ✅ Web apps and docs sites together? **Yes** - all deployed to URLs → sites/
2. ✅ Granularity? **3 categories** - not too coarse, not too fine
3. ✅ Folder naming? **libraries, tools, sites** - simple and clear
4. ✅ Turbo config strategy? **Workspace-specific turbo.json** - one per category
5. ✅ Other shared configs? **Just turbo.json for now** - can add more later
6. ✅ Timing? **Merge PRs first** - then reorganize everything at once

## Package Mapping

### Libraries (7 packages)
Compile to ESM, may have API docs, consumed by other packages

- `cli-api` - Shared CLI infrastructure
- `fluid-svelte` - Fluid Framework Svelte wrapper (from PR #202)
- `fundamentals` - Zero-dependency utilities
- `levee-client` - HTTP client
- `lilconfig-loader-ts` - Config loader
- `tree-sitter-ccl` - Tree-sitter grammar (language infrastructure)
- `xkcd2-api` - XKCD API wrapper

### Tools (5 packages)
OCLIF-based CLI applications with manifest/readme generation

- `cli` - @tylerbu/cli personal CLI
- `dill` - Download/extract utility CLI
- `fluid-svelte-cli` - Fluid Svelte CLI (from PR #202)
- `repopo` - Repository policy enforcement CLI
- `sort-tsconfig` - TSConfig sorting CLI

### Sites (4 packages)
Astro/SvelteKit web applications deployed to URLs

- `ccl-docs` - CCL documentation site (from PR #257)
- `ccl-test-viewer` - SvelteKit/Tauri test viewer app
- `dill-docs` - Dill documentation site (from PR #257)
- `repopo-docs` - Repopo documentation site (from PR #257)

## Implementation Steps

### Prerequisites
**IMPORTANT:** Merge these PRs first before starting reorganization:
- [ ] PR #257 - Adds ccl-docs, dill-docs, repopo-docs
- [ ] PR #202 / #220 - Adds fluid-svelte, fluid-svelte-cli

### Step 1: Create Folder Structure
```bash
mkdir -p packages/{libraries,tools,sites}
```

### Step 2: Move Packages with git mv
Preserves git history for all files.

```bash
# Libraries (7 packages)
git mv packages/cli-api packages/libraries/
git mv packages/fundamentals packages/libraries/
git mv packages/levee-client packages/libraries/
git mv packages/lilconfig-loader-ts packages/libraries/
git mv packages/tree-sitter-ccl packages/libraries/
git mv packages/xkcd2-api packages/libraries/
git mv packages/fluid-svelte packages/libraries/

# Tools (5 packages)
git mv packages/cli packages/tools/
git mv packages/dill packages/tools/
git mv packages/repopo packages/tools/
git mv packages/sort-tsconfig packages/tools/
git mv packages/fluid-svelte-cli packages/tools/

# Sites (4 packages)
git mv packages/ccl-docs packages/sites/
git mv packages/ccl-test-viewer packages/sites/
git mv packages/dill-docs packages/sites/
git mv packages/repopo-docs packages/sites/
```

### Step 3: Update pnpm-workspace.yaml
```yaml
packages:
  - packages/libraries/*
  - packages/tools/*
  - packages/sites/*
  - config
```

### Step 4: Create Workspace-Specific Turbo Configs

#### packages/libraries/turbo.json
```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["^build", "compile", "api", "docs"]
    },
    "api": {
      "dependsOn": ["^compile", "compile"],
      "inputs": ["esm/**/*.d.ts", "api-extractor*.json", "package.json"],
      "outputs": [
        "api-docs/**",
        "_temp/api-extractor/**",
        "esm/tsdoc-metadata.json"
      ]
    },
    "docs": {
      "dependsOn": ["^compile", "compile", "api"],
      "inputs": [
        "esm/**",
        "src/**",
        "typedoc.*",
        "_temp/api-extractor/**",
        "README.md"
      ],
      "outputs": ["docs/**", "dist/**", ".astro/**", "README.md"]
    }
  }
}
```

#### packages/tools/turbo.json
```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": [
        "^build",
        "compile",
        "api",
        "build:test",
        "manifest",
        "readme",
        "generate"
      ]
    },
    "manifest": {
      "dependsOn": ["compile"],
      "inputs": ["package.json", "src/**"],
      "outputs": ["oclif.manifest.json"]
    },
    "readme": {
      "dependsOn": ["compile", "manifest"],
      "inputs": ["package.json", "src/**"],
      "outputs": ["README.md", "docs/**"]
    },
    "build:test": {
      "dependsOn": ["compile"],
      "inputs": ["test/**/*.ts", "test/tsconfig.json"],
      "outputs": []
    },
    "generate": {
      "dependsOn": ["^compile", "compile"],
      "inputs": ["esm/**", "test/**"],
      "outputs": ["test/commands/__snapshots__/**"]
    }
  }
}
```

#### packages/sites/turbo.json
```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["astro.config.mjs", "src/**", "public/**"],
      "outputs": [
        "dist/**",
        ".astro/**",
        "!.next/cache/**",
        ".next/**"
      ]
    },
    "docs": {
      "dependsOn": ["^build"],
      "inputs": ["astro.config.mjs", "src/**", "public/**"],
      "outputs": ["dist/**", ".astro/**"]
    }
  }
}
```

### Step 5: Simplify Root turbo.json

Remove these tasks (now handled by workspace configs):
- `build-steps:lib`
- `build-steps:cli`
- `build-steps:astro`

The workspace-specific turbo.json files now handle the type-specific build orchestration.

### Step 6: Verify Everything Works
```bash
# Reinstall dependencies with new workspace structure
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run checks
pnpm check
```

### Step 7: Commit Changes
Single atomic commit:

```bash
git add -A
git commit -m "refactor: reorganize packages by type (libraries, tools, sites)

- Move packages into type-based folders for clearer organization
- Add workspace-specific turbo.json configs per package type
- Simplify root turbo.json by removing build-steps:* tasks
- Update pnpm-workspace.yaml for new structure

BREAKING CHANGE: Package directory structure has changed. If you have
local scripts or tools that reference package paths, update them to use
the new packages/{libraries,tools,sites}/* structure."
```

## Benefits

### Immediate
- ✅ Clearer package organization by build type
- ✅ Simplified Turborepo configuration (4 files vs 1 massive file)
- ✅ Self-documenting structure (folder indicates build pipeline)
- ✅ Easier to add new packages (clear category placement)
- ✅ Preserves git history (using git mv)

### Long-term
- ✅ Foundation for future type-specific configs (tsconfig, biome, etc.)
- ✅ Easier to understand dependencies between package types
- ✅ Better support for monorepo tooling that understands workspace structure
- ✅ Clearer mental model for contributors

## Maintenance Impact

With only 4 turbo config files to maintain:
- Changes to common tasks → update root turbo.json
- Changes to library build pipeline → update packages/libraries/turbo.json
- Changes to CLI build pipeline → update packages/tools/turbo.json
- Changes to site build pipeline → update packages/sites/turbo.json

Much more maintainable than previous approach with build-steps scattered across root config.

## Future Enhancements (Optional)

These can be added later if duplication becomes problematic:

1. **Shared tsconfig per type**
   - `packages/libraries/tsconfig.base.json`
   - `packages/tools/tsconfig.base.json`

2. **Type-specific package.json scripts templates**
   - Standardize common scripts across packages of same type

3. **Shared biome configs**
   - Different linting rules per package type if needed

4. **Automated package generation**
   - Scripts to scaffold new packages in correct location with correct config
