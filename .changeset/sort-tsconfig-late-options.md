---
"sort-tsconfig": patch
---

Fix false sort violations for compiler options near the end of the sort order,
such as `skipLibCheck`. Duplicate entries in the sort order no longer cause
sorted files to fail checks or remain flagged after an automatic fix.
