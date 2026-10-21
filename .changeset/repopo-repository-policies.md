---
"repopo": minor
---

Add repository-scoped policies that run once after file policies in both `check` and `check-native`. Repository handlers receive the full eligible Git file inventory, including during stdin runs, and can return multiple findings with optional file locations. Repository fixes run serially and can modify files outside the stdin selection.

BREAKING CHANGE: `LicenseFileExists` and `SharedDependencyVersions` now use repository scope. Configuration through `policy()` or `makePolicy()` is unchanged. Direct handler callers must pass `files` instead of `file` and handle `true` or an array of findings. Programmatic runner callers must supply the full inventory separately when checking a partial file selection. Runner results can now include repository findings; check `scope` before using file-specific result fields.
