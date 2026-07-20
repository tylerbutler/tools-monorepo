# Deterministic Repopo Regex Matching

## Problem

`PolicyRunner` calls `RegExp.test()` directly for policy matches, global exclusions, and per-policy exclusions. Regular expressions with the global (`g`) or sticky (`y`) flag update `lastIndex`, so each result can depend on earlier paths.

## Design

Add one internal helper in `packages/repopo/src/runner.ts` for path matching. For each test, the helper:

1. Saves the regular expression's current `lastIndex`.
2. Sets `lastIndex` to `0`.
3. Tests the path.
4. Restores the saved value in a `finally` block.

All three runner match sites will use this helper. This preserves `g` and `y` support, makes each path test independent, and leaves caller-owned regular expression state unchanged. The change adds no public API or configuration surface.

## Alternatives

- Clone the regular expression before each test. This isolates state but allocates in the file-by-policy hot path.
- Reject `g` and `y` flags. This simplifies matching but breaks configurations that can work safely.
- Precompile cloned matchers in the runner. This avoids repeated allocation but adds mapping and synchronization complexity.

The reset-and-restore helper provides deterministic behavior with the smallest runtime and maintenance cost.

## Tests

Extend `packages/repopo/test/runner.test.ts` with regression tests that cover both `g` and `y` flags for:

- policy matching across multiple files;
- global exclusions across multiple files;
- per-policy exclusions across multiple files.

The tests will also confirm that matching restores the regular expression's original `lastIndex`.
