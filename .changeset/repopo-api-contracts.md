---
"repopo": minor
---

Expose the programmatic API through `repopo/api` without OCLIF's CLI `run` export.
Add `definePackagePolicy` alongside the existing `generatePackagePolicy` alias.

Accept `PolicyResolver` functions on file policies while preserving legacy
resolvers and the `PolicyFixResult` shape of runner resolution results.
Treat a resolver result without `fixed: true` as an unsuccessful fix.

Apply `defaultConfig` when callers omit configuration in `makePolicy()`.
Explicit configuration takes precedence over `settings.config`, followed by
`defaultConfig`.

Install `type-fest` as a production dependency because public declarations
reference it. Update configuration examples to use `RepopoConfig` and `policy()`.
