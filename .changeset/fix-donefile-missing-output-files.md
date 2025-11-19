---
"@tylerbu/sail": patch
---

Fix donefile generation when output files don't exist

Donefile generation would fail during clean builds when output files don't exist yet (e.g., CopyfilesTask before copying). The LeafWithDoneFileTask.getDoneFileContent() method now gracefully handles missing files by returning a sentinel value "<missing>" instead of throwing ENOENT errors. This allows donefile generation to succeed even when output files haven't been created yet, while still tracking which files are expected.
