---
name: add-oclif-command
description: Add a new OCLIF command to a CLI package with proper base class, flags, args, and post-creation steps
disable-model-invocation: true
---

## Add a New OCLIF Command

Guided workflow to add a command to an existing CLI package.

### Step 1: Gather Info

Ask the user for:
- **Target CLI package**: cli, dill-cli, repopo, or sort-tsconfig
- **Command name**: e.g., `status` or `git/status` (slash = topic nesting)
- **Description**: one-line summary
- **Base class**: `CommandWithConfig` (default) or `GitCommand` (for git operations) — both from `@tylerbu/cli-api`
- **Flags and args**: what inputs does the command need?

### Step 2: Create the Command File

Create `packages/<pkg>/src/commands/<name>.ts`:

```typescript
import { Args, Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";

export default class CommandName extends CommandWithConfig<typeof CommandName> {
	public static override readonly description = "Description here";

	public static override readonly flags = {
		// Add flags here
		...CommandWithConfig.flags,
	};

	public static override readonly args = {
		// Add args here
	};

	public override async run(): Promise<void> {
		const { args, flags } = this;
		// Implementation
	}
}
```

For git commands, use `GitCommand` instead — it provides `this.git` (simple-git instance).

### Step 3: Build and Verify

```bash
# Compile
pnpm nx run <pkg>:build:compile

# Test with dev binary
./packages/<pkg>/bin/dev.js <command> --help

# Regenerate manifest
pnpm nx run <pkg>:build:manifest

# Regenerate README
pnpm nx run <pkg>:build:readme
```

### Step 4: Update Snapshots (if applicable)

```bash
# Regenerate command snapshots
./packages/<pkg>/bin/dev.js snapshot:generate --filepath test/commands/__snapshots__/commands.json

# Verify snapshots match
./packages/<pkg>/bin/dev.js snapshot:compare --filepath test/commands/__snapshots__/commands.json
```

### Step 5: Final Checks

```bash
# Full build to ensure everything links
pnpm nx run <pkg>:build

# Run tests
pnpm nx run <pkg>:test

# Policy check
./packages/repopo/bin/dev.js check
```

### Conventions
- Use tabs for indentation
- Keep commands focused — one responsibility per command
- Use `this.log()` for stdout, `this.warn()` for warnings, `this.error()` for fatal errors (exits)
- Prefer flags over positional args for optional inputs
- Always spread `...BaseClass.flags` to inherit base flags
