---
"repopo": patch
---

Print manual fix guidance for unresolved policy failures in both `check` and
`check-native`, including failed auto-fix attempts. When a standalone resolver
fails without its own guidance, show the original handler's instructions.
Omit guidance after a successful fix.
