---
"repopo": minor
---

Separate policy configuration from instance options.

BREAKING CHANGE: The second argument to `policy()` is now configuration. Replace
`policy(definition, { exclude: patterns })` with
`policy(definition, undefined, { exclude: patterns })`. Pass `instanceId` in the
third argument as well. Use `undefined` for configuration to retain defaults.

Exclusion `RegExp` values now retain their flags in both CLI engines. A
case-sensitive expression such as `/^README/` no longer excludes `readme.md`.
Add the `i` flag if you need case-insensitive matching. String exclusions remain
case-insensitive regular expressions.
