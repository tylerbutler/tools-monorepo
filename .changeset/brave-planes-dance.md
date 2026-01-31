---
"repopo": minor
---

Make description required on PolicyDefinition and use object parameters for factory functions

BREAKING CHANGES:

- `PolicyDefinition.description` is now required (was optional)
- `makePolicyDefinition()` now takes an object argument: `{ name, description, match, handler, defaultConfig?, resolver? }`
- `definePackagePolicy()` now takes an object argument: `{ name, description, handler }`
- `defineFileHeaderPolicy()` now takes an object argument: `{ name, description, config }`

New exports:
- `makePolicyDefinition` function (previously internal)
- `PolicyDefinitionInput` type
- `DefinePackagePolicyArgs` interface
- `DefineFileHeaderPolicyArgs` interface

All built-in policies now include descriptions.
