---
"repopo": patch
---

Improve read-only check performance with up to 8 concurrent files and shared parsing of package.json, Cargo.toml, and gleam.toml manifests. Each policy receives an independent copy of parsed data.

Use `--concurrency` with `check` or `check-native`, or the `PolicyRunnerOptions.concurrency` option, to set the file limit. Use 1 for custom policies that require sequential file processing. Fixes remain sequential and read fresh data.
