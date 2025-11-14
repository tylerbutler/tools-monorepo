# CLAUDE.md - @tylerbu/fundamentals

Package-specific guidance for the fundamental utilities library.

## Package Overview

A collection of fundamental functions and classes commonly needed across projects. This library has **zero dependencies** and provides type-safe utilities for arrays, sets, git operations, and more.

**Key Principle:** Zero runtime dependencies for maximum portability and minimal bundle size.

## Essential Commands

```bash
# Install dependencies (dev only)
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

# Generate API documentation
pnpm build:api

# Generate TypeDoc documentation
pnpm build:docs

# Clean build artifacts
pnpm clean
```

## Module Structure

The package provides multiple entry points for tree-shaking optimization:

```typescript
// Main entry (all utilities)
import { /* ... */ } from "@tylerbu/fundamentals";

// Git utilities only
import { /* ... */ } from "@tylerbu/fundamentals/git";

// Set utilities only
import { /* ... */ } from "@tylerbu/fundamentals/set";
```

### Available Modules

1. **Main Module** (`@tylerbu/fundamentals`)
   - Array utilities
   - String utilities
   - Type utilities
   - General-purpose functions

2. **Git Module** (`@tylerbu/fundamentals/git`)
   - Git repository operations
   - Branch utilities
   - Commit helpers

3. **Set Module** (`@tylerbu/fundamentals/set`)
   - Set operations (union, intersection, difference)
   - Set utilities

## Key Utilities

### Array Utilities

```typescript
import { chunk, unique, groupBy } from "@tylerbu/fundamentals";

// Split array into chunks
const chunks = chunk([1, 2, 3, 4, 5], 2);
// => [[1, 2], [3, 4], [5]]

// Remove duplicates
const uniqueItems = unique([1, 2, 2, 3, 3, 3]);
// => [1, 2, 3]

// Group by key
const grouped = groupBy(
  [{ type: "a", val: 1 }, { type: "b", val: 2 }],
  item => item.type
);
// => Map { "a" => [{ type: "a", val: 1 }], "b" => [...] }
```

### Set Utilities

```typescript
import { union, intersection, difference } from "@tylerbu/fundamentals/set";

const set1 = new Set([1, 2, 3]);
const set2 = new Set([2, 3, 4]);

// Union
const u = union(set1, set2);
// => Set { 1, 2, 3, 4 }

// Intersection
const i = intersection(set1, set2);
// => Set { 2, 3 }

// Difference
const d = difference(set1, set2);
// => Set { 1 }
```

### Git Utilities

```typescript
import { getCurrentBranch, isGitRepo } from "@tylerbu/fundamentals/git";

// Check if directory is a git repo
const isRepo = await isGitRepo("/path/to/dir");

// Get current branch name
const branch = await getCurrentBranch("/path/to/repo");
```

## Project Structure

```
packages/fundamentals/
├── src/
│   ├── index.ts           # Main exports
│   ├── array.ts           # Array utilities
│   ├── string.ts          # String utilities
│   ├── git.ts             # Git utilities (separate export)
│   ├── set.ts             # Set utilities (separate export)
│   └── types.ts           # Type utilities
├── esm/                   # Compiled output
├── test/                  # Vitest tests
├── _temp/                 # Generated API docs
├── package.json
└── tsconfig.json
```

## API Documentation

### Generation

The package uses **API Extractor** for multiple API documentation outputs:

```bash
# Generate all API docs
pnpm build:api

# Individual API configs:
# - api-extractor.json (main)
# - api-extractor.array.json
# - api-extractor.git.json
# - api-extractor.set.json
```

Each entry point has its own API Extractor configuration for modular documentation.

### TypeDoc Documentation

```bash
# Generate TypeDoc markdown docs
pnpm build:docs

# Output: _temp/docs/ (or configured output directory)
```

## Testing Strategy

Uses Vitest for comprehensive testing:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test -- --watch
```

**Test Coverage Requirements:**
- High coverage expected due to zero dependencies
- All utility functions should have unit tests
- Edge cases covered (empty arrays, null values, etc.)

**Test Structure:**
- Test files: `test/**/*.test.ts`
- Coverage output: `.coverage/`

## Design Principles

1. **Zero Dependencies**
   - No runtime dependencies
   - Minimal dev dependencies
   - Maximum portability

2. **Tree-Shakable**
   - Multiple entry points
   - ES modules only
   - Dead code elimination friendly

3. **Type-Safe**
   - Full TypeScript support
   - Strict mode enabled
   - Exported types for all utilities

4. **Small Bundle Size**
   - Pure functions
   - No unnecessary abstractions
   - Optimized for tree-shaking

## Common Patterns

### Adding New Utility Functions

1. Create or update source file in `src/`
2. Export from appropriate module (index.ts, git.ts, etc.)
3. Add types and JSDoc comments
4. Write tests in `test/`
5. Update API Extractor config if adding new entry point
6. Run `pnpm build:api` to generate docs
7. Verify exports work correctly

### Creating New Module Entry Point

1. Create new source file (e.g., `src/newmodule.ts`)
2. Add exports to `package.json`:
   ```json
   {
     "exports": {
       "./newmodule": {
         "import": {
           "types": "./esm/newmodule.d.ts",
           "default": "./esm/newmodule.js"
         }
       }
     }
   }
   ```
3. Create API Extractor config: `api-extractor.newmodule.json`
4. Update `build:api` script to include new config
5. Document the new entry point

## Used By

This package is a foundational dependency used by:
- **@tylerbu/cli-api** - CLI base classes
- **@tylerbu/cli** - Personal CLI tool
- **sort-tsconfig** - TypeScript config sorter
- Other monorepo packages

**Impact:** Changes to this package affect many downstream consumers. Ensure backward compatibility.

## Important Constraints

1. **Zero Runtime Dependencies** - Never add runtime dependencies
2. **ES Modules Only** - No CommonJS support
3. **TypeScript Strict Mode** - All code must pass strict checks
4. **Tree-Shakable** - Keep utilities pure and modular
5. **Biome Formatting** - Code must pass Biome checks
6. **Test Coverage** - High coverage required for reliability

## API Stability

**Versioning:**
- Follow semantic versioning
- Breaking changes = major version bump
- New utilities = minor version bump
- Bug fixes = patch version bump

**Deprecation:**
- Mark deprecated with JSDoc `@deprecated`
- Keep deprecated code for at least one major version
- Document migration path in deprecation notice

## Performance Considerations

- All utilities are synchronous (except git operations)
- No unnecessary allocations
- Optimized for common use cases
- Prefer native methods when available

## Documentation

**Inline Documentation:**
- JSDoc comments for all exported functions
- Include `@param`, `@returns`, `@example` tags
- Document edge cases and limitations

**Generated Documentation:**
- API Extractor JSON (.api.json files)
- TypeDoc markdown in `_temp/docs/`
- Consumed by documentation sites
