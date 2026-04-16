# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@tylerbu/sail-infrastructure` is a TypeScript library that provides infrastructure for organizing npm packages into **workspaces** and **release groups** within a monorepo. This package is derived from `@fluidframework/build-infrastructure` and serves as the foundation for build tooling.

**Key Concepts:**
- **Build Project**: Top-level container organizing packages into workspaces and release groups
- **Workspace**: Physical layout of packages, managed by package manager (pnpm/npm/yarn)
- **Release Group**: Logical grouping of packages versioned and released together
- **Package**: Individual npm package that must belong to both a workspace and release group

**Hierarchy**: `IBuildProject` → `IWorkspace` → `IReleaseGroup` → `IPackage`

## Commands

### Development

```bash
# Build (compile TypeScript)
pnpm build

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run single test file
pnpm vitest run src/test/<name>.test.ts

# Format code
pnpm format

# Lint
pnpm lint
pnpm lint:fix

# Clean build artifacts
pnpm clean
```

### CLI Tool

The package includes a CLI for inspecting build projects:

```bash
# Development mode (uses TypeScript source)
./bin/dev.mjs list

# Production mode (uses compiled output)
./bin/run.mjs list --path /path/to/project
```

### Running from Root

Since this is part of a monorepo, you can also run commands via Nx from the root:

```bash
pnpm nx run sail-infrastructure:build
pnpm nx run sail-infrastructure:test
```

## Architecture

### Core Types Hierarchy

```
IBuildProject (buildProject.ts)
├── workspaces: Map<WorkspaceName, IWorkspace>
├── releaseGroups: Map<ReleaseGroupName, IReleaseGroup>
└── packages: Map<PackageName, IPackage>

IWorkspace (workspace.ts)
├── packages: IPackage[]
└── releaseGroups: Map<ReleaseGroupName, IReleaseGroup>

IReleaseGroup (releaseGroup.ts)
├── packages: IPackage[]
├── workspace: IWorkspace
└── releaseGroupDependencies: IReleaseGroup[]

IPackage (package.ts)
├── packageJson: PackageJson
├── workspace: IWorkspace
└── releaseGroup: IReleaseGroup
```

### Key Modules

- **`buildProject.ts`**: Core `BuildProject` class, `loadBuildProject()` function
- **`config.ts`**: Configuration loading via cosmiconfig, supports v1 (legacy) and v2 formats
- **`workspace.ts`**: Workspace implementation using `@manypkg/get-packages`
- **`releaseGroup.ts`**: Release group implementation
- **`package.ts`**: `PackageBase` abstract class for custom package types
- **`filter.ts`**: Package selection and filtering APIs (by workspace, release group, scope, etc.)
- **`git.ts`**: Git operations using SimpleGit (changed files, merge base, etc.)
- **`packageManagers.ts`**: Package manager detection and abstraction
- **`versions.ts`**: Version management utilities (`setVersion()`)
- **`types.ts`**: Core type definitions and type guards (`isIPackage`, `isIReleaseGroup`)

### Configuration

Build project configuration is loaded from:
1. `buildProject.config.cjs` (or .mjs)
2. `fluidBuild.config.cjs` with `buildProject` property
3. Legacy `repoPackages` format (v1, back-compat only)

Configuration uses cosmiconfig and supports multiple config file formats.

**Example v2 configuration structure:**
```javascript
{
  version: 2,
  buildProject: {
    workspaces: {
      "workspace-name": {
        directory: "./path",
        releaseGroups: {
          "release-group-name": {
            include: ["@scope", "package-name"],
            rootPackageName: "optional-root-package"
          }
        }
      }
    }
  }
}
```

### Package Selection & Filtering

The `filter.ts` module provides powerful APIs for selecting subsets of packages:

- **Selection Criteria**: Select by workspace, release group, directory, or changed files
- **Filter Options**: Filter by scope, private/public, custom predicates
- **Git Integration**: Select packages with changes since a branch/ref
- **Glob Support**: Use micromatch globs for workspace/release group names

**Key Functions:**
- `selectAndFilterPackages()`: Combined selection and filtering
- `filterPackages()`: Apply filters to package list
- `AllPackagesSelectionCriteria`: Pre-defined selector for all packages
- `EmptySelectionCriteria`: Pre-defined empty selector

### Git Integration

Git functionality is loosely coupled via `IBuildProject.getGitRepository()`:
- Returns `SimpleGit` instance if in Git repo
- Throws `NotInGitRepository` error if not in Git context
- Prevents code from blindly assuming Git presence

## Testing

Tests are located in `src/test/` and use Vitest:

- **Unit tests**: `*.test.ts` files for each module
- **Test data**: `src/test/data/testRepo/` contains a fully functional build project for testing
- **Test utilities**: `src/test/init.ts` provides test helpers

The test repo demonstrates:
- Multiple workspaces (`main`, `second`)
- Multiple release groups per workspace
- Package dependency relationships
- Workspace configuration files (pnpm-workspace.yaml, package.json)

**Running specific tests:**
```bash
pnpm vitest run src/test/buildProject.test.ts
pnpm vitest run src/test/filter.test.ts
pnpm vitest run src/test/git.test.ts
```

## Build Output

- **Source**: `src/` (TypeScript)
- **Compiled**: `esm/` (ES modules)
- **Docs**: `docs/` (TypeDoc markdown output)
- **API Report**: `api-report/` (API Extractor output)

## Important Notes

- This package uses **ES modules** (type: "module")
- Tests are in `src/test/` and are excluded from the build output
- The package exports only the `esm/` directory (excluding `esm/test`)
- Configuration is strictly typed with v1/v2 versions
- All workspaces must have at least one release group
- Release groups cannot span multiple workspaces
- Build projects can be rooted anywhere (not just Git repo root)
