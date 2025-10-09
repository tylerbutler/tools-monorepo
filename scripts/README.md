# Scripts

Utility scripts for the tools monorepo.

## sync-lockfile-versions.ts

Syncs `package.json` dependency versions to match what's installed in the lockfile.

### Purpose

This script addresses a Dependabot bug where `versioning-strategy: increase` doesn't update `package.json` for dependencies with caret ranges (`^`) that already satisfy the new version.

**Issue**: [dependabot/dependabot-core#9020](https://github.com/dependabot/dependabot-core/issues/9020)

When Dependabot updates a dependency like `debug` from `^4.4.1` to `4.4.3` in the lockfile, it should also update `package.json` to `^4.4.3`, but it doesn't because `^4.4.1` already allows `4.4.3`.

### Features

- ✅ **Multi-package-manager support**: Works with pnpm and npm (Yarn support coming soon)
- ✅ **Monorepo aware**: Automatically syncs all workspace packages
- ✅ **Range preservation**: Maintains your version range style (`^`, `~`, exact)
- ✅ **Safe by default**: Runs in dry-run mode by default
- ✅ **Workspace protocol safe**: Skips `workspace:` dependencies

### Usage

```bash
# Preview changes (default - dry-run mode)
pnpm deps:sync

# Apply changes (requires explicit --execute flag)
pnpm deps:sync --execute

# Verbose output
pnpm deps:sync --verbose

# Direct script execution
./node_modules/.bin/tsx scripts/sync-lockfile-versions.ts
./node_modules/.bin/tsx scripts/sync-lockfile-versions.ts --execute
```

### How It Works

1. Detects which package manager you're using (pnpm/npm)
2. Runs `<pm> list --json` to get installed versions from lockfile
3. Compares installed versions with `package.json` ranges
4. Updates `package.json` files while preserving range types:
   - `^4.4.1` → `^4.4.3` (caret preserved)
   - `~2.0.0` → `~2.1.0` (tilde preserved)
   - `1.2.3` → `1.2.4` (exact version preserved)
   - `workspace:^` → unchanged (workspace protocol preserved)

### Integration with Workflows

This script can be run automatically in your Dependabot PR workflow to sync package.json versions:

```yaml
# .github/workflows/dependabot-auto-update.yml
- name: Sync package.json to lockfile versions
  run: pnpm deps:sync --execute

- name: Commit changes
  run: |
    git add "**/package.json"
    git diff --staged --quiet || git commit -m "chore: sync package.json to lockfile versions"
    git push
```

### Package Manager Support

- ✅ **pnpm**: Fully supported
- ✅ **npm**: Fully supported
- ⚠️ **Yarn**: Not yet implemented - contributions welcome!

### Future Plans

This POC script may be extracted into a standalone npm package if it proves useful.
