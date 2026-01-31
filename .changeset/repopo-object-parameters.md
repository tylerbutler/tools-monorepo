---
"repopo": major
---

Use object parameters for policy factory functions and Policy class

BREAKING CHANGES:

- `makePolicyDefinition()` now takes an object argument: `{ name, description, match, handler, defaultConfig?, resolver? }`
- `definePackagePolicy()` now takes an object argument: `{ name, description, handler }`
- `defineFileHeaderPolicy()` now takes an object argument: `{ name, description, config }`
- `Policy` class constructor now takes a `PolicyDefinition` object instead of positional arguments

This change makes it easier to add new optional properties in the future without breaking changes.

New exports:

- `makePolicyDefinition` function (previously internal)
- `PolicyDefinitionInput` type
- `DefinePackagePolicyArgs` interface
- `DefineFileHeaderPolicyArgs` interface
