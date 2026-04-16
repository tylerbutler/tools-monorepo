---
"repopo": minor
---

Extract `PolicyRunner` class from `CheckPolicy` command to fix SRP violation. The new class encapsulates all policy execution logic (file iteration, exclusion checking, policy matching, handler execution, resolution attempts) and returns structured `PolicyRunResults` instead of producing side effects. `PolicyRunner` has no OCLIF dependencies and can be used programmatically. The `CheckPolicy` command is now a thin CLI wrapper handling only flag parsing, file collection, and result formatting.
