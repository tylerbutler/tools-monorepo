# CLAUDE.md - @tylerbu/cli

Package-specific guidance for the personal CLI tool built with OCLIF.

## Package Overview

Personal CLI tool (`tbu`) with git utilities and file download capabilities. Built on OCLIF framework with custom base classes from `@tylerbu/cli-api`.

**Binary:** `tbu`
**Dev Mode:** `./bin/dev.js` (uses TypeScript source directly)
**Prod Mode:** `./bin/run.js` (uses compiled JavaScript)

## Command Structure

Commands follow OCLIF conventions with nested structure:

```
src/commands/
├── download.ts          # Re-exports from dill-cli
└── git/                 # Git utilities
    ├── squish.ts       # Squash-merge workflow
    └── merge-train/    # Merge train commands
        └── preview.ts
```

**Base Classes (from @tylerbu/cli-api):**
- `CommandWithConfig` - Config file support
- `GitCommand` - Git operations (includes `this.git` simple-git instance)

## Development Commands

```bash
# Run in dev mode (no compilation needed)
./bin/dev.js <command>

# Example: test squish command
./bin/dev.js git squish main

# Generate command snapshots
./bin/dev.js snapshot:generate --filepath test/commands/__snapshots__/commands.json

# Compare snapshots (test)
./bin/dev.js snapshot:compare --filepath test/commands/__snapshots__/commands.json

# Update OCLIF manifest
pnpm manifest

# Update README from command help
pnpm readme
```

## OCLIF-Specific Patterns

### Command Definition

```typescript
import { Args, Flags } from "@oclif/core";
import { GitCommand } from "@tylerbu/cli-api";

export default class MyCommand extends GitCommand<typeof MyCommand> {
  public static override readonly description = "Command description";

  public static override readonly flags = {
    "dry-run": Flags.boolean({ description: "..." }),
    ...GitCommand.flags,  // Inherit base flags
  };

  public static override readonly args = {
    target: Args.string({ required: true }),
  };

  public override async run(): Promise<void> {
    // this.git is available (from GitCommand)
    // this.flags and this.args are type-safe
    // this.info(), this.warn(), this.error() for output
  }
}
```

### Base Class Features

**GitCommand provides:**
- `this.git` - simple-git instance (already initialized)
- Git-aware error handling
- `redirectLogToTrace` - control log verbosity

**CommandWithConfig provides:**
- Config file loading from multiple locations
- `--config` flag support

### Command Topics

Commands are organized into topics via directory structure:
- `git` topic - All commands in `src/commands/git/`
- Topic metadata in `package.json` → `oclif.topics`

## Testing Strategy

**Command Snapshot Testing:**
- Uses `@oclif/plugin-command-snapshot`
- Snapshots stored in `test/commands/__snapshots__/commands.json`
- Captures command structure, flags, args, aliases
- Run `pnpm test` to validate against snapshots

**No Vitest tests** - This package uses OCLIF's snapshot testing exclusively.

## OCLIF Plugins

This CLI includes these plugins (defined in `package.json` → `oclif.plugins`):

- `@oclif/plugin-autocomplete` - Shell completion
- `@oclif/plugin-commands` - List all commands
- `@oclif/plugin-help` - Help system
- `@oclif/plugin-not-found` - Suggest commands
- `@oclif/plugin-search` - Search commands
- `@oclif/plugin-version` - Version info
- `@oclif/plugin-warn-if-update-available` - Update notifications
- `@oclif/plugin-which` - Show plugin for command

## Build Artifacts

```
esm/                    # Compiled TypeScript
oclif.manifest.json     # Command manifest (auto-generated)
README.md              # Auto-generated from command help
```

**Never edit manually:**
- `oclif.manifest.json` - Run `pnpm manifest`
- README.md command sections - Run `pnpm readme`

## Common Workflows

### Adding a New Command

1. Create `src/commands/<name>.ts` or `src/commands/<topic>/<name>.ts`
2. Extend `CommandWithConfig` or `GitCommand`
3. Define `description`, `flags`, `args`, and `run()`
4. Run `pnpm compile` to build
5. Test with `./bin/dev.js <command>`
6. Update manifest: `pnpm manifest`
7. Update README: `pnpm readme`
8. Update snapshots: `./bin/dev.js snapshot:generate`

### Adding a Flag or Arg

1. Update `flags` or `args` static properties
2. TypeScript ensures type safety via `this.flags` and `this.args`
3. Re-run manifest and readme generation
4. Update snapshots

### Debugging Commands

```bash
# Run with debug output
DEBUG=* ./bin/dev.js <command>

# OCLIF debug mode
DEBUG=oclif:* ./bin/dev.js <command>

# Command-specific logging
this.log("debug info")      # stdout
this.warn("warning")        # stderr (yellow)
this.error("error")         # stderr + exit (red)
this.info("info")          # stdout (if using cli-api base)
```

## Integration with dill-cli

The `download` command re-exports from `dill-cli` workspace package:

```typescript
export { default } from "dill-cli/command";
```

This pattern allows sharing command implementations across CLI tools.

## Package-Specific Constraints

- Commands must extend base classes from `@tylerbu/cli-api`
- All commands must be TypeScript (`.ts` files)
- Manifest and README are auto-generated - edit source, not artifacts
- Snapshot tests must pass before committing
- Dev mode (`./bin/dev.js`) is preferred during development
