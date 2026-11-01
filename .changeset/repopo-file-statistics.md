---
"repopo": patch
---

Correct the reported file counts so each file that passes global exclusions is counted once, regardless of how many policies run on it.
Ignore empty entries in file lists from Git and `--stdin`, so blank records do not become file paths.
