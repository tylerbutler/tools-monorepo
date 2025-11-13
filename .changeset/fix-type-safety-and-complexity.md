---
"@tylerbu/cli-api": minor
---

Extract dependency sync functionality from cli to cli-api package for reusability

Created new dependency-sync module with comprehensive API for dependency synchronization:

**New Exports:**
- Types: `DependencyInfo`, `ProjectInfo`, `PackageJson`, `SyncResult`, `DependencyChange`, `DependencyType`, `UpdateVersionRangeOptions`, `UpdateVersionRangeResult`, `SyncPackageJsonOptions`, `SyncAllPackagesOptions`, `GetInstalledVersionsOptions`
- Functions: `getInstalledVersions`, `parsePnpmList`, `parseNpmList`, `parsePackageManagerList`, `updateVersionRange`, `syncDependencyGroup`, `syncPackageJson`, `syncAllPackages`, `isSyncSupported`, `shouldSkipVersion`, `isValidSemver`

**Features:**
- Intelligent version range updates (caret, tilde, exact, complex ranges)
- Support for pnpm and npm list parsing
- Workspace dependency filtering
- Package.json sync with dry-run and write modes
- Comprehensive test coverage (128 test cases)

**Implementation Quality:**
- Fixed TypeScript `exactOptionalPropertyTypes` compliance
- Reduced cognitive complexity with helper functions (`createSkippedResult`, `isComplexRange`)
- Proper TSDoc documentation with escaped special characters
- Handles edge cases: workspace protocol, special protocols, hyphen ranges, invalid semver
