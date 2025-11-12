---
"dill-cli": minor
---

Implement structured concurrency with Effection for file operations

Replaced Promise.all with Effection's structured concurrency in writeTarFiles() and writeZipFiles() functions. This provides automatic cancellation of pending operations when one fails, preventing partial file extractions and unhandled promise rejections.

Benefits:
- Automatic cancellation when any file operation fails
- No orphaned file writes or partial extractions
- Guaranteed resource cleanup on success or failure
- Atomic extraction semantics (all files succeed or none are written)
