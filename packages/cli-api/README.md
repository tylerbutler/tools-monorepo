# @tylerbu/cli-api

This package contains common infrastructure and related APIs used by
[@tylerbu/cli](https://github.com/tylerbutler/tools-monorepo/tree/main/packages/cli).

See [the API summary](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli-api/docs/cli-api.api.md) for
an overview of the API. Public APIs should all be documented, but the docs aren't yet published anywhere.

## Logger System

Commands extending `BaseCommand` have access to a pluggable logger architecture with methods like `log()`, `success()`, `info()`, `warning()`, `logError()`, and `verbose()`.

**Built-in loggers:**

- `BasicLogger` (default) - Simple console output with colored prefixes
- `ConsolaLogger` (alpha) - Rich formatting via [consola](https://github.com/unjs/consola) (requires peer dependency)

**Usage:**

```typescript
// Default BasicLogger - no setup needed
export default class MyCommand extends BaseCommand<typeof MyCommand> {
  public async run(): Promise<void> {
    this.success("Operation completed");
    this.warning("Check your config");
    this.verbose("Debug info"); // Only shown with --verbose flag
  }
}

// Override with a different logger
import { ConsolaLogger } from "@tylerbu/cli-api/loggers/consola.js";

export default class MyCommand extends BaseCommand<typeof MyCommand> {
  protected override _logger = ConsolaLogger;
}

// Pass logger to utility functions
async function processFiles(files: string[], logger: Logger): Promise<void> {
  logger.info(`Processing ${files.length} files`);
}

// In command:
await processFiles(files, this.logger);
```

See the TSDoc comments on `Logger`, `BaseCommand`, `BasicLogger`, and `ConsolaLogger` for full API details.
