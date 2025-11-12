---
"repopo": minor
---

New built-in policies

Added three new policies for repository quality and safety:
- **LicenseFileExists**: Ensures a LICENSE file exists in the repository root (essential for open source projects)
- **NoLargeBinaryFiles**: Prevents large binary files from being committed (default 10MB max, suggests Git LFS for large assets)
- **RequiredGitignorePatterns**: Validates .gitignore contains required patterns to prevent committing sensitive files, dependencies, and build artifacts (auto-fixable)
