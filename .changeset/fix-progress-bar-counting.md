---
"@tylerbu/sail": patch
---

Fix progress bar task counting to match displayed task numbers

The progress bar now correctly includes execution-time skips (tasks skipped during execution via cache hits or recheck) in its count, matching the task numbers displayed in the output. Previously, the progress bar would lag behind the actual task numbers because it only counted built tasks, not skipped tasks.
