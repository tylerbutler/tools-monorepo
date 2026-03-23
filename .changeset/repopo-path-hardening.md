---
"repopo": patch
---

Harden file path handling to prevent policy reads/writes outside the repository root.

This adds centralized safe path resolution for repo-relative file access, validates incoming file paths from `check --stdin`, and applies root-bound resolution in package and file-header policy definers.

Also adds regression tests covering traversal/path-escape rejection to prevent future regressions.
