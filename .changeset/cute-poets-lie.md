---
"repopo": minor
---

Configuration changes

The configuration for repopo has changed a lot in this release. The goal is to improve the typing of config and make it
easier to configure things in one place.

Policies are now declared as `PolicyDefinition`, and are then combined with a configuration (if the policy has
configuration) using `makePolicy` to form a `PolicyInstance`, which is the primary type used internally.

Generators now generate `PolicyDefinition`s, and can be used directly inline with `makePolicy`.
