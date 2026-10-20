---
"repopo": patch
---

Fix policy checks and automatic fixes:

- Run same-file fixers in configuration order to prevent lost edits.
- Validate configured header text, avoid duplicate headers, and apply HTML headers to HTML files.
- Replace verbatim package.json arrays instead of appending entries.
- Check Cargo workspace members selected by globs and honor workspace exclusions.
- Preserve Git filenames that contain Unicode, tabs, or newlines in both engines.
- Preserve legacy fix results and apply default policies when a native configuration omits `policies`.
