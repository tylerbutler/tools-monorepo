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
  - **Special case:** Conventional npm scripts (`start`, `test`) remain at this tier even if occasionally used as executors

- **Stage Orchestrators:** Semantic category names with single colon
  - `build:compile` (compiles to all output formats)
  - `build:api` (generates API documentation)
  - `test:unit` (runs unit tests in all formats)
  - `test:mocha` (coordinates mocha test execution across formats)

- **Tool Executors:** Two naming patterns (simplified from 4)
  - **Pattern A - Direct executors:** `tsc`, `eslint`, `jest`, `esnext`, `coverage` (tool names or semantic operations)
    - Single-word: `tsc`, `jest`, `esnext`, `coverage`
    - Multi-word semantic: `generate-version`, `api-reports-current` (dash-separated)
    - Semantic variants: `esnext-experimental`, `tsc-test-cjs` (dash-separated for different purposes)
  - **Pattern C - Tool variants:** `tsc:watch`, `jest:verbose` (tool + mode/flag with colon separator)

### Principle 4: Strict Classification Rules

**Zero exceptions approach for architectural consistency:**

- **>90% threshold strictly enforced:** Executor (>90% executor instances) or orchestrator (>90% orchestrator instances)
- **Mixed classification handled uniformly:** <90% either way defaults to orchestrator (safer, prevents infinite loops)
- **No conventional name exceptions:** Even `start` and `test` must follow classification rules
- **No semantic category pattern:** Pattern D eliminated - all executors use Pattern A or C
- **Pattern families maintain consistency:** Related tasks follow consistent naming (e.g., Jest family: `jest`, `jest:verbose`)

---

## Decision Framework for Task Classification (Strict Rules)

When classifying or renaming a task, follow this simplified decision tree:

### Step 1: Analyze Classification Percentage

```
What percentage of instances are orchestrators vs executors?

├─ >90% Orchestrator → Orchestrator classification
│   ├─ Top-level workflow? → Tier 1 (no colon): build, test, lint
│   └─ Stage coordination? → Tier 2 (single colon): build:compile, test:unit
│
├─ >90% Executor → Executor classification → Continue to Step 2
│
└─ <90% either way (MIXED) → Default to orchestrator (safer)
    Examples: start (85.7% executor), test:stress (71.4% executor)
    Rationale: Package scripts never call nx/turbo, so orchestrator is safer
```

### Step 2: Determine Executor Naming Pattern

```
What best describes this executor's implementation?

├─ Pattern A: Direct Executor or Semantic Operation
│   Question: Is this a tool name or semantic operation?
│   Examples:
│     - Direct tool: tsc, eslint, jest, copyfiles
│     - Semantic operation: esnext, coverage, generate-version
│     - Semantic variant: api-reports-current, esnext-experimental, tsc-test-cjs
│   Naming:
│     - {tool} (single word)
│     - {semantic-operation} (single word or dash-separated multi-word)
│     - {semantic-base}-{variant} (dash for different purposes/configurations)
│   Decision: "Is this >90% executor and NOT a mode variant of a tool?"
│
│   Dash Usage in Pattern A:
│     - Multi-word semantic names: generate-version, api-reports-current
│     - Semantic variants (different purposes): esnext-experimental, tsc-test-cjs
│     - NOT for tool modes (use Pattern C instead)
│
└─ Pattern C: Tool Variant
    Question: Is this a variant (mode/flag) of an existing tool?
    Examples: tsc:watch, jest:verbose
    Naming: {tool}:{mode}
    Decision: "Does this use the same base tool with different flags/modes?"

    Colon Usage in Pattern C:
      - Tool with mode flag: tsc:watch (tsc --watch)
      - Tool with mode flag: jest:verbose (jest --verbose)
      - Separates tool name from mode/flag
```

### Step 2.5: Dash vs Colon Decision

**When to use DASH (Pattern A):**
- Multi-word semantic operation names: `generate-version`, `api-reports-current`
- Semantic variants with different purposes: `esnext-experimental` (different entry point), `tsc-test-cjs` (different file set)
- The variant represents a DIFFERENT PURPOSE or CONFIGURATION, not just a flag

**When to use COLON (Pattern C):**
- Tool with mode/flag: `tsc:watch`, `jest:verbose`
- The variant is the SAME TOOL with a different MODE (just adding a flag)

**Examples:**
- `esnext-experimental` ✓ (dash) - Different entry point configuration = different purpose
- `jest:verbose` ✓ (colon) - Same jest tool with --verbose flag = mode change
- `api-reports-current` ✓ (dash) - Different API level configuration = different purpose
- `tsc:watch` ✓ (colon) - Same tsc tool with --watch flag = mode change

### Step 3: Pattern Family Consistency Check

```
Verify related tasks follow consistent patterns:

TypeScript family:
├─ tsc (Pattern A: Direct executor)
├─ esnext (Pattern A: Semantic executor - ESM compilation)
└─ tsc:watch (Pattern C: Tool variant - watch mode)

Jest family:
├─ jest (Pattern A: Direct executor)
├─ jest:verbose (Pattern C: Tool variant - verbose mode)
└─ jest:coverage (Pattern C: Tool variant - coverage mode)

Coverage family:
└─ coverage (Pattern A: Semantic executor - testing with coverage)
    Note: NOT test:coverage - no category prefix needed
```

### Simplified Decision Logic

**Total decision paths: 3** (down from 5)
**Total patterns: 2** (down from 4)
**Lines of logic: ~40** (down from 92, 57% reduction)

```yaml
classification:
  step_1: "Calculate executor percentage"
  step_2_if_gt_90: "Executor → Choose Pattern A or C"
  step_2_if_lt_90: "Mixed → Default to orchestrator"

executor_pattern:
  question: "Is this a variant of an existing tool?"
  yes: "Pattern C ({tool}:{mode})"
  no: "Pattern A ({tool} or {operation})"
```

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

### Framework Design Decisions

#### Why Not: Prefix-Based Pattern (`workflow:build`, `stage:compile`, `tool:tsc`)

**Pros:** Very explicit, easy to grep
**Cons:** Verbose, not idiomatic, breaks compatibility

**Decision:** Rejected - hybrid pattern is more intuitive

#### Why Not: Strict DEV.md Pattern (no colon vs colon only)

**Pros:** Simple, clear for tools-monorepo
**Cons:** Doesn't accommodate Fluid's multi-tier orchestration

**Decision:** Rejected - Fluid needs three tiers, not two

#### Why: Hybrid Pattern with Location-Based Roles

**Pros:**
- Accommodates complexity
- Prevents infinite loops via location rules
- Maintains intuitive naming (simpler = higher level)
- Compatible with existing patterns

**Cons:**
- Requires documentation
- Some orchestrators have colons (stage orchestrators)

**Decision:** Accepted - best balance of clarity and practicality

### Classification Decisions (Applied to FluidFramework)

Based on analysis of 4,904 script instances across 165 packages:

#### Decision 1: `start` (36 executor, 6 orchestrator - 85.7% executor)
**Classification:** Special case - keep as Tier 1 workflow orchestrator
**Rationale:** Conventional npm script name overrides strict classification
**Action:** No rename

#### Decision 2: `test` (5 executor, 116 orchestrator - 95.9% orchestrator)
**Classification:** Tier 1 workflow orchestrator (already correct)
**Rationale:** Simple packages can run tests directly; doesn't violate principles
**Action:** No rename

#### Decision 3: `test:coverage` (66 executor, 3 orchestrator - 95.7% executor)
**Strict Classification:** Pattern A - Semantic executor (Pattern D eliminated)
**Rationale:** 95.7% > 90% executor threshold; Pattern D eliminated in strict rules
**Previous Justification (Rejected):** "Semantic category for test-related scoping"
**Strict Rules Analysis:** No different from `esnext` - both are semantic executors where packages use different tools
**Action:** **Rename to `coverage`** (remove `test:` prefix for strict compliance)

#### Decision 4: `test:jest:verbose` (29 executor, 2 orchestrator - 93.5% executor)
**Classification:** Pattern C - Tool variant executor
**Rationale:** Redundant `test:` prefix; should follow `jest:verbose` pattern
**Action:** **Rename to `jest:verbose`** (remove `test:` prefix)

#### Decision 5: `test:stress` (5 executor, 2 orchestrator - 71.4% executor)
**Strict Classification:** Mixed (71.4% < 90% threshold) → defaults to orchestrator
**Rationale:** Below 90% threshold, not a special exception
**Action:** No rename (classification is mixed, keeps current name)

#### Decision 6: `tsc:watch` (2 executor, 0 orchestrator, 8 hybrid - 80% hybrid)
**Classification:** Pattern C - Tool variant executor (mixed but valid pattern)
**Rationale:** Hybrid classification acceptable; fundamentally tsc with --watch flag
**Action:** No rename

#### Decision 7: `build:esnext` (153 executor, 1 orchestrator - 99.4% executor)
**Strict Classification:** Pattern A - Semantic executor (Pattern B merged into A)
**Rationale:** Parallel compilation target - Pattern B/A distinction eliminated
**Action:** **Rename to `esnext`** (remove `build:` prefix)

#### Decision 8: `start` (36 executor, 6 orchestrator - 85.7% executor)
**Strict Classification:** Mixed (85.7% < 90% threshold) → defaults to orchestrator
**Previous Justification (Rejected):** "Conventional name exception"
**Strict Rules Analysis:** No exceptions - classification is mixed, defaults to orchestrator
**Action:** No rename (not because of convention, but because it's mixed classification)

#### Decision 9: `test` (5 executor, 116 orchestrator - 95.9% orchestrator)
**Classification:** Tier 1 workflow orchestrator (already correct)
**Rationale:** 95.9% > 90% orchestrator threshold
**Action:** No rename

### Rename Summary (Strict Rules)

**Tasks requiring rename:**
1. `build:esnext` → `esnext` (153 instances)
2. `test:jest:verbose` → `jest:verbose` (29 instances)
3. `test:coverage` → `coverage` (69 instances) **NEW - Strict rules**

**Total impact:** 251 package instances

**Tasks remaining unchanged:**
- `start` - Mixed classification (85.7% executor, <90% threshold)
- `test` - Correctly classified orchestrator (95.9%)
- `test:stress` - Mixed classification (71.4% executor, <90% threshold)
- `tsc:watch` - Tool variant (Pattern C)
- All other correctly classified tasks

**Pattern simplification achieved:**
- Pattern B eliminated (merged into Pattern A)
- Pattern D eliminated (test:coverage becomes Pattern A)
- Total patterns: 2 (down from 4, 50% reduction)

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

## Pattern Evolution Policy

To prevent classification drift and ensure consistent task naming over time, follow this evolution policy:

### Monitoring and Review

```yaml
review_frequency:
  schedule: "Every 6-12 months (each major version cycle)"
  trigger_events:
    - "Any task shows >20% classification change since last review"
    - "New task patterns emerge across >10 packages"
    - "Developer confusion about task classification increases"

monitoring_process:
  automated_checks:
    - "Run classification analysis on all tasks"
    - "Compare against baseline from last review"
    - "Flag tasks approaching threshold boundaries (85-95% range)"

  manual_review:
    - "Architecture team reviews flagged tasks"
    - "Evaluate impact of potential renames"
    - "Plan migration if needed"
```

### Evolution Thresholds

```yaml
mixed_to_executor:
  condition: "Task crosses 90% executor threshold"
  example: "test:stress grows from 7 to 50 instances, becomes 95% executor"
  action: "Rename from 'test:stress' to 'stress' in next major version"
  timing: "Bundle with other breaking changes to reduce migration frequency"

mixed_to_orchestrator:
  condition: "Task crosses 90% orchestrator threshold"
  example: "Custom task becomes widely used orchestrator"
  action: "Keep current name if it follows orchestrator patterns"
  timing: "Document classification change, no rename needed"

pattern_drift:
  condition: "Executor pattern changes (e.g., becomes tool variant)"
  example: "coverage task spawns jest:coverage, vitest:coverage variants"
  action: "Evaluate if base task should remain or consolidate into variants"
  timing: "Next major version"
```

### Migration Strategy

```yaml
bundling_policy:
  max_renames_per_release: 5
  rationale: "Limit developer disruption per release"
  prioritization:
    - "Tasks crossing 95% threshold (clear classification)"
    - "Tasks with highest instance counts (broader impact)"
    - "Tasks creating naming inconsistencies"

communication_protocol:
  advance_notice: "2 weeks minimum before rename"
  channels:
    - "Release notes with migration guide"
    - "Team communication (Slack/Discord/email)"
    - "Documentation updates"
  content:
    - "Before/after examples"
    - "Automated migration script (if available)"
    - "Support channel for questions"

rollback_criteria:
  triggers:
    - "Build failures affecting >10% of packages"
    - ">20 developer support tickets within 48 hours"
    - "Critical production issues related to rename"
  process:
    - "Immediate rollback via git revert"
    - "Root cause analysis"
    - "Revised migration plan if rename is still needed"
```

### Example Evolution Scenario

```yaml
scenario: "test:stress grows from 7 to 50 instances"

year_1_baseline:
  instances: 7
  classification: "Mixed (71.4% executor)"
  action: "No rename (below threshold)"

year_2_growth:
  instances: 25
  classification: "85% executor (approaching threshold)"
  action: "Flag for monitoring in next review"

year_3_threshold_crossed:
  instances: 50
  classification: "95% executor (exceeds threshold)"
  action: "Plan rename to 'stress' for next major version"

migration_execution:
  version: "v3.0.0 (major version)"
  bundled_with: ["other-rename-1", "other-rename-2"]
  communication: "2 weeks advance notice + migration guide"
  validation: "Test fixture → subset → full rollout"
```

### Preventing Future Exceptions

```yaml
new_task_guidelines:
  before_adding:
    - "Check if similar tasks exist"
    - "Follow established pattern families"
    - "Estimate likely classification (>90% executor or orchestrator?)"

  initial_classification:
    - "Start with correct pattern from day one"
    - "Don't add as 'temporary exception' with plan to rename later"
    - "If uncertain, default to orchestrator (safer)"

exception_policy:
  strict_rule: "Zero exceptions to classification rules"
  mixed_handling: "<90% threshold tasks default to orchestrator (not an exception)"
  pattern_choice: "Only 2 patterns (A and C) - no special cases"
```

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
- **Updated:** 2025-10-19
- **Author:** Analysis via Claude Code
- **Status:** Active - Applied to FluidFramework classification
- **Next Review:** After implementing renames in fluid task-rename command
