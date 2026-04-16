# CLAUDE.md - @tylerbu/cli-api

Package-specific guidance for the shared CLI command infrastructure library.

## Package Overview

Base classes and API helpers for OCLIF-based CLI projects. This library provides reusable command base classes that add common functionality like configuration file support and git operations to OCLIF commands.

**Key Features:**
- `CommandWithConfig` - Base class adding configuration file loading
- `GitCommand` - Base class adding git operations via simple-git
- Config file loading via lilconfig (supports multiple formats)
- Type-safe flag and argument handling
- Colorized output utilities

## Development Commands

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Format code
pnpm format

# Lint code
pnpm lint
pnpm lint:fix  # Auto-fix issues

# Check formatting
pnpm check

# Generate API documentation
pnpm build:api

# Clean build artifacts
pnpm clean
```

## Key Exports

### CommandWithConfig

Base class that adds configuration file loading to OCLIF commands:

```typescript
import { CommandWithConfig } from "@tylerbu/cli-api";

export default class MyCommand extends CommandWithConfig<typeof MyCommand> {
  public static override readonly flags = {
    ...CommandWithConfig.flags,  // Inherits --config flag
  };

  public override async run(): Promise<void> {
    // Config loaded automatically from:
    // - .myapprc (JSON/YAML)
    // - .myapprc.json
    // - .myapprc.yaml/yml
    // - myapp.config.js/cjs/mjs/ts
    // - myapp property in package.json
    // - Or path specified via --config flag
  }
}
```

**Config Loading:**
- Uses lilconfig for flexible config file discovery
- Supports TypeScript config files via @tylerbu/lilconfig-loader-ts
- Config file name determined by OCLIF's `dirname` property
- Searches from current directory upward

### GitCommand

Base class that adds git operations:

```typescript
import { GitCommand } from "@tylerbu/cli-api";

export default class MyGitCommand extends GitCommand<typeof MyGitCommand> {
  public static override readonly flags = {
    ...GitCommand.flags,  // Inherits git-related flags
  };

  public override async run(): Promise<void> {
    // this.git is available (simple-git instance)
    const status = await this.git.status();
    const branches = await this.git.branch();

    // Git-aware error handling
    // redirectLogToTrace - control log verbosity
  }
}
```

**Provided Features:**
- `this.git` - Initialized simple-git instance
- Git repository detection and validation
- Git-aware error handling

### Utilities

**Output Formatting:**
```typescript
import { chalk } from "@tylerbu/cli-api";

// Colorized console output
console.log(chalk.green("Success!"));
console.log(chalk.red("Error!"));
console.log(chalk.yellow("Warning!"));
```

## Configuration System

The configuration loading system uses lilconfig and supports multiple file formats:

**Supported Config Files:**
- `.${appName}rc` (JSON or YAML)
- `.${appName}rc.json`
- `.${appName}rc.yaml` / `.${appName}rc.yml`
- `${appName}.config.js` / `.cjs` / `.mjs` / `.ts`
- `${appName}` property in `package.json`

**TypeScript Config Support:**
TypeScript config files are automatically supported via the integrated lilconfig-loader-ts.

## Project Structure

```
packages/cli-api/
├── src/
│   ├── index.ts              # Main exports
│   ├── BaseCommand.ts        # CommandWithConfig implementation
│   ├── GitCommand.ts         # GitCommand implementation
│   └── utils/                # Utility functions
├── esm/                      # Compiled output
├── test/                     # Vitest tests
├── package.json
└── tsconfig.json
```

## Testing Strategy

Uses Vitest for unit testing:

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test -- --watch
```

**Test Structure:**
- Unit tests in `test/` directory
- Test files: `*.test.ts`
- Coverage output in `.coverage/`

## Integration with Other Packages

This package is used by:
- **@tylerbu/cli** - Personal CLI tool
- **dill-cli** - File download utility
- **repopo** - Repository policy tool
- **sort-tsconfig** - TypeScript config sorter

When modifying base classes, consider impact on all consuming packages.

## Common Patterns

### Extending CommandWithConfig

```typescript
import { CommandWithConfig } from "@tylerbu/cli-api";
import { Args, Flags } from "@oclif/core";

export default class MyCommand extends CommandWithConfig<typeof MyCommand> {
  public static override readonly description = "My command description";

  public static override readonly flags = {
    myFlag: Flags.boolean({ description: "My flag" }),
    ...CommandWithConfig.flags,  // Inherit config flag
  };

  public static override readonly args = {
    myArg: Args.string({ required: true }),
  };

  public override async run(): Promise<void> {
    const { flags, args } = this;
    // Config automatically loaded
    // Access via this.config property
  }
}
```

### Extending GitCommand

```typescript
import { GitCommand } from "@tylerbu/cli-api";
import { Flags } from "@oclif/core";

export default class MyGitCommand extends GitCommand<typeof MyGitCommand> {
  public static override readonly description = "Git command";

  public static override readonly flags = {
    branch: Flags.string({ description: "Branch name" }),
    ...GitCommand.flags,
  };

  public override async run(): Promise<void> {
    // Validate we're in a git repo
    if (!await this.git.checkIsRepo()) {
      this.error("Not in a git repository");
    }

    // Perform git operations
    const currentBranch = await this.git.revparse(["--abbrev-ref", "HEAD"]);
    this.log(`Current branch: ${currentBranch}`);
  }
}
```

## Important Constraints

1. **Part of Monorepo**: Uses `workspace:^` protocol for internal dependencies
2. **OCLIF Compatibility**: Designed for OCLIF v4+
3. **TypeScript**: Strict mode enabled
4. **Zero Runtime Config**: Config files loaded via lilconfig at runtime
5. **Biome Formatting**: Code must pass Biome checks
6. **Test Coverage**: Maintain test coverage for new features

## Dependencies

**Runtime:**
- `@oclif/core` - OCLIF framework
- `@tylerbu/fundamentals` - Shared utilities
- `@tylerbu/lilconfig-loader-ts` - TypeScript config loader
- `lilconfig` - Config file loading
- `simple-git` - Git operations
- `sort-package-json` - Package.json sorting

**Key Features:**
- Minimal dependencies
- Reusable across multiple CLI projects
- Type-safe configuration
- Extensible base classes
