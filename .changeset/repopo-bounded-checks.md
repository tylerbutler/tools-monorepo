---
"repopo": patch
---

Speed up read-only checks by processing up to eight files at a time and avoiding repeated parsing of `package.json`, `Cargo.toml`, and `gleam.toml` files.
Each policy still receives an independent copy of the parsed data.

Set the file limit with `--concurrency` on `repopo check` or `repopo check-native`, or with `PolicyRunnerOptions.concurrency` in the programmatic API.
Use `--concurrency 1` for custom policies that must process files one at a time.
Automatic fixes still run one at a time and read fresh file contents.
