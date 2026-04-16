# CLAUDE.md - @tylerbu/xkcd2-api

Package-specific guidance for the xkcd2.com API library.

## Package Overview

TypeScript APIs and types used in implementations of xkcd2.com. This library provides type definitions, interfaces, and utilities for working with XKCD comic data and related functionality.

**Purpose:** Shared types and APIs for xkcd2.com projects
**Target Site:** xkcd2.com (personal XKCD-related project)

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

# Generate API documentation
pnpm build:api

# Generate TypeDoc documentation
pnpm build:docs

# Clean build artifacts
pnpm clean
```

## Project Structure

```
packages/xkcd2-api/
├── src/
│   ├── index.ts           # Main exports
│   ├── types.ts           # Type definitions
│   ├── comic.ts           # Comic-related APIs
│   └── utils.ts           # Utility functions
├── esm/                   # Compiled output
├── test/                  # Vitest tests
├── _temp/                 # Generated documentation
├── package.json
└── tsconfig.json
```

## Key Exports

### Comic Types

```typescript
import type { Comic, ComicMetadata, ComicInfo } from "@tylerbu/xkcd2-api";

interface Comic {
  num: number;           // Comic number
  title: string;         // Comic title
  img: string;           // Image URL
  alt: string;           // Alt text
  transcript?: string;   // Transcript (if available)
  link?: string;         // Link (if available)
  news?: string;         // News (if available)
  safe_title: string;    // URL-safe title
  year: string;          // Publication year
  month: string;         // Publication month
  day: string;           // Publication day
}
```

### API Functions

```typescript
import { getComic, getLatestComic, searchComics } from "@tylerbu/xkcd2-api";

// Get specific comic by number
const comic = await getComic(123);

// Get latest comic
const latest = await getLatestComic();

// Search comics
const results = await searchComics("science");
```

## XKCD API

### Official XKCD API

The official XKCD API provides JSON data:

```
# Latest comic
https://xkcd.com/info.0.json

# Specific comic
https://xkcd.com/614/info.0.json
```

**Response Format:**
```json
{
  "num": 614,
  "title": "Woodpecker",
  "safe_title": "Woodpecker",
  "img": "https://imgs.xkcd.com/comics/woodpecker.png",
  "alt": "If you don't have an extension cord...",
  "year": "2009",
  "month": "7",
  "day": "24",
  "transcript": "...",
  "link": "",
  "news": ""
}
```

### Wrapper Functions

This library provides typed wrappers around the XKCD API:

```typescript
// Type-safe comic fetching
const comic: Comic = await getComic(614);

// Type-safe latest comic
const latest: Comic = await getLatestComic();

// Validate comic data
const isValid = validateComic(data);
```

## Common Use Cases

### Fetching Comics

```typescript
import { getComic } from "@tylerbu/xkcd2-api";

// Get a specific comic
try {
  const comic = await getComic(1);
  console.log(comic.title);
  console.log(comic.img);
  console.log(comic.alt);
} catch (error) {
  console.error("Failed to fetch comic", error);
}
```

### Working with Metadata

```typescript
import { ComicMetadata, parseComicDate } from "@tylerbu/xkcd2-api";

const metadata: ComicMetadata = {
  num: 614,
  title: "Woodpecker",
  publishDate: parseComicDate("2009", "7", "24"),
};
```

### Caching

```typescript
import { ComicCache } from "@tylerbu/xkcd2-api";

const cache = new ComicCache();

// Fetch with caching
const comic = await cache.get(614);

// Check if cached
if (cache.has(614)) {
  const cached = cache.get(614);
}
```

## Development Workflow

### Adding New Types

1. Add type definition in `src/types.ts`
2. Export from `src/index.ts`
3. Write tests in `test/types.test.ts`
4. Run `pnpm build:api` to generate docs
5. Update documentation

### Adding New Functions

1. Implement function in appropriate module
2. Add JSDoc comments
3. Export from `src/index.ts`
4. Write unit tests
5. Run tests: `pnpm test`
6. Generate docs: `pnpm build:docs`

## Testing Strategy

Uses Vitest for unit testing:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test:coverage
```

**Test Coverage:**
- Type validation
- API wrapper functions
- Utility functions
- Edge cases

**Example Test:**
```typescript
import { test, expect } from "vitest";
import { validateComic } from "../src/index.js";

test("validates comic data", () => {
  const validComic = {
    num: 1,
    title: "Test",
    img: "https://example.com/image.png",
    alt: "Alt text",
    safe_title: "Test",
    year: "2023",
    month: "1",
    day: "1",
  };

  expect(validateComic(validComic)).toBe(true);
});
```

## API Documentation

### Generation

The package uses **API Extractor** and **TypeDoc**:

```bash
# Generate API Extractor documentation
pnpm build:api

# Generate TypeDoc documentation
pnpm build:docs
```

**Outputs:**
- API Extractor: `_temp/api-extractor/`
- TypeDoc: `_temp/docs/` (markdown format)

### Documentation Comments

Use JSDoc format for all public APIs:

```typescript
/**
 * Fetches a specific XKCD comic by number.
 *
 * @param num - The comic number to fetch
 * @returns A promise that resolves to the comic data
 * @throws {Error} If the comic doesn't exist or fetch fails
 *
 * @example
 * ```typescript
 * const comic = await getComic(614);
 * console.log(comic.title);
 * ```
 */
export async function getComic(num: number): Promise<Comic> {
  // Implementation
}
```

## Important Constraints

1. **Part of Monorepo** - Standard monorepo package
2. **Zero Runtime Dependencies** - Keep dependencies minimal
3. **TypeScript** - Strict mode enabled
4. **Type Safety** - All APIs fully typed
5. **API Wrapper** - Wraps official XKCD API
6. **Biome Formatting** - Code must pass Biome checks

## Dependencies

**Dev Dependencies:**
- `@biomejs/biome` - Formatting and linting
- `@microsoft/api-extractor` - API documentation
- `typedoc` - TypeScript documentation
- `vitest` - Testing framework
- `typescript` - TypeScript compiler

**No Runtime Dependencies** - Keeps bundle size minimal

## Integration

This package is used by:
- xkcd2.com website
- Related xkcd2 projects
- Personal tools for XKCD comic analysis

## Future Enhancements

- Add comic search functionality
- Implement local caching layer
- Add comic recommendation engine
- Support bulk comic fetching
- Add transcript parsing utilities
- Implement comic metadata enrichment

## XKCD Resources

**Official:**
- XKCD Website: https://xkcd.com
- XKCD API: https://xkcd.com/json.html
- XKCD Archive: https://xkcd.com/archive/

**Community:**
- Explain XKCD: https://www.explainxkcd.com/
- XKCD on GitHub: Various community projects

## Related Packages

This is a standalone API package with no direct dependencies on other monorepo packages. It follows the same development practices and tooling as other packages in the monorepo.
