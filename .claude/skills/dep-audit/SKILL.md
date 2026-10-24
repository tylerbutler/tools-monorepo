---
name: dep-audit
description: Audit workspace dependencies for version mismatches, unused packages, and sync issues across all packages
disable-model-invocation: true
---

## Dependency Audit

Comprehensive audit of workspace dependencies across all packages.

### Step 1: Version Sync Check

```bash
pnpm syncpack list-mismatches
```

Report any version mismatches between packages. These should be fixed with `pnpm syncpack:fix`.

### Step 2: Workspace Protocol Check

Verify all internal dependencies use `workspace:^`:

```bash
cd /home/tylerbu/code/claude-workspace/tools-monorepo
grep -r '"@tylerbu/' packages/*/package.json | grep -v 'workspace:' | grep -v node_modules || echo "All internal deps use workspace protocol"
```

### Step 3: Dependency Duplication

Check for packages that appear in both `dependencies` and `devDependencies`:

```bash
for pkg in packages/*/package.json; do
  node -e "
    const p = require('./$pkg');
    const deps = Object.keys(p.dependencies || {});
    const devDeps = Object.keys(p.devDependencies || {});
    const dupes = deps.filter(d => devDeps.includes(d));
    if (dupes.length) console.log('$pkg:', dupes.join(', '));
  " 2>/dev/null
done
```

### Step 4: Outdated Dependencies

```bash
pnpm outdated --recursive 2>/dev/null | head -80
```

Flag major version bumps that may require migration work.

### Step 5: Unused Dependencies (spot check)

For key packages, check if declared dependencies are actually imported:

```bash
# Pick the top 3-5 packages by dependency count and check for unused deps
for pkg in cli repopo fundamentals cli-api; do
  echo "=== packages/$pkg ==="
  node -e "
    const p = require('./packages/$pkg/package.json');
    const deps = Object.keys(p.dependencies || {});
    console.log('  dependencies:', deps.length, '-', deps.join(', '));
  " 2>/dev/null
done
```

Then grep the `src/` directories to see if each dependency is actually imported.

### Step 6: Policy Compliance

```bash
./packages/repopo/bin/dev.js check --quiet
```

### Report Format

Summarize findings:
- **Version mismatches**: count and list
- **Protocol issues**: any non-`workspace:^` internal deps
- **Duplicates**: deps in both dependencies and devDependencies
- **Outdated**: major/minor/patch counts
- **Unused**: suspected unused dependencies
- **Policy**: pass/fail
- **Recommended fixes**: specific commands to run
