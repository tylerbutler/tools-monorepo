---
name: pr-changeset-check
description: Check if PR has appropriate changesets before creating
user-invocable: false
---

Before creating a PR, verify changesets exist for modified packages.

1. Check which packages changed: `git diff main --stat | grep packages/`
2. Check existing changesets: `ls .changeset/*.md`
3. If packages changed but no changeset exists, remind user to create one
4. Skip packages in ignore list: ccl-docs, dill-docs, repopo-docs
