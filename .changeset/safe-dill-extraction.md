---
"dill-cli": patch
---

Reject tar and zip archives with entry paths that could write outside the extraction directory.
Validate all entry paths before writing extracted files, so an unsafe entry causes extraction to fail before any archive contents are written.
