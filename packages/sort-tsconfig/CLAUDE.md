# CLAUDE.md - sort-tsconfig

Package-specific guidance for the TypeScript config sorting tool.

## Package Overview

Command-line tool and library to sort tsconfig.json files. Provides both a CLI (`sort-tsconfig`) and a Repopo policy for automatic enforcement. Keeps TypeScript configuration files clean and consistent.

**Binary:** `sort-tsconfig`
**Dev Mode:** `./bin/dev.js`
**Prod Mode:** `./bin/run.js`
**Repopo Integration:** Exports `SortTsconfigsPolicy` for repository policy enforcement

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

## Using sort-tsconfig CLI

```bash
# Development mode (no compilation needed)
./bin/dev.js [path]

# Sort specific file
./bin/dev.js ./tsconfig.json

# Sort all tsconfig files in directory
./bin/dev.js .

# Dry run (check without modifying)
./bin/dev.js --check

# Production mode
sort-tsconfig [path]

# Show help
sort-tsconfig --help
```

## Command Structure

Uses a **single-command strategy** in OCLIF - the main command is directly accessible:

```
src/
├── commands/
│   └── sort-tsconfig.ts   # Main sort command
├── lib/
│   ├── sort.ts            # Sorting implementation
│   ├── policy.ts          # Repopo policy
│   └── utils.ts           # Utilities
└── index.ts              # Public API exports
```

**Exportable Command:**
The sort command is exported at `sort-tsconfig/command` for reuse in other CLI tools.

## Key Features

### Sorting Algorithm

Sorts tsconfig.json properties in a logical order:

1. **Metadata** - `$schema`, `extends`
2. **Compiler Options** - All options in `compilerOptions`
3. **File Inclusion** - `include`, `exclude`, `files`
4. **References** - `references` array
5. **Watch Options** - `watchOptions`
6. **Type Acquisition** - `typeAcquisition`

**Preserves:**
- Comments (JSONC format)
- Indentation style
- Nested structure

### JSONC Support

Handles TypeScript's JSON with Comments format:

```jsonc
{
  // This comment is preserved
  "compilerOptions": {
    "strict": true  // So is this one
  }
}
```

Uses `tiny-jsonc` for parsing and `sort-jsonc` for sorting.

### Glob Pattern Matching

```bash
# Sort all tsconfig files in project
sort-tsconfig .

# Finds:
# - tsconfig.json
# - tsconfig.*.json
# - */tsconfig.json
# - */tsconfig.*.json
```

Uses `tinyglobby` for efficient file discovery.

## Repopo Policy Integration

### Exporting Policy

```typescript
// sort-tsconfig exports a Repopo policy
export { SortTsconfigsPolicy } from "sort-tsconfig";
```

### Using in repopo.config.ts

```typescript
import { makePolicy, type RepopoConfig } from "repopo";
import { SortTsconfigsPolicy } from "sort-tsconfig";

const config: RepopoConfig = {
  policies: [
    makePolicy(SortTsconfigsPolicy),
  ],
};

export default config;
```

**Policy Behavior:**
- Matches all `**/tsconfig*.json` files
- Checks if files are sorted
- Auto-fixes by sorting when `--fix` flag is used
- Reports violations in CI

### Policy Configuration

```typescript
makePolicy(SortTsconfigsPolicy, undefined, {
  excludeFiles: ["**/node_modules/**"]  // Exclude specific paths
})
```

## Project Structure

```
packages/sort-tsconfig/
├── src/
│   ├── commands/
│   │   └── sort-tsconfig.ts  # CLI command
│   ├── lib/
│   │   ├── sort.ts           # Core sorting logic
│   │   └── policy.ts         # Repopo policy
│   └── index.ts              # Public exports
├── esm/                      # Compiled output
├── test/                     # Tests
├── bin/                      # Binary entry points
├── oclif.manifest.json       # Auto-generated
└── package.json
```

## API Usage

### As a Library

```typescript
import { sortTsconfig } from "sort-tsconfig";

// Sort tsconfig content
const sorted = sortTsconfig(content);

// Or sort file
import { readFileSync, writeFileSync } from "node:fs";

const content = readFileSync("tsconfig.json", "utf-8");
const sorted = sortTsconfig(content);
writeFileSync("tsconfig.json", sorted);
```

### Detecting Sort Status

```typescript
import { isTsconfigSorted } from "sort-tsconfig";

const content = readFileSync("tsconfig.json", "utf-8");

if (!isTsconfigSorted(content)) {
  console.log("tsconfig.json needs sorting");
}
```

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

**Test Coverage:**
- Sorting algorithm correctness
- JSONC comment preservation
- Indentation preservation
- Edge cases (empty files, malformed JSON)
- Glob pattern matching

### Command Snapshot Tests

```bash
# Generate snapshots
./bin/dev.js snapshot:generate --filepath test/commands/_snapshots/commands.json

# Verify snapshots
./bin/dev.js snapshot:compare --filepath test/commands/_snapshots/commands.json
```

Uses `@oclif/plugin-command-snapshot` to validate command structure.

## Common Workflows

### Adding to Existing Project

1. Install: `pnpm add -D sort-tsconfig`
2. Sort files: `npx sort-tsconfig .`
3. Add to package.json scripts:
   ```json
   {
     "scripts": {
       "sort:tsconfig": "sort-tsconfig ."
     }
   }
   ```
4. Optional: Add Repopo policy for enforcement

### Pre-Commit Hook

```bash
# Using lint-staged
# .lintstagedrc.json
{
  "**/tsconfig*.json": ["sort-tsconfig"]
}
```

### CI Validation

```bash
# Check if files are sorted (fails if not)
sort-tsconfig --check .
```

### Integration with Repopo

```bash
# In monorepo with repopo
./packages/repopo/bin/dev.js check --fix

# Automatically sorts all tsconfig files
```

## Sort Order Reference

### Top-Level Properties

1. `$schema`
2. `extends`
3. `compilerOptions`
4. `include`
5. `exclude`
6. `files`
7. `references`
8. `watchOptions`
9. `typeAcquisition`

### Compiler Options

Sorted alphabetically within categories:
- Paths and modules
- Language and environment
- Type checking
- Emit
- Advanced

## Important Constraints

1. **Part of Monorepo** - Uses `workspace:^` protocol
2. **Single Command** - No subcommands
3. **JSONC Format** - Must preserve comments
4. **OCLIF Structure** - Follow OCLIF conventions
5. **Repopo Integration** - Exports policy for enforcement
6. **TypeScript** - Strict mode enabled
7. **Biome Formatting** - Code must pass Biome checks

## Dependencies

**Key Runtime Dependencies:**
- `@oclif/core` - CLI framework
- `@tylerbu/cli-api` - Base command classes
- `@tylerbu/fundamentals` - Shared utilities
- `tiny-jsonc` - JSONC parser
- `sort-jsonc` - JSONC sorter
- `tinyglobby` - File globbing
- `detect-indent` - Indentation detection

**Peer Dependencies:**
- `repopo` (optional) - For policy integration

**Key Dev Dependencies:**
- `vitest` - Testing framework
- `memfs` - In-memory filesystem for tests
- `@oclif/plugin-command-snapshot` - Snapshot testing

## Related Packages

- **repopo** - Policy enforcement (consumer)
- **@tylerbu/cli-api** - Base command infrastructure
- **@tylerbu/fundamentals** - Shared utilities

## Future Enhancements

- Support custom sort orders
- Add configuration file support
- Support other JSON config files (package.json sorting already handled by sort-package-json)
- Add watch mode
- Support automatic fixing in editor integrations
