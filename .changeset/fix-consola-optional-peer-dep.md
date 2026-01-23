---
"@tylerbu/cli-api": patch
---

Make consola peer dependency truly optional by removing its exports from the main entrypoint.

The consola logger functions are now only available via the dedicated `@tylerbu/cli-api/loggers/consola` entrypoint. This allows consumers who don't use the consola logger to avoid installing the consola peer dependency.
