---
name: release-check
description: Validate release readiness - changesets, policy compliance, build, test, and dependency sync
disable-model-invocation: true
---

## Release Readiness Check

Run a comprehensive validation before merging to main or publishing.

### Checklist

Run each step and report results. Stop early if a critical failure is found.

1. **Check branch state**
   ```bash
   git status
   git log --oneline main..HEAD
   ```
   Verify: clean working tree, commits ahead of main

2. **Verify changesets exist for affected packages**
   ```bash
   ls .changeset/*.md 2>/dev/null
   pnpm nx affected --base=main -t build --dry-run
   ```
   Cross-reference: every affected non-private package should have a changeset entry.
   Packages in the changeset ignore list (dill-docs, repopo-docs) can be skipped.
   Verify bump types make sense (patch for fixes, minor for features, major for breaking).

3. **Policy compliance**
   ```bash
   ./packages/repopo/bin/dev.js check
   ```
   Must pass with zero violations.

4. **Dependency sync**
   ```bash
   pnpm syncpack list-mismatches
   ```
   Must have zero mismatches.

5. **Build all affected packages**
   ```bash
   pnpm nx affected -t build --base=main
   ```
   Must succeed with no errors.

6. **Run all affected tests**
   ```bash
   pnpm nx affected -t test --base=main
   ```
   Must pass with no failures.

7. **Format and lint check**
   ```bash
   pnpm nx affected -t check --base=main
   pnpm nx affected -t lint --base=main
   ```
   Must pass with no issues.

### Report Format

Summarize results:
- Total affected packages
- Changeset coverage (which packages have changesets, which are missing)
- Build/test/lint status per package
- Any warnings or issues found
- Final verdict: READY or NOT READY with reasons
