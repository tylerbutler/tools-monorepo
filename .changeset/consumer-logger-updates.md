---
"@tylerbu/cli": patch
"@tylerbu/sail": patch
"sort-tsconfig": patch
"repopo": patch
---

Update to use new cli-api logger API

Updates commands to use the new logger API from @tylerbu/cli-api:
- Replace `errorLog()` calls with `logError()`
- Use standalone `logIndent()` function where needed
