---
"@tylerbu/cli-api": minor
"@tylerbu/cli": patch
"@tylerbu/sail": patch
"@tylerbu/gleam-docs-md": patch
"dill-cli": patch
"sort-tsconfig": patch
---

Send built-in logging diagnostics to stderr and keep explicit `log()` output on stdout. Quiet mode retains warnings and errors, suppresses informational messages, and takes precedence over verbose mode when both flags are supplied. Fix missing verbose output in the Consola loggers.

Commands can override the protected `suppressLogging` getter, logging methods, or logger implementation to customize these defaults.

If you capture diagnostic output in scripts, use stderr redirection (`2>`) or combine stdout and stderr (`2>&1`).
