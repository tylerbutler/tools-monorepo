---
"@tylerbu/cli-api": minor
---

Add package manager detection utilities

- Export `detectPackageManager()` - Detects package manager from lockfile in a directory
- Export `detectFromLockfilePath()` - Detects package manager from a specific lockfile path
- Export `detectAllPackageManagers()` - Detects all package managers in a directory
- Export `getPackageManagerInfo()` - Gets metadata for a package manager
- Export `getAllLockfiles()` - Gets all supported lockfile names
- Export `PACKAGE_MANAGERS` constant with metadata for npm, pnpm, yarn, and bun
- Export `PackageManager` and `PackageManagerInfo` types
