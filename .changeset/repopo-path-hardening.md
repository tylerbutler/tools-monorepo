---
"repopo": patch
---

Reject file paths that resolve outside the repository root in `repopo check`, including paths supplied with `--stdin`.
Apply the same validation to package and file-header policy helpers, so these checks and fixes reject paths such as `../outside.txt`.
