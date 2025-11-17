# CLAUDE.md - remark-shift-headings

Package-specific guidance for the remark shift headings plugin.

## Package Overview

Remark plugin to shift heading levels based on rendering context. This plugin adjusts heading levels (h1→h2, h2→h3, etc.) to maintain proper document hierarchy when embedding markdown content in different contexts.

**Plugin Type:** Remark (Markdown transformer)
**Use Case:** Adjust heading levels for content reuse
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
import remarkShiftHeadings from "remark-shift-headings";

// Shift all headings down by 1 level
const result = await remark()
  .use(remarkShiftHeadings, { shift: 1 })
  .process(markdown);
```

### Configuration Options

```typescript
interface ShiftHeadingsOptions {
  shift: number;  // Number of levels to shift (positive = down, negative = up)
}

// Shift down 2 levels (h1 → h3, h2 → h4)
.use(remarkShiftHeadings, { shift: 2 })

// Shift up 1 level (h2 → h1, h3 → h2)
.use(remarkShiftHeadings, { shift: -1 })
```

### In Astro/Starlight

```typescript
// astro.config.mjs
import remarkShiftHeadings from "remark-shift-headings";

export default {
  markdown: {
    remarkPlugins: [
      [remarkShiftHeadings, { shift: 1 }],
    ],
  },
};
```

### With Unified Pipeline

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkShiftHeadings from "remark-shift-headings";
import remarkStringify from "remark-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkShiftHeadings, { shift: 1 })
  .use(remarkStringify);

const result = await processor.process(markdown);
```

## What It Does

### Input Markdown

```markdown
# Main Title

## Section

### Subsection

#### Detail
```

### Output with `shift: 1`

```markdown
## Main Title

### Section

#### Subsection

##### Detail
```

### Output with `shift: -1`

```markdown
(h1 stays h1 - minimum level)

# Section

## Subsection

### Detail
```

**Rules:**
- Positive shift: Increase heading levels (h1→h2, h2→h3)
- Negative shift: Decrease heading levels (h3→h2, h2→h1)
- Minimum level: h1 (headings don't go below h1)
- Maximum level: h6 (headings don't go beyond h6)

## Use Cases

### Content Reuse

**Problem:** You have a markdown document that starts with h1, but you want to embed it in a page that already has an h1:

```markdown
<!-- Main page -->
# My Website

<!-- Embedded content starts with h1 -->
# Article Title

## Article Section
```

**Solution:** Shift embedded content down:

```markdown
# My Website

## Article Title

### Article Section
```

### Component-Based Documentation

```typescript
// Render markdown component with adjusted headings
function MarkdownComponent({ content, level }: Props) {
  const processor = remark()
    .use(remarkShiftHeadings, { shift: level })
    .use(remarkRehype)
    .use(rehypeStringify);

  return processor.process(content);
}

// Use h1 in source, but render as h3 in context
<MarkdownComponent content={articleMd} level={2} />
```

### Multi-Level Content

```typescript
// Top-level page (no shift)
const pageContent = await processMarkdown(md, 0);

// Section content (shift down 1)
const sectionContent = await processMarkdown(md, 1);

// Subsection content (shift down 2)
const subsectionContent = await processMarkdown(md, 2);
```

### API Documentation

Embedding API docs with proper heading hierarchy:

```typescript
// Main docs page has h1
// API reference should start at h2
const apiDocs = await remark()
  .use(remarkShiftHeadings, { shift: 1 })
  .process(apiMarkdown);
```

## Project Structure

```
packages/remark-shift-headings/
├── src/
│   └── index.ts           # Plugin implementation
├── esm/                   # Compiled output
├── test/                  # Vitest tests
│   └── index.test.ts
├── package.json
└── tsconfig.json
```

## Plugin Implementation

### Core Logic

```typescript
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Heading } from "mdast";

interface Options {
  shift: number;
}

const remarkShiftHeadings: Plugin<[Options?], Root> = (options = { shift: 0 }) => {
  return (tree) => {
    visit(tree, "heading", (node: Heading) => {
      let newDepth = node.depth + options.shift;

      // Clamp to valid range (1-6)
      newDepth = Math.max(1, Math.min(6, newDepth));

      node.depth = newDepth as 1 | 2 | 3 | 4 | 5 | 6;
    });
  };
};

export default remarkShiftHeadings;
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
- Shift down by 1
- Shift down by 2+
- Shift up by 1
- Shift up with clamping at h1
- Shift down with clamping at h6
- No shift (identity)
- Edge cases

**Example Test:**
```typescript
import { test, expect } from "vitest";
import { remark } from "remark";
import remarkShiftHeadings from "../src/index.js";

test("shifts headings down by 1 level", async () => {
  const input = "# Title\n\n## Section\n\n### Subsection";

  const result = await remark()
    .use(remarkShiftHeadings, { shift: 1 })
    .process(input);

  const output = result.toString();
  expect(output).toContain("## Title");
  expect(output).toContain("### Section");
  expect(output).toContain("#### Subsection");
});

test("clamps at h1 minimum", async () => {
  const input = "## Section";

  const result = await remark()
    .use(remarkShiftHeadings, { shift: -2 })
    .process(input);

  expect(result.toString()).toContain("# Section");
});

test("clamps at h6 maximum", async () => {
  const input = "###### Deep";

  const result = await remark()
    .use(remarkShiftHeadings, { shift: 2 })
    .process(input);

  expect(result.toString()).toContain("###### Deep");
});
```

## Advanced Usage

### Dynamic Shifting Based on Context

```typescript
import { VFile } from "vfile";

function createProcessor(context: "page" | "section" | "subsection") {
  const shiftMap = {
    page: 0,
    section: 1,
    subsection: 2,
  };

  return remark()
    .use(remarkShiftHeadings, { shift: shiftMap[context] });
}

// Use in different contexts
const pageProcessor = createProcessor("page");
const sectionProcessor = createProcessor("section");
```

### Conditional Shifting

```typescript
import { VFile } from "vfile";

const processor = remark()
  .use(() => (tree, file: VFile) => {
    // Get shift from frontmatter
    const shift = file.data.frontmatter?.headingShift ?? 0;

    // Apply shift dynamically
    visit(tree, "heading", (node: Heading) => {
      node.depth = Math.max(1, Math.min(6, node.depth + shift));
    });
  });
```

## Important Constraints

1. **Peer Dependency** - Requires unified v11+
2. **Markdown Transform** - Operates on Markdown AST (mdast)
3. **Level Clamping** - Always clamps to h1-h6 range
4. **Type Safety** - Heading depth is typed as `1 | 2 | 3 | 4 | 5 | 6`
5. **TypeScript** - Strict mode enabled
6. **Biome Formatting** - Code must pass Biome checks

## Dependencies

**Runtime:**
- `unified` - Unified text processing framework (peer dependency)
- `unist-util-visit` - AST visitor utility
- `vfile` - Virtual file abstraction

**Dev Dependencies:**
- `remark` - Markdown processor
- `remark-parse` - Markdown parser
- `vitest` - Testing framework

## Limitations

1. **Fixed Shift** - Shift amount must be known at processing time
2. **No Conditional Logic** - Can't shift specific headings differently
3. **No Context Awareness** - Doesn't analyze document structure
4. **Simple Algorithm** - Just adds/subtracts from depth

## Future Enhancements

- Support heading-specific rules
- Add option to preserve h1 (never shift first h1)
- Support heading ID preservation
- Add option to maintain relative structure only
- Support custom depth ranges

## Related Packages

- **rehype-footnotes** - Sister rehype plugin
- **remark-lazy-links** - Sister remark plugin
- Often used with content management systems

## Real-World Example

### Astro Component

```astro
---
import { remark } from "remark";
import remarkShiftHeadings from "remark-shift-headings";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

interface Props {
  content: string;
  level: number;
}

const { content, level } = Astro.props;

const html = await remark()
  .use(remarkShiftHeadings, { shift: level })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(content);
---

<div set:html={html} />
```

Usage:

```astro
<Layout>
  <h1>Main Page Title</h1>

  <!-- Markdown starts with h1, but renders as h2+ -->
  <MarkdownContent content={articleMd} level={1} />
</Layout>
```
