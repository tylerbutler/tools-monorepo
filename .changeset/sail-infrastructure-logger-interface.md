---
"@tylerbu/sail-infrastructure": minor
---

feat!: update Logger interface for consistency with cli-api

**Breaking changes:**
- `errorLog` renamed to `error` in Logger interface
- Added `success` method to Logger interface
- Added optional `formatError` method to Logger interface

This aligns the sail-infrastructure Logger interface with the cli-api Logger interface for consistency across packages.
