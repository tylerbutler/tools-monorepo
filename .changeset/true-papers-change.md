---
"@tylerbu/sail": minor
"@tylerbu/sail-infrastructure": minor
---

Add file ignore filtering to config inference

Add support for ignoring files during config inference via the SAIL_IGNORE_FILES environment variable. This allows users to exclude specific repo-relative paths from being considered when sail automatically infers the workspace configuration.

Example usage:
```bash
SAIL_IGNORE_FILES="test/fixtures/**,temp/**" sail scan --infer
sail scan --infer --ignore-files "test/fixtures/**"
```
