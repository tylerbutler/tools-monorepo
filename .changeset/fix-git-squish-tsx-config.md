---
"@tylerbu/cli-api": patch
"@tylerbu/cli": patch
---

Fix git squish command configuration loading

- **cli-api**: Add `requiresConfig` property to `CommandWithConfig` to allow commands to skip config loading
- **cli-api**: Set `GitCommand.requiresConfig = false` by default since git commands typically don't need config files

This fixes the "Failure to load config" error that occurred when running git commands in directories without a config file.
