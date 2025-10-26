---
"@tylerbu/cli": minor
---

Add `tbu deps sync` command to sync package.json versions with lockfile

Introduces a new `tbu deps sync` command that automatically updates package.json dependency versions to match what's installed in your lockfile. This is particularly useful when working with Dependabot, which sometimes updates lockfiles without updating package.json for dependencies with caret ranges (^) that already satisfy the new version.

The command supports npm and pnpm package managers, with detection for yarn and bun (full support coming soon). Run `tbu deps sync` to preview changes in dry-run mode, or `tbu deps sync --execute` to apply updates. Additional flags include `--lockfile` to specify a custom lockfile path, `--cwd` to run in a specific directory, and `--quiet` for minimal output suitable for CI environments.
