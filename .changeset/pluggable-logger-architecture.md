---
"@tylerbu/cli-api": major
---

feat!: pluggable logger architecture for BaseCommand

Introduces a pluggable logger system that allows CLI tools to customize logging output without modifying command logic.

**New exports:**
- `BasicLogger` - Default console logger with colored output (SUCCESS/INFO/WARNING/ERROR/VERBOSE prefixes)
- `ConsolaLogger` (alpha) - Rich formatting logger using consola library
- `logIndent()` - Standalone function for indented logging
- `Args` and `Flags` type helpers

**Breaking changes:**
- `BaseCommand` no longer implements `Logger` directly; use the `logger` getter instead
- `errorLog()` method renamed to `logError()` for consistency
- `exit()` method now supports `exit(message, code)` overload for error+exit in one call
- `warningWithDebugTrace()` return type changed from `string | Error` to `void`
- `logIndent()` is now a standalone function: `logIndent(input, logger, indent)` instead of `this.logIndent(input, indent)`
- Removed custom `error()` override that formatted strings with chalk (now delegated to logger)

**Migration:**
```typescript
// Before
class MyCommand extends BaseCommand {
  run() {
    this.errorLog("message");
    this.logIndent("text", 2);
  }
}

// After
import { logIndent } from "@tylerbu/cli-api";

class MyCommand extends BaseCommand {
  run() {
    this.logError("message");
    logIndent("text", this.logger, 2);
  }
}
```

**Custom logger:**
```typescript
class MyCommand extends BaseCommand {
  protected override _logger = ConsolaLogger; // or your own Logger implementation
}
```
