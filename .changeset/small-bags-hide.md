---
"@tylerbu/cli-api": minor
---

New context and git-related command interfaces

The new `CommandWithContext<CONTEXT>` interface can be implemented by commands that use a context object.

The `RequiresGit` interface can be implemented by commands that require a Git repository in order to run.
