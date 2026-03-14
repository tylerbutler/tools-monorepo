---
name: oclif-command-guide
description: Reference for OCLIF command patterns, base classes, and conventions used in CLI packages
user-invocable: false
---

## OCLIF Command Patterns

Reference for working with OCLIF commands in this monorepo's CLI packages (cli, dill-cli, repopo, sort-tsconfig).

### Base Classes (from @tylerbu/cli-api)

- **`CommandWithConfig`** — For commands that load config files. Provides `--config` flag and config resolution.
- **`GitCommand`** — For git operations. Provides `this.git` (simple-git instance) and git-aware error handling. Extends `CommandWithConfig`.

Always extend one of these base classes, not raw OCLIF `Command`.

### Command File Structure

```typescript
import { Args, Flags } from "@oclif/core";
import { GitCommand } from "@tylerbu/cli-api";

export default class MyCommand extends GitCommand<typeof MyCommand> {
	public static override readonly description = "What this command does";

	public static override readonly flags = {
		"dry-run": Flags.boolean({ description: "Preview without making changes" }),
		...GitCommand.flags, // Inherit base flags
	};

	public static override readonly args = {
		target: Args.string({ required: true, description: "Target branch" }),
	};

	public override async run(): Promise<void> {
		const { args, flags } = this;
		// this.git is available from GitCommand
		// this.log(), this.warn(), this.error() for output
	}
}
```

### File Placement

Commands go in `src/commands/`. Directory structure defines topics:
- `src/commands/download.ts` → `tbu download`
- `src/commands/git/squish.ts` → `tbu git squish`
- `src/commands/git/merge-train/preview.ts` → `tbu git merge-train preview`

### After Adding/Modifying Commands

Always run these steps after changing commands:

1. `pnpm nx run <pkg>:build:compile` — Compile TypeScript
2. `pnpm nx run <pkg>:build:manifest` — Regenerate `oclif.manifest.json`
3. `pnpm nx run <pkg>:build:readme` — Regenerate README command docs
4. `./packages/<pkg>/bin/dev.js snapshot:generate` — Update test snapshots (if applicable)

Or just run `pnpm nx run <pkg>:build` to execute all of these via orchestration.

### Dev vs Prod Mode

- **Dev:** `./bin/dev.js <command>` — runs from TypeScript source, no compile needed
- **Prod:** `./bin/run.js <command>` — runs from compiled `esm/`

### Plugins

CLI packages declare plugins in `package.json` → `oclif.plugins`. Common ones:
- `@oclif/plugin-help`, `@oclif/plugin-autocomplete`, `@oclif/plugin-commands`
- `@oclif/plugin-command-snapshot` — for snapshot testing

### Testing

- OCLIF CLIs use **command snapshot testing** via `@oclif/plugin-command-snapshot`
- Snapshots in `test/commands/__snapshots__/commands.json`
- Generate: `./bin/dev.js snapshot:generate`
- Compare: `./bin/dev.js snapshot:compare` (runs during `test:snapshots`)
