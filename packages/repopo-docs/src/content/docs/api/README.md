---
editUrl: false
next: false
prev: false
title: "repopo"
---

# repopo API

Use `repopo/api` for policy authoring and programmatic execution without OCLIF.
The root `repopo` entry point adds the CLI `run` export. `repopo/policies`
exports built-in definitions and their configuration types.

Write object definitions with `satisfies FilePolicyDefinition<C>` or
`satisfies RepositoryPolicyDefinition<C>`, then configure them with
`makePolicy(definition, { config, exclude, instanceId })`.
Both scopes return `PolicyResult = readonly PolicyFinding[]`; `[]` passes.
Use `runPolicies(options)` for a Promise or `PolicyRunner(options).run()` for
an Effection operation. Repository policies require explicit full inventory.

This reference includes all three entry points. Checked-in API Extractor reports:

TypeDoc labels the entry modules by their source filenames: `index` is
`repopo`, `api` is `repopo/api`, and `policies` is `repopo/policies`.
Re-export lists link to the same canonical declarations; they do not introduce
additional import paths.

- [repopo](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/api-docs/repopo.api.md)
- [repopo/api](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/api-docs/repopo-api.api.md)
- [repopo/policies](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/api-docs/repopo-policies.api.md)

Read the [migration guide](https://repopo.tylerbutler.com/usage/migration/)
before updating existing policies.

## Modules

- [api](/api/api/readme/)
- [index](/api/index/readme/)
- [policies](/api/policies/readme/)
