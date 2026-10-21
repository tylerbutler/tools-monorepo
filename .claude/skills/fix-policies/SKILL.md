---
name: fix-policies
description: Fix all repository policy violations
---
Run `./packages/repopo/bin/dev.js check --fix` to automatically fix policy violations.
Then run `pnpm syncpack:fix` to sync package versions.
Report what was fixed.