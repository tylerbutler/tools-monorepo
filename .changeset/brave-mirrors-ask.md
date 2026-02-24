---
"repopo": minor
---

Add experimental `check-native` command powered by a Rust core engine for significantly faster policy checking (up to 1.5x faster than the standard `check` command). The Rust engine handles file enumeration, pattern matching, and orchestration while delegating policy evaluation to a Node.js sidecar, so all existing configs and third-party policies work without changes.

Also adds a simplified `policy()` function for defining policies and new focused script policies (`RequiredScripts`, `ExactScripts`, `MutuallyExclusiveScripts`, `ConditionalScripts`, `ScriptContains`) that replace the monolithic `PackageScripts` policy with more granular, composable alternatives.
