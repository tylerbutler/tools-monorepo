---
"@tylerbu/sail": minor
---

Add pinned progress bar for build execution

Sail now displays a progress bar that stays pinned at the bottom of your terminal during builds, making it easy to track build progress at a glance. The progress bar shows a visual indicator, percentage complete, task count, and estimated time remaining (e.g., "Building [========] 50% 25/50 tasks | ETA: 2m 30s").

Task output continues to scroll normally above the progress bar, so you can still see detailed logs from each task while monitoring overall build progress. The progress bar automatically appears when running builds in interactive terminal sessions and respects the `--quiet` flag when you need silent output.
