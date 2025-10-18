# Task Naming Principles for Nx/Turbo Overlays

## Executive Summary

This document establishes clear principles for distinguishing **orchestrator tasks** from **implementation tasks** in the FluidFramework Nx/Turbo overlay configurations. The goal is to create a structured, maintainable task hierarchy that prevents infinite loops and makes the build system easy to understand.

**Key Finding:** The infinite loop issue is solved by **location-based role assignment** - package scripts never call nx/turbo, only the task orchestrator configs do.

---

## Core Principles

### Principle 1: Three-Tier Task Hierarchy

```
┌─────────────────────────────────────────────────────┐
│ Tier 1: WORKFLOW ORCHESTRATORS (No colon)          │
│ Purpose: Coordinate complete user-facing workflows │
│ Examples: build, test, lint, check, clean, release │
│ Location: ROOT package.json + nx.json/turbo.jsonc  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ Tier 2: STAGE ORCHESTRATORS (Single colon)         │
│ Purpose: Group related tasks by category/purpose   │
│ Examples: build:compile, build:api, test:unit      │
│ Location: nx.json/turbo.jsonc only                 │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ Tier 3: TOOL EXECUTORS (Tool names)                │
│ Purpose: Run actual tools (tsc, eslint, jest)      │
│ Examples: tsc, esnext, eslint, jest, mocha         │
│ Location: PACKAGE package.json only                │
└─────────────────────────────────────────────────────┘
```

### Principle 2: Location Indicates Role

**The most important principle for preventing infinite loops:**

| Location | Role | Calls nx/turbo? | Contains |
|----------|------|-----------------|----------|
| **ROOT package.json scripts** | Workflow orchestrators | ✅ YES | `turbo run build` |
| **nx.json/turbo.jsonc tasks** | All three tiers | N/A (defines orchestration) | Task configs |
| **PACKAGE package.json scripts** | Tool executors only | ❌ NEVER | `tsc`, `eslint`, `jest` |

**Golden Rule:** Package-level scripts NEVER call nx or turbo. They only run actual tools.

### Principle 3: Naming Convention Supports Cognitive Model

**Simpler name = Higher level of abstraction**

- **Workflow Orchestrators:** Single word, no colons
  - `build` (builds everything)
  - `test` (runs all tests)
  - `lint` (runs all linters)
  - `check` (runs all checks)

- **Stage Orchestrators:** Semantic category names with single colon
  - `build:compile` (compiles to all output formats)
  - `build:api` (generates API documentation)
  - `test:unit` (runs unit tests in all formats)
  - `lint:strict` (runs strict linting rules)

- **Tool Executors:** Tool names (with or without colon for scoping)
  - `tsc` (TypeScript compiler → CommonJS)
  - `esnext` (TypeScript compiler → ESM)
  - `eslint` (ESLint tool)
  - `jest` (Jest test runner)

---

## Why This Solves the Infinite Loop Problem

### The Infinite Loop Mechanism

```
❌ BAD: Package script calls nx/turbo

User runs: nx run @pkg:build
→ Nx finds no explicit executor for "build" target
→ Nx falls back to package.json "build" script (npm preset behavior)
→ Script contains: "build": "nx run ${npm_package_name}:build"
→ This calls nx again
→ INFINITE LOOP!
```

### The Solution

```
✅ GOOD: Package scripts only run tools

User runs: nx run-many -t build (at root)
→ Turbo/Nx looks up "build" task in config
→ "build" depends on: build:compile, build:api, build:docs
→ "build:compile" depends on: tsc, esnext, copy-files
→ "tsc" is defined in config with inputs/outputs
→ Turbo/Nx runs: pnpm tsc (in packages that have it)
→ Package executes: "tsc": "tsc --project ./tsconfig.json"
→ No circular call to Turbo/Nx!
```

**Key Insight:** The orchestrator config (nx.json/turbo.jsonc) defines the task graph, but the actual execution always ends at a package script that runs a real tool, NOT another call to nx/turbo.

---

## Implementation Guide

### 1. ROOT package.json (Workflow Orchestrators)

```json
{
  "scripts": {
    // Workflow orchestrators - user-facing commands
    "build": "turbo run build",
    "test": "turbo run test:unit test:mocha test:jest",
    "lint": "turbo run lint",
    "clean": "turbo run clean",

    // Optional: Legacy compatibility
    "build:legacy": "fluid-build --task build",

    // NO implementation details here!
    // NO "build:compile": "turbo run build:compile"
  }
}
```

### 2. turbo.jsonc / nx.json (All Three Tiers)

```jsonc
{
  "tasks": {
    // =============================================
    // WORKFLOW ORCHESTRATORS (Tier 1)
    // =============================================
    // User-facing commands that coordinate complete workflows
    // Usage: pnpm build, turbo run build

    "build": {
      "dependsOn": [
        "^build",              // Wait for dependencies
        "check:format",        // Stage: formatting checks
        "build:compile",       // Stage: compilation
        "build:api",          // Stage: API docs
        "build:docs"          // Stage: documentation
      ],
      "outputs": []           // No direct outputs
    },

    "test": {
      "dependsOn": ["test:unit", "test:mocha", "test:jest"],
      "outputs": []
    },

    // =============================================
    // STAGE ORCHESTRATORS (Tier 2)
    // =============================================
    // Group related tasks by category/purpose
    // Not directly called by users - internal coordination

    "build:compile": {
      "dependsOn": [
        "tsc",              // Executor: CommonJS compilation
        "esnext",           // Executor: ESM compilation
        "copy-files"        // Executor: Copy assets
      ],
      "outputs": ["dist/**", "lib/**", "*.tsbuildinfo"]
    },

    "test:unit": {
      "dependsOn": ["test:mocha", "test:jest"],
      "outputs": []
    },

    // =============================================
    // TOOL EXECUTORS (Tier 3)
    // =============================================
    // Direct tool invocations defined in package scripts
    // Turbo/Nx wraps these for caching and parallelization

    "tsc": {
      "dependsOn": ["^tsc", "build:genver"],
      "inputs": [
        "$TURBO_DEFAULT$",
        "!**/*.md",
        "!**/*.test.ts"
      ],
      "outputs": ["dist/**", "*.tsbuildinfo"]
    },

    "eslint": {
      "dependsOn": ["^tsc"],
      "inputs": ["src/**/*.ts", ".eslintrc.cjs"],
      "outputs": []
    }
  }
}
```

### 3. PACKAGE package.json (Tool Executors Only)

```json
{
  "name": "@fluidframework/some-package",
  "scripts": {
    // Tool executors - actual tool commands
    "tsc": "tsc --project ./tsconfig.json",
    "esnext": "tsc --project ./tsconfig.esnext.json",
    "eslint": "eslint src/ --config .eslintrc.cjs",
    "jest": "jest --config jest.config.js",
    "mocha": "mocha dist/test/**/*.spec.js",
    "copy-files": "copyfiles -u 1 \"src/**/*.json\" dist/",

    // NO orchestrators here!
    // NO "build": "nx run ${npm_package_name}:build"
    // NO "build:compile": "nx run ${npm_package_name}:build:compile"
  }
}
```

---

## Comparison with tools-monorepo Pattern

### tools-monorepo (Simpler, Two-Tier)

```
Tier 1 (No colon): build, test, check, release
Tier 2 (Colon): build:compile, test:unit, check:format
```

**Works for tools-monorepo because:**
- Simpler build pipeline
- Less deep task hierarchies
- Each package type has a linear pipeline

### FluidFramework (Complex, Three-Tier)

```
Tier 1 (No colon): build, test, lint
Tier 2 (Colon): build:compile, build:api, test:unit
Tier 3 (Tool names): tsc, esnext, eslint, jest
```

**Required for FluidFramework because:**
- Complex multi-format builds (CJS, ESM, typings, API docs)
- Multiple test frameworks (Jest, Mocha CJS, Mocha ESM)
- Deep orchestration hierarchies
- `build:compile` itself coordinates `tsc`, `esnext`, `copy-files`

**Hybrid Pattern:** Maintains tools-monorepo spirit (orchestrators are simpler) while accommodating Fluid's complexity.

---

## Concrete Examples

### Example 1: Full Build Workflow

```bash
# User command
cd FluidFramework
pnpm build

# Execution flow
ROOT package.json: "build": "turbo run build"
  ↓
turbo.jsonc: "build" task
  depends on: [check:format, build:compile, build:api, build:docs]
  ↓
turbo.jsonc: "build:compile" task
  depends on: [tsc, esnext, copy-files]
  ↓
turbo.jsonc: "tsc" task
  inputs: src/**, outputs: dist/**
  ↓
turbo runs: pnpm tsc (in packages with "tsc" script)
  ↓
PACKAGE package.json: "tsc": "tsc --project ./tsconfig.json"
  ↓
TypeScript compiler runs
  ✓ No circular call to turbo!
```

### Example 2: Developer Working in Package

```bash
# Developer in a specific package
cd packages/framework/foo
pnpm tsc

# Execution flow
PACKAGE package.json: "tsc": "tsc --project ./tsconfig.json"
  ↓
TypeScript compiler runs directly
  ✓ No turbo involved
  ✓ Fast, direct tool execution
```

### Example 3: Cached Build

```bash
# User command
pnpm build

# Turbo cache check
turbo checks inputs for "build" task
  → No changes detected
turbo checks inputs for "build:compile" task
  → No changes detected
turbo checks inputs for "tsc" task
  → No changes detected
turbo restores from cache
  ✓ Instant completion
  ✓ No unnecessary rebuilds
```

---

## Recommended Actions

### Immediate (Current Sprint)

1. **Update template comments** in `nx.json` and `turbo.jsonc`:
   ```jsonc
   // =============================================
   // WORKFLOW ORCHESTRATORS (Tier 1)
   // =============================================
   // Coordinate complete user-facing workflows
   // Called by users via: pnpm build, nx run-many -t build
   // Never called directly by package scripts
   ```

2. **Document in package-json.ts** why NX_WRAPPER_SCRIPTS is empty:
   ```typescript
   // Nx wrapper scripts - INTENTIONALLY EMPTY
   //
   // WHY: Package scripts must NEVER call nx/turbo to prevent infinite loops
   //
   // TASK HIERARCHY:
   // Tier 1 (Workflow): build, test, lint (ROOT package.json only)
   // Tier 2 (Stage): build:compile, test:unit (nx.json coordination)
   // Tier 3 (Executor): tsc, eslint, jest (PACKAGE scripts only)
   //
   // LOCATION-BASED ROLES:
   // - ROOT scripts: Call nx/turbo for orchestration
   // - nx.json tasks: Define task graph and dependencies
   // - PACKAGE scripts: Run actual tools, NEVER call nx/turbo
   ```

3. **Add principles document** to template directory:
   ```bash
   touch src/lib/fluid-repo-overlay/templates/TASK_PRINCIPLES.md
   ```

### Short-term (Next Sprint)

1. **Reorganize nx.json sections** to match three-tier structure
2. **Reorganize turbo.jsonc sections** with clearer tier separation
3. **Add inline comments** for complex tasks explaining their tier and purpose
4. **Create examples** in Fluid overlay documentation

### Long-term (Future)

1. **Consider automated validation** that package scripts never call nx/turbo
2. **Tooling to verify** task hierarchy follows principles
3. **Documentation generator** that creates task dependency graphs
4. **Linting rule** to enforce location-based role assignment

---

## Decision Log

### Why Not: Prefix-Based Pattern (`workflow:build`, `stage:compile`, `tool:tsc`)

**Pros:** Very explicit, easy to grep
**Cons:** Verbose, not idiomatic, breaks compatibility

**Decision:** Rejected - hybrid pattern is more intuitive

### Why Not: Strict DEV.md Pattern (no colon vs colon only)

**Pros:** Simple, clear for tools-monorepo
**Cons:** Doesn't accommodate Fluid's multi-tier orchestration

**Decision:** Rejected - Fluid needs three tiers, not two

### Why: Hybrid Pattern with Location-Based Roles

**Pros:**
- Accommodates complexity
- Prevents infinite loops via location rules
- Maintains intuitive naming (simpler = higher level)
- Compatible with existing patterns

**Cons:**
- Requires documentation
- "build:compile" is orchestrator but has colon (slight inconsistency)

**Decision:** Accepted - best balance of clarity and practicality

---

## FAQ

### Q: Why can't package scripts call nx/turbo?

**A:** Because Nx's npm preset auto-infers targets from package.json scripts. If a script calls nx, and nx finds no explicit executor, it falls back to running the script, creating an infinite loop.

### Q: How do developers run builds in a specific package?

**A:** They run the tool directly: `pnpm tsc` or `pnpm eslint`. This is faster than going through nx/turbo anyway.

### Q: How does caching work if packages don't call nx/turbo?

**A:** Nx/turbo configs define the task graph. When you run `nx run-many -t build`, nx orchestrates and caches based on the configs, then executes package scripts as the final step.

### Q: Why is "build:compile" an orchestrator if it has a colon?

**A:** Fluid's build is complex enough to need three tiers. "build:compile" coordinates multiple compilation formats (tsc, esnext). The colon indicates it's not a top-level workflow, but it still orchestrates.

### Q: Can I add new task tiers?

**A:** Avoid it. Three tiers (workflow → stage → executor) is sufficient for Fluid's complexity. More tiers reduce clarity.

---

## References

- [tools-monorepo DEV.md](../../DEV.md) - Original two-tier pattern
- [tools-monorepo turbo.jsonc](../../turbo.jsonc) - Reference implementation
- [Test Results](../../test-fixtures/TEST_RESULTS.md) - Infinite loop analysis
- [Nx targetDefaults](https://nx.dev/reference/nx-json#target-defaults) - Nx documentation
- [Turbo tasks](https://turbo.build/repo/docs/reference/configuration#tasks) - Turbo documentation

---

## Document Metadata

- **Created:** 2025-10-18
- **Author:** Analysis via Claude Code
- **Status:** Recommendation
- **Next Review:** After implementing immediate actions
