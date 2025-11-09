---
"ccl-docs": patch
"@tylerbu/ccl-test-viewer": patch
"@tylerbu/cli-api": patch
"dill-cli": patch
"dill-docs": patch
"@tylerbu/levee-client": patch
"@tylerbu/lilconfig-loader-ts": patch
"repopo-docs": patch
"sort-tsconfig": patch
---

fix(nx): eliminate duplicate task execution via synthetic targets

Fixed duplicate task execution across 11 packages by implementing Nx synthetic targets instead of duplicate npm scripts. Tasks now run exactly once via Nx's dependency graph orchestration.

**Build duplications fixed**: repopo-docs, ccl-docs, dill-docs, ccl-test-viewer, cli-api, levee-client, lilconfig-loader-ts, sort-tsconfig

**Test duplications fixed**: cli-api, dill-cli, levee-client, sort-tsconfig

All orchestration now uses `nx.targets` synthetic targets in package.json, delegating to `nx.json` targetDefaults for dependency management.
