# CLAUDE.md - dill-cli

Package-specific guidance for the file download and extraction CLI tool.

## Package Overview

Dill is a command-line tool to download and optionally decompress gzipped files. Built with OCLIF and Effection for structured concurrency, it provides a robust solution for downloading and extracting archives in CI/CD pipelines and development workflows.

**Binary:** `dill`
**Dev Mode:** `./bin/dev.js`
**Prod Mode:** `./bin/run.js`
**Documentation:** https://dill.tylerbutler.com/

**Key Features:**
- Download files from URLs
- Automatic decompression (gzip, tar.gz)
- Progress bars and status indicators
- Content-type detection
- Filename extraction from Content-Disposition headers
- Built with Effection for cancellable operations

## Essential Commands

```bash
# Install dependencies
pnpm install

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

# Generate OCLIF manifest
pnpm build:manifest

# Update README from command help
pnpm build:readme

# Update command snapshots
./bin/dev.js snapshot:generate
./bin/dev.js snapshot:compare

# Clean build artifacts
pnpm clean
```

## Using Dill CLI

```bash
# Development mode (no compilation needed)
./bin/dev.js <url> [output]

# Examples:
./bin/dev.js https://example.com/file.tar.gz
./bin/dev.js https://example.com/file.tar.gz ./output.tar.gz
./bin/dev.js https://example.com/file.tar.gz --extract

# Production mode
dill <url> [output]

# Download and extract
dill https://example.com/archive.tar.gz --extract

# Download to specific location
dill https://example.com/file.zip ./downloads/file.zip

# Show help
dill --help
```

## Command Structure

Dill uses a **single-command strategy** in OCLIF - the main command is directly accessible without subcommands:

```
src/
├── commands/
│   └── download.ts        # Main download command
├── lib/
│   ├── download.ts        # Download implementation (Effection)
│   ├── extract.ts         # Extraction logic
│   └── progress.ts        # Progress bar utilities
└── index.ts              # Public API exports
```

**Exportable Command:**
The download command is exported at `dill-cli/command` for reuse in other CLI tools (e.g., `@tylerbu/cli` re-exports it as the `download` command).

## Architecture

### Effection-Based Concurrency

Dill uses Effection for structured concurrency:

```typescript
import { main, stream } from "effection";

// Operations are cancellable and composable
await main(function* () {
  let response = yield* fetch(url);
  let body = yield* stream(response.body);

  for (let chunk of body) {
    // Process streaming data
  }
});
```

**Benefits:**
- Automatic cleanup on errors
- Cancellable operations
- Structured control flow
- Resource management

### File Type Detection

```typescript
import { FileTypeResult, fileTypeStream } from "file-type";
import { parseContentType } from "whatwg-mimetype";

// Detect file types from content and headers
const contentType = parseContentType(response.headers.get("content-type"));
const fileType = await fileTypeFromStream(stream);
```

### Extraction Support

Supports multiple archive formats:
- **tar** - TAR archives (via nanotar)
- **gzip** - Gzip compression (via fflate)
- **tar.gz** - Gzipped TAR archives

## Testing Strategy

### Unit Tests (Vitest)

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test:coverage
```

**Test Structure:**
- Unit tests in `test/` directory
- Uses `msw` (Mock Service Worker) for HTTP mocking
- Coverage output in `.coverage/`

### Command Snapshot Tests

```bash
# Generate snapshots
./bin/dev.js snapshot:generate --filepath test/commands/__snapshots__/commands.json

# Verify snapshots
./bin/dev.js snapshot:compare --filepath test/commands/__snapshots__/commands.json
```

Uses `@oclif/plugin-command-snapshot` to validate command structure, flags, and help text.

### Integration Tests

```bash
# Start local file server
pnpm start  # Serves test/data on port 8080

# Run integration tests
pnpm test -- --grep integration
```

## OCLIF Configuration

Dill uses a **single-command strategy**:

```json
{
  "oclif": {
    "bin": "dill",
    "commands": {
      "strategy": "single",
      "target": "./esm/commands/download.js"
    }
  }
}
```

This means `dill` directly invokes the download command without requiring a subcommand name.

**Custom Help Options:**
- Hidden aliases from root
- Stripped ANSI colors
- Custom usage header
- Flag options shown in title

## Build Artifacts

```
bin/                      # Binary entry points
esm/                      # Compiled TypeScript
oclif.manifest.json       # Command manifest (auto-generated)
README.md                # Auto-generated from command help
```

**Never edit manually:**
- `oclif.manifest.json` - Run `pnpm build:manifest`
- README.md command sections - Run `pnpm build:readme`

## Common Workflows

### Adding a New Flag or Option

1. Update `src/commands/download.ts` flags
2. Modify implementation in `src/lib/download.ts`
3. Run `./bin/dev.js --help` to test
4. Update manifest: `pnpm build:manifest`
5. Update README: `pnpm build:readme`
6. Update snapshots: `./bin/dev.js snapshot:generate`
7. Run tests: `pnpm test`

### Adding Extraction Support for New Format

1. Add format detection in `src/lib/extract.ts`
2. Implement extraction logic
3. Add tests in `test/extract.test.ts`
4. Update documentation

### Debugging Downloads

```bash
# Run with debug output
DEBUG=* ./bin/dev.js <url>

# OCLIF debug mode
DEBUG=oclif:* ./bin/dev.js <url>
```

## Integration with @tylerbu/cli

The `@tylerbu/cli` package re-exports dill's download command:

```typescript
// In @tylerbu/cli/src/commands/download.ts
export { default } from "dill-cli/command";
```

This pattern allows sharing command implementations across CLI tools.

## Important Constraints

1. **Part of Monorepo**: Uses `workspace:^` protocol for dependencies
2. **Single Command**: No subcommands, direct invocation
3. **Effection Required**: All async operations use Effection
4. **TypeScript**: Strict mode enabled
5. **OCLIF Structure**: Follow OCLIF conventions
6. **Command Exportable**: Main command must be importable
7. **Biome Formatting**: Code must pass Biome checks

## Dependencies

**Key Runtime Dependencies:**
- `@oclif/core` - CLI framework
- `@tylerbu/cli-api` - Base command classes
- `effection` - Structured concurrency
- `fflate` - Fast compression/decompression
- `nanotar` - TAR archive handling
- `file-type` - File type detection
- `whatwg-mimetype` - MIME type parsing

**Key Dev Dependencies:**
- `vitest` - Testing framework
- `msw` - HTTP request mocking
- `@oclif/plugin-command-snapshot` - Command snapshot testing

## Related Documentation

- **User Docs**: https://dill.tylerbutler.com/
- **API Docs**: Generated via TypeDoc at `dill-docs` package
- **Examples**: See `test/data/` for test files
