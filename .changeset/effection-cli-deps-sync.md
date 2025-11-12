---
"@tylerbu/cli": minor
---

Implement structured concurrency with Effection for package.json synchronization

Replaced Promise.all with Effection's structured concurrency in the deps:sync command's syncAllPackages() method. This ensures atomic updates across all packages in a workspace, with automatic cancellation if any package update fails.

Benefits:
- Atomic multi-package updates (all succeed or none are applied)
- Automatic cancellation of pending updates when one fails
- Consistent workspace state even on errors
- No partial package.json updates across the workspace
