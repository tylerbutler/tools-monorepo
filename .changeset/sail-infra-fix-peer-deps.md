---
"@tylerbu/sail-infrastructure": patch
---

Fix `iterateDependencies` bug where `peerDependencies` were never iterated. The third loop incorrectly read `devDependencies` again (yielding them as `depKind: "peer"`) instead of reading `peerDependencies`.
