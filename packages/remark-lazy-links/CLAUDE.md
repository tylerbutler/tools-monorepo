# CLAUDE.md - remark-lazy-links

Package-specific guidance for the remark lazy links plugin.

## Package Overview

Remark plugin to transform lazy markdown links `[*]` into numbered references. This plugin simplifies writing markdown with many links by allowing you to use `[*]` as a placeholder and automatically generating sequential reference numbers.

**Plugin Type:** Remark (Markdown transformer)
**Use Case:** Simplify link authoring in markdown
**Peer Dependency:** Requires `unified` v11+

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

# Clean build artifacts
pnpm clean
```

## Usage

### Basic Usage

```typescript
import { remark } from "remark";
import remarkLazyLinks from "remark-lazy-links";

const result = await remark()
  .use(remarkLazyLinks)
  .process(markdown);
```

### In Astro/Starlight

```typescript
// astro.config.mjs
import remarkLazyLinks from "remark-lazy-links";

export default {
  markdown: {
    remarkPlugins: [
      remarkLazyLinks,
    ],
  },
};
```

### With Unified Pipeline

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkLazyLinks from "remark-lazy-links";
import remarkStringify from "remark-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkLazyLinks)
  .use(remarkStringify);

const result = await processor.process(markdown);
```

## What It Does

### Input Markdown

```markdown
This is a sentence with a [*].

And another sentence with a [*].

[*]: https://example.com
[*]: https://example.org
```

### Output Markdown

```markdown
This is a sentence with a [1].

And another sentence with a [2].

[1]: https://example.com
[2]: https://example.org
```

**Transformation:**
- Replaces `[*]` with sequential numbers `[1]`, `[2]`, etc.
- Updates corresponding reference definitions
- Maintains link functionality

### Why Use Lazy Links?

**Benefits:**
- Faster writing - don't think about numbering
- Easy reordering - no manual renumbering needed
- Less cognitive load - focus on content, not numbers
- Automatic consistency - plugin ensures correct numbering

**Use Cases:**
- Blog posts with many links
- Documentation with frequent citations
- Academic writing
- Technical articles

## How It Works

### Algorithm

1. **First Pass** - Find all `[*]` link references and `[*]:` definitions
2. **Number Assignment** - Assign sequential numbers starting from 1
3. **AST Transform** - Update markdown AST nodes with numbers
4. **Order Preservation** - Maintain document order

### Implementation Details

```typescript
import { visit } from "mdast-util-from-markdown";
import type { Plugin } from "unified";
import type { Root } from "mdast";

const remarkLazyLinks: Plugin<[], Root> = () => {
  return (tree, file) => {
    let counter = 1;

    // First pass: collect all lazy links
    const lazyLinks: Array<Node> = [];

    visit(tree, "linkReference", (node) => {
      if (node.label === "*") {
        lazyLinks.push(node);
      }
    });

    // Second pass: assign numbers
    for (const link of lazyLinks) {
      link.label = String(counter);
      link.identifier = String(counter);
      counter++;
    }

    // Third pass: update definitions
    counter = 1;
    visit(tree, "definition", (node) => {
      if (node.label === "*") {
        node.label = String(counter);
        node.identifier = String(counter);
        counter++;
      }
    });
  };
};
```

## Project Structure

```
packages/remark-lazy-links/
├── src/
│   └── index.ts           # Plugin implementation
├── esm/                   # Compiled output
├── test/                  # Vitest tests
│   └── index.test.ts
├── package.json
└── tsconfig.json
```

## Testing Strategy

Uses Vitest with remark test utilities:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test:coverage
```

**Test Cases:**
- Single lazy link
- Multiple lazy links
- Mixed lazy and numbered links
- Lazy links without definitions
- Edge cases (empty document, etc.)

**Example Test:**
```typescript
import { test, expect } from "vitest";
import { remark } from "remark";
import remarkLazyLinks from "../src/index.js";

test("transforms lazy links to numbered references", async () => {
  const input = "Link [*] and [*].\n\n[*]: https://a.com\n[*]: https://b.com";

  const result = await remark()
    .use(remarkLazyLinks)
    .process(input);

  expect(result.toString()).toContain("[1]");
  expect(result.toString()).toContain("[2]");
  expect(result.toString()).toContain("[1]: https://a.com");
  expect(result.toString()).toContain("[2]: https://b.com");
});
```

## Common Use Cases

### Blog Writing

```markdown
I recently discovered [*] which is similar to [*].
Both are mentioned in [*].

[*]: https://tool1.com
[*]: https://tool2.com
[*]: https://comparison-article.com
```

Becomes:

```markdown
I recently discovered [1] which is similar to [2].
Both are mentioned in [3].

[1]: https://tool1.com
[2]: https://tool2.com
[3]: https://comparison-article.com
```

### Documentation

```markdown
See the [*] for more details. Also check out [*] and [*].

[*]: https://docs.example.com/intro
[*]: https://docs.example.com/advanced
[*]: https://docs.example.com/api
```

### Academic Citations

```markdown
According to recent studies [*], the method is effective.
Previous work [*] showed similar results.

[*]: https://journal.com/paper1
[*]: https://journal.com/paper2
```

## Advanced Usage

### Mixed Links

The plugin works alongside regular numbered links:

```markdown
Regular link [1] and lazy links [*] and [*].

[1]: https://regular.com
[*]: https://lazy1.com
[*]: https://lazy2.com
```

Becomes:

```markdown
Regular link [1] and lazy links [2] and [3].

[1]: https://regular.com
[2]: https://lazy1.com
[3]: https://lazy2.com
```

### Integration with Other Plugins

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkLazyLinks from "remark-lazy-links";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkLazyLinks)  // Transform before converting to HTML
  .use(remarkRehype);
```

## Important Constraints

1. **Peer Dependency** - Requires unified v11+
2. **Markdown Transform** - Operates on Markdown AST (mdast)
3. **Sequential Numbering** - Always starts from 1
4. **Document Order** - Numbers assigned in document order
5. **TypeScript** - Strict mode enabled
6. **Biome Formatting** - Code must pass Biome checks

## Dependencies

**Runtime:**
- `unified` - Unified text processing framework (peer dependency)
- `mdast-util-from-markdown` - Markdown AST utilities
- `vfile` - Virtual file abstraction

**Dev Dependencies:**
- `remark` - Markdown processor
- `remark-parse` - Markdown parser
- `vitest` - Testing framework

## Limitations

1. **No Custom Numbering** - Always uses 1, 2, 3, ...
2. **No Grouping** - All lazy links numbered sequentially
3. **No Reset** - Counter doesn't reset within document
4. **Order Dependent** - Numbering based on document order

## Future Enhancements

- Support custom number starting point
- Support alpha numbering (a, b, c)
- Support grouped numbering
- Add configuration options
- Support named lazy links `[*topic1]`, `[*topic2]`

## Related Packages

- **rehype-footnotes** - Sister rehype plugin
- **remark-shift-headings** - Sister remark plugin
- **remark-gfm** - Often used together


<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>