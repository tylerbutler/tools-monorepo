---
"repopo": patch
---

Fix QuickJS config loading when policies import the public repopo API. Add the missing Effection `all` shim so configs can bundle the policy runner and run concurrent generator operations.

Support `file:` URL imports in QuickJS config bundles, including the generated benchmark configs.
