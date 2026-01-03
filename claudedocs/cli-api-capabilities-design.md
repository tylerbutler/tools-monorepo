# CLI-API Capability System Design

**Status**: Design Proposal
**Date**: 2025-11-12
**Purpose**: Move from inheritance-based to composition-based architecture for OCLIF commands

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Implementation Details](#implementation-details)
4. [Patterns for Shared Functionality](#patterns-for-shared-functionality)
5. [Usage Examples](#usage-examples)
6. [Migration Strategy](#migration-strategy)

---

## Overview

### Current Architecture (Inheritance-Based)

```typescript
Command (OCLIF)
  ↓
BaseCommand (logging, flags)
  ↓
CommandWithConfig (config loading)
  ↓
GitCommand (git integration)
```

**Problems:**
- Rigid coupling: GitCommand must extend CommandWithConfig
- Cannot mix capabilities independently (e.g., git without config)
- Diamond inheritance problems with multiple capabilities
- Hard to test individual capabilities
- Unclear dependencies

### Proposed Architecture (Composition-Based)

```typescript
class MyCommand extends BaseCommand {
  // Compose capabilities as needed
  private config = useConfig<MyConfig>(this);
  private git = useGit(this);

  async run() {
    const { config } = await this.config.get();
    const { git } = await this.git.get();
  }
}
```

**Benefits:**
- ✅ Mix and match capabilities freely
- ✅ Clear, explicit dependencies
- ✅ Easy to test (mock individual capabilities)
- ✅ Lazy initialization (only load what's used)
- ✅ Extensible (add new capabilities without touching base classes)

---

## Core Architecture

### 1. Capability Interface

The foundation of the system - defines what a capability is:

```typescript
/**
 * A capability that can be composed into commands.
 * Capabilities are initialized once and provide functionality to commands.
 *
 * @template TCommand - The command type this capability is attached to
 * @template TResult - The type returned by the capability's API
 */
export interface Capability<TCommand extends BaseCommand<any>, TResult = any> {
	/**
	 * Initialize the capability. Called automatically when accessed for the first time.
	 * @param command - The command instance this capability is attached to
	 */
	initialize(command: TCommand): Promise<TResult> | TResult;

	/**
	 * Optional cleanup when command completes.
	 */
	cleanup?(): Promise<void> | void;
}
```

### 2. CapabilityHolder - Lazy Initialization

Manages capability lifecycle and ensures single initialization:

```typescript
/**
 * Lazy-initialized capability holder.
 * Ensures capabilities are only initialized once, when first accessed.
 */
export class CapabilityHolder<TCommand extends BaseCommand<any>, TResult> {
	private _initialized = false;
	private _result: TResult | undefined;
	private readonly capability: Capability<TCommand, TResult>;
	private readonly command: TCommand;

	constructor(command: TCommand, capability: Capability<TCommand, TResult>) {
		this.command = command;
		this.capability = capability;
	}

	/**
	 * Get the capability, initializing it if needed.
	 * Subsequent calls return cached result.
	 */
	async get(): Promise<TResult> {
		if (!this._initialized) {
			this._result = await this.capability.initialize(this.command);
			this._initialized = true;
		}
		return this._result as TResult;
	}

	/**
	 * Check if capability has been initialized.
	 */
	get isInitialized(): boolean {
		return this._initialized;
	}

	/**
	 * Cleanup the capability.
	 */
	async cleanup(): Promise<void> {
		if (this._initialized && this.capability.cleanup) {
			await this.capability.cleanup();
		}
	}
}
```

**Key Features:**
- **Lazy**: Only initializes when `get()` is called
- **Cached**: Returns same result on subsequent calls
- **Type-safe**: Full TypeScript inference
- **Lifecycle**: Optional cleanup support

---

## Implementation Details

### Config Capability

Replaces `CommandWithConfig` base class:

```typescript
/**
 * Configuration options for config capability.
 */
export interface ConfigCapabilityOptions<TConfig> {
	/**
	 * Default config to use if none is found.
	 */
	defaultConfig?: TConfig;

	/**
	 * Whether config is required. If true and no config is found, command will exit.
	 * @default true
	 */
	required?: boolean;

	/**
	 * Custom search path for config file.
	 * @default process.cwd()
	 */
	searchPath?: string;
}

/**
 * Result returned by the config capability.
 */
export interface ConfigResult<TConfig> {
	/**
	 * The loaded configuration.
	 */
	config: TConfig;

	/**
	 * Path to the config file, "DEFAULT" if using default, or undefined if none found.
	 */
	location: string | "DEFAULT" | undefined;

	/**
	 * Check if using default config.
	 */
	isDefault(): boolean;

	/**
	 * Reload the configuration from disk.
	 */
	reload(): Promise<ConfigResult<TConfig>>;
}

/**
 * Config capability implementation.
 */
export class ConfigCapability<TCommand extends BaseCommand<any>, TConfig>
	implements Capability<TCommand, ConfigResult<TConfig>>
{
	constructor(private options: ConfigCapabilityOptions<TConfig> = {}) {}

	async initialize(command: TCommand): Promise<ConfigResult<TConfig>> {
		const searchPath = this.options.searchPath ?? process.cwd();
		const loaded = await loadConfig<TConfig>(
			command.config.bin,
			searchPath,
			undefined,
		);

		if (loaded === undefined && this.options.defaultConfig === undefined) {
			if (this.options.required !== false) {
				command.exit(`Failed to load config: ${searchPath}`, 1);
			}
			return {
				config: undefined as unknown as TConfig,
				location: undefined,
				isDefault: () => false,
				reload: async () => this.initialize(command),
			};
		}

		const { config, location } = loaded ?? {
			config: this.options.defaultConfig,
			location: "DEFAULT",
		};

		return {
			config: config as TConfig,
			location,
			isDefault: () => location === "DEFAULT",
			reload: async () => this.initialize(command),
		};
	}
}

/**
 * Helper function to create a config capability for a command.
 *
 * @example
 * ```typescript
 * class MyCommand extends BaseCommand {
 *   private config = useConfig<MyConfig>(this, {
 *     defaultConfig: { foo: "bar" },
 *     required: true
 *   });
 *
 *   async run() {
 *     const { config } = await this.config.get();
 *     console.log(config.foo);
 *   }
 * }
 * ```
 */
export function useConfig<TCommand extends BaseCommand<any>, TConfig>(
	command: TCommand,
	options?: ConfigCapabilityOptions<TConfig>,
): CapabilityHolder<TCommand, ConfigResult<TConfig>> {
	return new CapabilityHolder(command, new ConfigCapability<TCommand, TConfig>(options));
}

/**
 * Config flag that can be added to command flags.
 */
export const ConfigFlag = Flags.string({
	char: "c",
	description: "Path to config file",
	required: false,
});
```

### Git Capability

Replaces `GitCommand` base class:

```typescript
/**
 * Configuration options for git capability.
 */
export interface GitCapabilityOptions {
	/**
	 * Base directory for the git repository.
	 * @default process.cwd()
	 */
	baseDir?: string;

	/**
	 * Whether a git repository is required.
	 * If true and not in a repo, command will exit.
	 * @default true
	 */
	required?: boolean;
}

/**
 * Result returned by the git capability.
 */
export interface GitResult {
	/**
	 * simple-git client instance.
	 */
	git: SimpleGit;

	/**
	 * Repository wrapper with additional utilities.
	 */
	repo: Repository;

	/**
	 * Whether we're in a git repository.
	 */
	isRepo: boolean;

	// Helper methods
	getCurrentBranch(): Promise<string>;
	isCleanWorkingTree(): Promise<boolean>;
	hasUncommittedChanges(): Promise<boolean>;
}

/**
 * Git capability implementation.
 */
export class GitCapability<TCommand extends BaseCommand<any>>
	implements Capability<TCommand, GitResult>
{
	constructor(private options: GitCapabilityOptions = {}) {}

	async initialize(command: TCommand): Promise<GitResult> {
		const baseDir = this.options.baseDir ?? process.cwd();
		const repo = new Repository({ baseDir });
		const git = repo.gitClient;

		// Check if we're in a git repository
		const isRepo = await git
			.checkIsRepo()
			.catch(() => false);

		if (!isRepo && this.options.required !== false) {
			command.exit(`Not a git repository: ${baseDir}`, 1);
		}

		return {
			git,
			repo,
			isRepo,

			// Attach helper methods
			getCurrentBranch: async () => {
				const branch = await git.branchLocal();
				return branch.current;
			},

			isCleanWorkingTree: async () => {
				const status = await git.status();
				return status.isClean();
			},

			hasUncommittedChanges: async () => {
				const status = await git.status();
				return !status.isClean();
			},
		};
	}
}

/**
 * Helper function to create a git capability for a command.
 *
 * @example
 * ```typescript
 * class MyCommand extends BaseCommand {
 *   private git = useGit(this, { required: true });
 *
 *   async run() {
 *     const { git, getCurrentBranch } = await this.git.get();
 *     const branch = await getCurrentBranch();
 *     console.log(`On branch: ${branch}`);
 *   }
 * }
 * ```
 */
export function useGit<TCommand extends BaseCommand<any>>(
	command: TCommand,
	options?: GitCapabilityOptions,
): CapabilityHolder<TCommand, GitResult> {
	return new CapabilityHolder(command, new GitCapability<TCommand>(options));
}
```

---

## Patterns for Shared Functionality

One of the key concerns when moving from inheritance to composition is: **"How do I share methods, require implementations, and provide utilities?"**

Here are the patterns for each scenario:

### Pattern 1: Shared Methods → Capability Methods

**Before (Inheritance):**
```typescript
class CommandWithConfig extends BaseCommand {
  protected get commandConfig(): C | undefined { /* ... */ }
  protected get configLocation(): string | undefined { /* ... */ }
}

class MyCommand extends CommandWithConfig<typeof MyCommand, MyConfig> {
  async run() {
    const cfg = this.commandConfig; // From parent class
    const loc = this.configLocation; // From parent class
  }
}
```

**After (Composition):**
```typescript
// Capability exposes its own API
export interface ConfigResult<TConfig> {
  config: TConfig;
  location: string | "DEFAULT" | undefined;

  // Helper methods on the capability result
  isDefault(): boolean;
  reload(): Promise<ConfigResult<TConfig>>;
}

class MyCommand extends BaseCommand {
  private configCap = useConfig<MyConfig>(this);

  async run() {
    const result = await this.configCap.get();
    const cfg = result.config;        // Direct access
    const loc = result.location;       // Direct access
    if (result.isDefault()) { /* ... */ }  // Helper methods
  }
}
```

**Key Insight:** Capabilities can expose rich APIs with methods, not just data.

---

### Pattern 2: Configurable Behavior → Capability Options

**Before (Inheritance):**
```typescript
class MyCommand extends CommandWithConfig<typeof MyCommand, MyConfig> {
  protected override defaultConfig = { foo: "bar" };
  protected override requiresConfig = false;
}
```

**After (Composition):**
```typescript
class MyCommand extends BaseCommand {
  private config = useConfig<MyConfig>(this, {
    defaultConfig: { foo: "bar" },
    required: false,
  });
}
```

---

### Pattern 3: Abstract Methods → Interfaces + Generics

**Pattern A: Interface Contracts**

```typescript
// Define an interface for commands that need context
export interface CommandWithContext<CONTEXT> {
  getContext(): Promise<CONTEXT>;
}

// Capability checks for interface implementation
export class ContextAwareCapability<TCommand extends BaseCommand<any> & CommandWithContext<any>>
  implements Capability<TCommand, any>
{
  async initialize(command: TCommand) {
    const context = await command.getContext(); // Type-safe, required by interface
    return { context };
  }
}

// Usage
class MyCommand extends BaseCommand implements CommandWithContext<MyContext> {
  private contextCap = useContextAware(this);

  async getContext(): Promise<MyContext> {
    // MUST implement this - enforced by TypeScript
    return { user: "alice" };
  }

  async run() {
    const { context } = await this.contextCap.get();
  }
}
```

**Pattern B: Required Callbacks**

```typescript
// Instead of abstract methods, pass callbacks
export function useConfig<TCommand, TConfig>(
  command: TCommand,
  options: {
    // Callback replaces abstract method
    getDefaultConfig?: () => TConfig;
    shouldLoadConfig?: () => boolean;
  }
)

// Usage
class MyCommand extends BaseCommand {
  private config = useConfig<typeof this, MyConfig>(this, {
    getDefaultConfig: () => ({ foo: "bar" }),
    shouldLoadConfig: () => !this.flags["skip-config"],
  });
}
```

**Pattern C: Generic Constraints**

```typescript
// Require specific base class capabilities
export function useAdvancedGit<
  TCommand extends BaseCommand<any> & { logger: Logger }
>(command: TCommand) {
  // TypeScript enforces command has logger property
  return new CapabilityHolder(command, {
    initialize: async (cmd) => {
      cmd.logger.info("Initializing git..."); // Type-safe
      return { git: simpleGit() };
    }
  });
}
```

---

### Pattern 4: Shared Utilities → Helper Functions

**Before (Inheritance):**
```typescript
abstract class GitCommand extends BaseCommand {
  protected async getCurrentBranch(): Promise<string> {
    return (await this.git.branchLocal()).current;
  }

  protected async isCleanWorkingTree(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }
}

class MyCommand extends GitCommand {
  async run() {
    const branch = await this.getCurrentBranch();
    const clean = await this.isCleanWorkingTree();
  }
}
```

**After (Composition - Option 1: Standalone Helpers)**

```typescript
// Export helpers alongside capability
export async function getCurrentBranch(git: SimpleGit): Promise<string> {
  return (await git.branchLocal()).current;
}

export async function isCleanWorkingTree(git: SimpleGit): Promise<boolean> {
  const status = await git.status();
  return status.isClean();
}

// Usage
import { useGit, getCurrentBranch, isCleanWorkingTree } from "@tylerbu/cli-api/capabilities";

class MyCommand extends BaseCommand {
  private gitCap = useGit(this);

  async run() {
    const { git } = await this.gitCap.get();

    const branch = await getCurrentBranch(git);
    const clean = await isCleanWorkingTree(git);
  }
}
```

**After (Composition - Option 2: Methods on Result)**

```typescript
// Capability result includes helper methods
export interface GitResult {
  git: SimpleGit;
  repo: Repository;

  // Helper methods
  getCurrentBranch(): Promise<string>;
  isCleanWorkingTree(): Promise<boolean>;
}

// Implementation attaches helpers
class GitCapability implements Capability<any, GitResult> {
  async initialize(command: BaseCommand<any>): Promise<GitResult> {
    const git = simpleGit();
    const repo = new Repository({ baseDir: process.cwd() });

    return {
      git,
      repo,
      // Attach helpers - clean and convenient!
      getCurrentBranch: async () => (await git.branchLocal()).current,
      isCleanWorkingTree: async () => (await git.status()).isClean(),
    };
  }
}

// Usage - just as clean as inheritance!
class MyCommand extends BaseCommand {
  private gitCap = useGit(this);

  async run() {
    const { getCurrentBranch, isCleanWorkingTree } = await this.gitCap.get();

    const branch = await getCurrentBranch();
    const clean = await isCleanWorkingTree();
  }
}
```

**Recommendation:** Use methods on result for better encapsulation and convenience.

---

### Pattern 5: Cross-Capability Utilities → Composed Capabilities

When you need multiple capabilities working together:

```typescript
// Higher-order capability that composes others
export function useGitWithConfig<TCommand extends BaseCommand<any>, TConfig>(
  command: TCommand,
  configOptions: ConfigCapabilityOptions<TConfig>,
  gitOptions?: GitCapabilityOptions,
) {
  return new CapabilityHolder(command, {
    initialize: async (cmd) => {
      // Initialize both capabilities
      const configCap = useConfig<TCommand, TConfig>(cmd, configOptions);
      const gitCap = useGit(cmd, gitOptions);

      const [configResult, gitResult] = await Promise.all([
        configCap.get(),
        gitCap.get(),
      ]);

      // Return combined result with helpers that use both
      return {
        ...configResult,
        ...gitResult,

        // Helper using both config and git
        async commitWithConfiguredMessage() {
          const msg = configResult.config.commitTemplate || "Update";
          await gitResult.git.commit(msg);
        },
      };
    },
  });
}

// Usage
class MyCommand extends BaseCommand {
  private combined = useGitWithConfig<typeof this, MyConfig>(this, {
    defaultConfig: { commitTemplate: "feat: update" }
  });

  async run() {
    const result = await this.combined.get();
    await result.commitWithConfiguredMessage(); // Uses both!
  }
}
```

---

### Pattern 6: Template Method Pattern → Hook-based Capabilities

For complex initialization flows with hooks:

```typescript
// Capability with lifecycle hooks
export interface LifecycleHooks<TConfig> {
  beforeLoad?(): Promise<void> | void;
  afterLoad?(config: TConfig): Promise<TConfig> | TConfig;
  onLoadError?(error: Error): Promise<void> | void;
}

export function useConfigWithHooks<TCommand extends BaseCommand<any>, TConfig>(
  command: TCommand,
  hooks: LifecycleHooks<TConfig>,
  options: ConfigCapabilityOptions<TConfig> = {},
) {
  return new CapabilityHolder(command, {
    initialize: async (cmd) => {
      await hooks.beforeLoad?.();

      try {
        let result = await loadConfig<TConfig>(/* ... */);

        if (hooks.afterLoad && result) {
          result.config = await hooks.afterLoad(result.config);
        }

        return result;
      } catch (err) {
        await hooks.onLoadError?.(err as Error);
        throw err;
      }
    },
  });
}

// Usage
class MyCommand extends BaseCommand {
  private config = useConfigWithHooks<typeof this, MyConfig>(
    this,
    {
      beforeLoad: () => this.info("Loading config..."),
      afterLoad: (cfg) => {
        // Transform/validate config
        return { ...cfg, validated: true };
      },
      onLoadError: (err) => this.warning(`Config failed: ${err.message}`),
    },
    { defaultConfig: { foo: "bar" } },
  );
}
```

---

### Pattern 7: Polymorphism via Strategy Pattern

When you need different behaviors:

```typescript
// Strategy interface
export interface ConfigLoader<TConfig> {
  load(searchPath: string, binName: string): Promise<ConfigResult<TConfig> | undefined>;
}

// Different implementations
export class JsonConfigLoader<TConfig> implements ConfigLoader<TConfig> {
  async load(searchPath: string, binName: string) {
    // Load from JSON
  }
}

export class YamlConfigLoader<TConfig> implements ConfigLoader<TConfig> {
  async load(searchPath: string, binName: string) {
    // Load from YAML
  }
}

// Capability accepts strategy
export function useConfig<TCommand extends BaseCommand<any>, TConfig>(
  command: TCommand,
  options: ConfigCapabilityOptions<TConfig> & {
    loader?: ConfigLoader<TConfig>;
  },
) {
  const loader = options.loader ?? new DefaultConfigLoader<TConfig>();

  return new CapabilityHolder(command, {
    initialize: async (cmd) => {
      const result = await loader.load(process.cwd(), cmd.config.bin);
      return result ?? { config: options.defaultConfig, location: "DEFAULT" };
    },
  });
}

// Usage - inject behavior
class MyCommand extends BaseCommand {
  private config = useConfig<typeof this, MyConfig>(this, {
    loader: new YamlConfigLoader(), // Inject strategy
    defaultConfig: { foo: "bar" },
  });
}
```

---

### Pattern Comparison Table

| Inheritance Pattern | Composition Pattern | Example |
|---------------------|---------------------|---------|
| **Protected methods** | Helper functions or capability methods | `getCurrentBranch(git)` or `result.getCurrentBranch()` |
| **Abstract methods** | Interfaces + generics | `CommandWithContext<T>` interface |
| **Overridable properties** | Capability options | `useConfig(this, { defaultConfig: ... })` |
| **Template methods** | Hook-based capabilities | `useConfigWithHooks(this, { beforeLoad, afterLoad })` |
| **Shared utilities** | Standalone functions or result methods | `gitHelpers.getCurrentBranch(git)` |
| **Polymorphism** | Strategy pattern | `useConfig(this, { loader: new YamlLoader() })` |
| **Multi-capability logic** | Composed capabilities | `useGitWithConfig()` |

---

## Usage Examples

### Basic Usage - Single Capability

```typescript
import { BaseCommand } from "@tylerbu/cli-api";
import { useGit } from "@tylerbu/cli-api/capabilities";
import { Args } from "@oclif/core";

export default class MyGitCommand extends BaseCommand<typeof MyGitCommand> {
	// Compose git capability
	private gitCapability = useGit(this, { required: true });

	public static override readonly args = {
		branch: Args.string({ required: true }),
	};

	public override async run(): Promise<void> {
		// Access git when needed - auto-initializes on first use
		const { git } = await this.gitCapability.get();

		await git.checkout(this.args.branch);
		this.success(`Switched to ${this.args.branch}`);
	}
}
```

### Multiple Capabilities

```typescript
import { BaseCommand } from "@tylerbu/cli-api";
import { useConfig, useGit, ConfigFlag } from "@tylerbu/cli-api/capabilities";

interface MyConfig {
	defaultBranch: string;
	autoCommit: boolean;
}

export default class MyComplexCommand extends BaseCommand<typeof MyComplexCommand> {
	// Compose multiple capabilities
	private configCapability = useConfig<typeof this, MyConfig>(this, {
		defaultConfig: { defaultBranch: "main", autoCommit: false },
	});

	private gitCapability = useGit(this, { required: true });

	public static override readonly flags = {
		config: ConfigFlag,
		...BaseCommand.baseFlags,
	};

	public override async run(): Promise<void> {
		// Both capabilities initialize independently
		const { config } = await this.configCapability.get();
		const { git, getCurrentBranch } = await this.gitCapability.get();

		const branch = await getCurrentBranch();

		if (config.autoCommit && branch !== config.defaultBranch) {
			await git.add(".");
			await git.commit("Auto-commit from CLI");
			this.success("Changes committed");
		}
	}
}
```

### Optional Capabilities

```typescript
export default class FlexibleCommand extends BaseCommand<typeof FlexibleCommand> {
	// Git is optional - command works without it
	private gitCapability = useGit(this, { required: false });

	public override async run(): Promise<void> {
		const { git, isRepo } = await this.gitCapability.get();

		if (isRepo) {
			const branch = await git.branchLocal();
			this.info(`In git repo on branch: ${branch.current}`);
		} else {
			this.info("Not in a git repository");
		}

		// Rest of command logic works regardless
		this.log("Doing work...");
	}
}
```

### Lazy Initialization Pattern

```typescript
import { Flags } from "@oclif/core";

export default class PerformantCommand extends BaseCommand<typeof PerformantCommand> {
	private gitCapability = useGit(this);

	public static override readonly flags = {
		"skip-git": Flags.boolean({ description: "Skip git operations" }),
		...BaseCommand.baseFlags,
	};

	public override async run(): Promise<void> {
		// Git capability is NEVER initialized if --skip-git is used
		if (!this.flags["skip-git"]) {
			const { git } = await this.gitCapability.get();
			// Use git...
		}

		// No initialization cost if not needed
		this.log("Done!");
	}
}
```

### Custom Capabilities

```typescript
import type { Capability, CapabilityHolder } from "@tylerbu/cli-api/capabilities";
import { DockerClient } from "some-docker-lib";

interface DockerResult {
	client: DockerClient;
	containers: Container[];
}

class DockerCapability implements Capability<BaseCommand<any>, DockerResult> {
	async initialize(command: BaseCommand<any>): Promise<DockerResult> {
		const client = new DockerClient();
		const containers = await client.listContainers();

		command.info(`Found ${containers.length} containers`);

		return { client, containers };
	}

	async cleanup() {
		// Close docker connections
	}
}

function useDocker(command: BaseCommand<any>): CapabilityHolder<typeof command, DockerResult> {
	return new CapabilityHolder(command, new DockerCapability());
}

// Use it
export default class DockerCommand extends BaseCommand<typeof DockerCommand> {
	private docker = useDocker(this);

	async run() {
		const { client, containers } = await this.docker.get();
		// Work with docker...
	}
}
```

### Real-World Example: Migrating SquishCommand

**Before (Inheritance):**
```typescript
import { GitCommand } from "@tylerbu/cli-api";

export default class SquishCommand extends GitCommand<typeof SquishCommand> {
	protected override redirectLogToTrace = true;

	public override async run(): Promise<void> {
		if (this.git === undefined) {
			this.exit(`Not a git repo: ${process.cwd()}`);
		}

		const sourceBranch = this.args.source ??
			(await this.git.raw(["branch", "--show-current"])).trim();
		const tempBranch = `squish/${sourceBranch}`;

		await this.git.checkoutBranch(tempBranch, this.args.target);
		// ... rest of implementation
	}
}
```

**After (Composition):**
```typescript
import { BaseCommand } from "@tylerbu/cli-api";
import { useGit } from "@tylerbu/cli-api/capabilities";

export default class SquishCommand extends BaseCommand<typeof SquishCommand> {
	private gitCapability = useGit(this, { required: true });
	protected override redirectLogToTrace = true;

	public override async run(): Promise<void> {
		const { git, getCurrentBranch } = await this.gitCapability.get();

		const sourceBranch = this.args.source ?? await getCurrentBranch();
		const tempBranch = `squish/${sourceBranch}`;

		await git.checkoutBranch(tempBranch, this.args.target);
		// ... rest of implementation
	}
}
```

**Changes:**
- ✅ More explicit: clearly declares git dependency
- ✅ Better typed: `getCurrentBranch()` helper is type-safe
- ✅ More testable: can mock `gitCapability` directly
- ✅ More flexible: could add config capability without changing base class

---

## Migration Strategy

### Phase 1: Add Capability System (Non-Breaking)

**Goal:** Add new capability infrastructure alongside existing base classes.

1. **Add new capability infrastructure** to `cli-api`:
   ```
   packages/cli-api/src/capabilities/
   ├── capability.ts           # Core types and CapabilityHolder
   ├── config.ts              # ConfigCapability
   ├── git.ts                 # GitCapability
   └── index.ts               # Public exports
   ```

2. **Keep existing base classes** for backward compatibility:
   - `CommandWithConfig` and `GitCommand` remain unchanged
   - Commands using inheritance continue to work

3. **Export both patterns**:
   ```typescript
   // cli-api/src/index.ts
   export { BaseCommand, CommandWithConfig, GitCommand } from "./commands.js"; // Legacy
   export * from "./capabilities/index.js"; // New
   ```

4. **Update package.json exports**:
   ```json
   {
     "exports": {
       ".": "./esm/index.js",
       "./capabilities": "./esm/capabilities/index.js"
     }
   }
   ```

### Phase 2: Migrate Commands Gradually

Migrate commands one at a time, testing as you go.

**Migration Checklist per Command:**

- [ ] Change `extends GitCommand` → `extends BaseCommand`
- [ ] Add `private gitCapability = useGit(this, { required: true })`
- [ ] Replace `this.git` → `const { git } = await this.gitCapability.get()`
- [ ] Replace `this.repo` → `const { repo } = await this.gitCapability.get()`
- [ ] Update tests to mock capabilities instead of base class
- [ ] Remove unused flag spreads if any

**Example Migration:**

```diff
- import { GitCommand } from "@tylerbu/cli-api";
+ import { BaseCommand } from "@tylerbu/cli-api";
+ import { useGit } from "@tylerbu/cli-api/capabilities";

- export default class MyCommand extends GitCommand<typeof MyCommand> {
+ export default class MyCommand extends BaseCommand<typeof MyCommand> {
+   private gitCapability = useGit(this, { required: true });

    async run() {
-     await this.git.checkout(branch);
+     const { git } = await this.gitCapability.get();
+     await git.checkout(branch);
    }
  }
```

**Commands to Migrate (Priority Order):**

1. ✅ Simple git-only commands (no config)
2. ✅ Commands with both git and config
3. ✅ Commands with custom capabilities
4. ✅ Test commands

### Phase 3: Deprecate Old Base Classes

Once all commands are migrated:

1. **Mark as deprecated** (add to docstrings):
   ```typescript
   /**
    * @deprecated Use BaseCommand with useConfig() capability instead.
    * This class will be removed in v2.0.0.
    *
    * Migration guide: https://...
    */
   export abstract class CommandWithConfig<T, C> extends BaseCommand<T> {
   	// ...
   }
   ```

2. **Add migration guide** to documentation

3. **Set timeline** for removal (e.g., next major version)

4. **Update CHANGELOG.md** with deprecation notice

### Phase 4: Remove Old Base Classes (Breaking Change)

In next major version (e.g., `cli-api@2.0.0`):

1. Remove `CommandWithConfig` class
2. Remove `GitCommand` class
3. Only expose `BaseCommand` + capabilities
4. Update all documentation
5. Publish major version with clear migration guide

**Release Notes Template:**

```markdown
## Breaking Changes in v2.0.0

### Removed: CommandWithConfig and GitCommand base classes

**Migration Required**

The inheritance-based command classes have been removed in favor of composition-based capabilities.

**Before:**
```typescript
class MyCommand extends GitCommand<typeof MyCommand> {
  async run() {
    await this.git.checkout("main");
  }
}
```

**After:**
```typescript
import { useGit } from "@tylerbu/cli-api/capabilities";

class MyCommand extends BaseCommand<typeof MyCommand> {
  private git = useGit(this);

  async run() {
    const { git } = await this.git.get();
    await git.checkout("main");
  }
}
```

See [Migration Guide](link) for complete instructions.
```

---

## Key Design Benefits

### ✅ Flexibility
Commands can mix-and-match capabilities without rigid hierarchies:
```typescript
// Git only
class A extends BaseCommand { git = useGit(this); }

// Config only
class B extends BaseCommand { config = useConfig(this); }

// Both
class C extends BaseCommand {
  git = useGit(this);
  config = useConfig(this);
}

// Neither
class D extends BaseCommand { }
```

### ✅ Lazy Initialization
Capabilities only initialize when accessed, avoiding unnecessary work:
```typescript
// Git never initialized if --skip-git flag is set
if (!this.flags["skip-git"]) {
  const { git } = await this.gitCapability.get();
}
```

### ✅ Type Safety
TypeScript infers capability result types:
```typescript
const { config } = await this.configCapability.get();
// config is typed as MyConfig

const { git, repo } = await this.gitCapability.get();
// git is SimpleGit, repo is Repository
```

### ✅ Testability
Mock capabilities easily in tests:
```typescript
const mockGit = { checkout: vi.fn() };
const mockCapability = {
  initialize: () => Promise.resolve({ git: mockGit, repo: null, isRepo: true })
};
command.gitCapability = new CapabilityHolder(command, mockCapability);
```

### ✅ Extensibility
Create custom capabilities for any cross-cutting concern:
```typescript
// Docker, database, HTTP client, file system, etc.
class MyCommand extends BaseCommand {
  docker = useDocker(this);
  db = useDatabase(this);
  fs = useFileSystem(this);
}
```

### ✅ Clear Dependencies
Each command explicitly declares what it needs:
```typescript
// Old: unclear if git is available
class MyCommand extends SomeBaseClass { }

// New: crystal clear
class MyCommand extends BaseCommand {
  git = useGit(this, { required: true });
  config = useConfig<MyConfig>(this);
}
```

---

## FAQ

### Why not just use plain functions?

**Q:** Why not just use helper functions like `const git = await loadGit(this)`?

**A:** Capabilities provide:
- **Caching**: Initialize once, use many times
- **Lifecycle**: Automatic cleanup support
- **Type safety**: Full TypeScript inference
- **Testability**: Easy to mock at the capability level
- **Consistency**: Standardized pattern across all cross-cutting concerns

### How do I share logic between capabilities?

**Q:** If two capabilities need similar logic, how do I avoid duplication?

**A:** Use composed capabilities or shared utilities:

```typescript
// Shared utility
async function validateDirectory(dir: string) { /* ... */ }

// Capability uses shared utility
class GitCapability implements Capability<any, GitResult> {
  async initialize(command: BaseCommand<any>): Promise<GitResult> {
    await validateDirectory(process.cwd()); // Shared logic
    // ... rest of initialization
  }
}
```

### Can I create a capability that depends on another capability?

**Q:** What if my capability needs git or config?

**A:** Yes! Capabilities can compose other capabilities:

```typescript
export function useGitAnalytics<TCommand extends BaseCommand<any>>(
  command: TCommand,
) {
  return new CapabilityHolder(command, {
    initialize: async (cmd) => {
      // Depend on git capability
      const gitCap = useGit(cmd);
      const { git, repo } = await gitCap.get();

      // Analyze git data
      const commits = await git.log();

      return {
        git,
        repo,
        analytics: { commitCount: commits.total },
      };
    },
  });
}
```

### How do I test commands with capabilities?

**Q:** How do I mock capabilities in tests?

**A:** Several approaches:

**Option 1: Mock the capability holder**
```typescript
const mockGit = { checkout: vi.fn() };
command.gitCapability = {
  get: vi.fn().mockResolvedValue({ git: mockGit, repo: null, isRepo: true }),
  isInitialized: true,
  cleanup: vi.fn(),
};
```

**Option 2: Inject mock capability**
```typescript
const mockCapability = {
  initialize: vi.fn().mockResolvedValue({ git: mockGit }),
};
command.gitCapability = new CapabilityHolder(command, mockCapability);
```

**Option 3: Use real capability with mocked dependencies**
```typescript
vi.mock("simple-git", () => ({
  default: () => mockGit,
}));
// Real capability will use mocked simple-git
```

### Is there a performance cost?

**Q:** Does lazy initialization add overhead?

**A:** Minimal. The first `get()` call initializes (same cost as eager init). Subsequent calls return cached result (trivial cost). The benefit of skipping unused capabilities often outweighs any overhead.

### Can I mix inheritance and composition during migration?

**Q:** Can I use both approaches during migration?

**A:** Yes! That's the whole point of Phase 1:

```typescript
// Old command still works
class OldCommand extends GitCommand { }

// New command uses capabilities
class NewCommand extends BaseCommand {
  git = useGit(this);
}

// Both export from same package
export { OldCommand, NewCommand };
```

---

## Next Steps

1. ✅ Review this design document
2. ⏳ Prototype capability implementation in `cli-api`
3. ⏳ Migrate one command as proof-of-concept
4. ⏳ Get feedback and iterate
5. ⏳ Complete migration of all commands
6. ⏳ Deprecate old base classes
7. ⏳ Release v2.0.0 with breaking changes

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Proposal - Awaiting Review
