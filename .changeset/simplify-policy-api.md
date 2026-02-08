---
"repopo": minor
---

Add new `policy()` function as simplified API for defining repository policies, replacing the more complex `makePolicy`/`makePolicyDefinition` workflow.

New features:
- `policy()` function with multiple overload signatures for defining policies concisely
- `PolicyShape` interface for object-literal policy definitions
- `ConfiguredPolicy` and `PolicyError` types for the new API surface
- Five new script-focused policies: `RequiredScripts`, `ExactScripts`, `MutuallyExclusiveScripts`, `ConditionalScripts`, and `ScriptContains`
- `isPolicyError` type guard and `convertLegacyResult`/`convertToPolicyFailure` conversion utilities

Deprecations (old APIs still work but are marked `@deprecated`):
- `makePolicy` → use `policy()` instead
- `makePolicyDefinition` → use `PolicyShape` object literals instead
- `PolicyFailure` → use `PolicyError` instead
- `PolicyInstance` → use `ConfiguredPolicy` instead
- `PolicyStandaloneResolver` → use `PolicyResolver` instead
- `isPolicyFailure` → use `isPolicyError` instead
