# Logger System Guide

The `@tylerbu/cli-api` package provides a pluggable logger architecture that allows CLI tools to customize their logging output without modifying command logic.

## Overview

The logger system consists of:

1. **Logger Interface** - Defines the logging contract
2. **Logger Implementations** - Concrete logger instances (BasicLogger, ConsolaLogger)
3. **BaseCommand Integration** - Commands delegate logging to the configured logger

## Logger Interface

```typescript
export interface Logger {
  log: LoggingFunction;
  success: LoggingFunction;
  info: ErrorLoggingFunction;
  warning: ErrorLoggingFunction;
  errorLog: ErrorLoggingFunction;
  verbose: ErrorLoggingFunction;
  formatError?: ((message: Error | string) => string) | undefined;
}
```

### Methods

- **log** - General purpose logging to stdout
- **success** - Log success messages (typically with green/positive formatting)
- **info** - Log informational messages
- **warning** - Log warnings (typically with yellow/caution formatting)
- **errorLog** - Log errors to stderr (typically with red/error formatting)
- **verbose** - Log verbose/debug messages (only shown when verbose flag is enabled)
- **formatError** - Optional hook to customize error formatting

## Built-in Logger Implementations

### BasicLogger

A simple console logger with colored output using picocolors.

**Features:**
- Zero external dependencies (uses existing picocolors)
- Colored severity levels (green SUCCESS, yellow WARNING, red ERROR)
- Simple, predictable behavior
- Default logger for all commands

**Usage:**
```typescript
import { BasicLogger } from "@tylerbu/cli-api/loggers/basic.js";

// BasicLogger is the default - no action needed
// Or set explicitly:
protected logger: Logger = BasicLogger;
```

**Output Examples:**
```
SUCCESS: Build completed successfully
INFO: Processing 5 files
WARNING: Config file not found, using defaults
ERROR: Failed to read package.json
VERBOSE: Cache hit for file.ts
```

### ConsolaLogger (Alpha)

A modern logger with rich formatting using the consola library.

**Features:**
- Enhanced visual formatting with icons and colors
- Better readability for complex CLI output
- Configurable log levels and fancy mode
- Requires `consola` peer dependency

**Installation:**
```bash
pnpm add consola
```

**Usage:**
```typescript
import { ConsolaLogger } from "@tylerbu/cli-api/loggers/consola.js";

export abstract class MyCommand extends CommandWithConfig {
  protected override logger = ConsolaLogger;
}
```

**Output Examples:**
```
✔ Build completed successfully
ℹ Processing 5 files
⚠ Config file not found, using defaults
✖ Failed to read package.json
```

## Using Loggers in Commands

### Default Usage (BasicLogger)

All commands that extend `BaseCommand` or its subclasses (`CommandWithConfig`, `GitCommand`) automatically use `BasicLogger`:

```typescript
import { Command } from "@oclif/core";
import { BaseCommand } from "@tylerbu/cli-api";

export default class MyCommand extends BaseCommand<typeof MyCommand> {
  public async run(): Promise<void> {
    // These methods use the configured logger
    this.log("Starting process");
    this.success("Operation completed");
    this.info("Configuration loaded");
    this.warning("No cache found");
    this.errorLog("Invalid input");
    this.verbose("Debug information");
  }
}
```

### Overriding the Logger

To use a different logger implementation, override the `logger` property:

```typescript
import { BaseCommand } from "@tylerbu/cli-api";
import { ConsolaLogger } from "@tylerbu/cli-api/loggers/consola.js";

export default class MyCommand extends BaseCommand<typeof MyCommand> {
  protected override logger = ConsolaLogger;

  public async run(): Promise<void> {
    // Now uses ConsolaLogger for all output
    this.success("Builds with enhanced formatting!");
  }
}
```

### Per-Package Logger Override

To use a specific logger for all commands in a package, create a base command class:

```typescript
// src/baseCommand.ts
import { CommandWithConfig } from "@tylerbu/cli-api";
import { ConsolaLogger } from "@tylerbu/cli-api/loggers/consola.js";

export abstract class MyPackageCommand extends CommandWithConfig {
  protected override logger = ConsolaLogger;
}

// src/commands/build.ts
export default class Build extends MyPackageCommand {
  // Automatically uses ConsolaLogger
}
```

## Creating Custom Loggers

To create a custom logger implementation, implement the `Logger` interface:

```typescript
import type { Logger, LoggingFunction, ErrorLoggingFunction } from "@tylerbu/cli-api";

const log: LoggingFunction = (message) => {
  console.log(`[LOG] ${message}`);
};

const success: LoggingFunction = (message) => {
  console.log(`[✓] ${message}`);
};

const info: ErrorLoggingFunction = (message) => {
  const msg = message instanceof Error ? message.message : message;
  console.log(`[INFO] ${msg}`);
};

const warning: ErrorLoggingFunction = (message) => {
  const msg = message instanceof Error ? message.message : message;
  console.warn(`[WARNING] ${msg}`);
};

const errorLog: ErrorLoggingFunction = (message) => {
  const msg = message instanceof Error ? message.stack || message.message : message;
  console.error(`[ERROR] ${msg}`);
};

const verbose: ErrorLoggingFunction = (message) => {
  const msg = message instanceof Error ? message.message : message;
  console.log(`[VERBOSE] ${msg}`);
};

export const CustomLogger: Logger = {
  log,
  success,
  info,
  warning,
  errorLog,
  verbose,
};
```

### Advanced: Logger with Custom Error Formatting

```typescript
import type { Logger } from "@tylerbu/cli-api";
import chalk from "picocolors";

function formatError(message: Error | string): string {
  if (typeof message === "string") {
    return message;
  }

  // Custom error formatting with stack traces
  return [
    chalk.red(message.message),
    message.stack ? chalk.gray(message.stack) : "",
  ].filter(Boolean).join("\n");
}

export const AdvancedLogger: Logger = {
  log: console.log,
  success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
  info: (msg) => console.log(chalk.blue(`ℹ ${formatError(msg)}`)),
  warning: (msg) => console.warn(chalk.yellow(`⚠ ${formatError(msg)}`)),
  errorLog: (msg) => console.error(formatError(msg)),
  verbose: (msg) => console.log(chalk.gray(formatError(msg))),
  formatError,
};
```

## Logger Utilities

### logIndent

Utility function for indented logging:

```typescript
import { logIndent } from "@tylerbu/cli-api";

const logger = BasicLogger;
const message = "This text will be indented";

logIndent(message, logger, 4); // 4 spaces indent
```

## Choosing a Logger

### Use BasicLogger When:
- You want zero additional dependencies
- You need simple, predictable console output
- Building lightweight CLI tools
- Targeting environments where bundle size matters

### Use ConsolaLogger When:
- You want enhanced visual output with icons
- Building developer-facing tools where UX matters
- You're okay with the consola dependency
- You want better readability for complex output

### Create a Custom Logger When:
- You need to log to files or external services
- You require structured logging (JSON, etc.)
- You have specific formatting requirements
- You need integration with logging platforms

## Best Practices

1. **Consistent Usage** - Choose one logger for your entire package/project
2. **Respect Flags** - Logger methods automatically respect `--quiet` and `--verbose` flags
3. **Error Handling** - Use `errorLog()` for non-fatal errors, `error()` for fatal errors that exit
4. **Success Messages** - Use `success()` for operation completions to provide clear feedback
5. **Verbose Logging** - Use `verbose()` for debugging information that shouldn't clutter normal output

## Migration from Previous Versions

If your commands directly called console methods:

```typescript
// Before
console.log("Message");
console.error("Error");

// After
this.log("Message");
this.errorLog("Error");
```

If your commands used inline color formatting:

```typescript
// Before
this.log(chalk.green("Success!"));

// After - let the logger handle formatting
this.success("Success!");
```

## Troubleshooting

**Q: ConsolaLogger not found**
A: Install the `consola` peer dependency: `pnpm add consola`

**Q: Logger methods not working**
A: Ensure your command extends `BaseCommand` or one of its subclasses

**Q: Verbose messages not showing**
A: Check that you're using the `--verbose` flag when running the command

**Q: Custom logger not being used**
A: Verify you're overriding the `logger` property in your command class

## Examples

### Example: File Logger

```typescript
import type { Logger } from "@tylerbu/cli-api";
import { writeFileSync, appendFileSync } from "node:fs";

const logFile = "./command.log";

export const FileLogger: Logger = {
  log: (msg) => appendFileSync(logFile, `${new Date().toISOString()} LOG: ${msg}\n`),
  success: (msg) => appendFileSync(logFile, `${new Date().toISOString()} SUCCESS: ${msg}\n`),
  info: (msg) => {
    const message = msg instanceof Error ? msg.message : msg;
    appendFileSync(logFile, `${new Date().toISOString()} INFO: ${message}\n`);
  },
  warning: (msg) => {
    const message = msg instanceof Error ? msg.message : msg;
    appendFileSync(logFile, `${new Date().toISOString()} WARNING: ${message}\n`);
  },
  errorLog: (msg) => {
    const message = msg instanceof Error ? (msg.stack || msg.message) : msg;
    appendFileSync(logFile, `${new Date().toISOString()} ERROR: ${message}\n`);
  },
  verbose: (msg) => {
    const message = msg instanceof Error ? msg.message : msg;
    appendFileSync(logFile, `${new Date().toISOString()} VERBOSE: ${message}\n`);
  },
};
```

### Example: JSON Structured Logger

```typescript
import type { Logger } from "@tylerbu/cli-api";

function logJSON(level: string, message: string | Error) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: message instanceof Error ? message.message : message,
    stack: message instanceof Error ? message.stack : undefined,
  };
  console.log(JSON.stringify(entry));
}

export const JSONLogger: Logger = {
  log: (msg) => logJSON("log", msg || ""),
  success: (msg) => logJSON("success", msg || ""),
  info: (msg) => logJSON("info", msg),
  warning: (msg) => logJSON("warning", msg),
  errorLog: (msg) => logJSON("error", msg),
  verbose: (msg) => logJSON("verbose", msg),
};
```

## See Also

- [BaseCommand API Documentation](./api-docs/cli-api.api.md)
- [OCLIF Documentation](https://oclif.io)
- [Consola Documentation](https://github.com/unjs/consola)
