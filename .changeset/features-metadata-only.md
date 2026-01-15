---
"ccl-test-runner-ts": patch
---

Features are now metadata-only and no longer affect test filtering. Previously, tests would be skipped if the implementation didn't declare matching features. Now tests run regardless of feature declarations, as features are only used for reporting purposes.
