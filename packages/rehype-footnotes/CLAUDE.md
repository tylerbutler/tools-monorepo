# CLAUDE.md - rehype-footnotes

Package-specific guidance for the rehype footnotes plugin.

## Package Overview

Rehype plugin to transform GitHub Flavored Markdown (GFM) footnotes for Littlefoot.js integration. This plugin modifies the HTML structure of footnotes to work with Littlefoot's popover footnote library.

**Plugin Type:** Rehype (HTML transformer)
**Use Case:** Convert GFM footnotes to Littlefoot-compatible format
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
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeFootnotes from "rehype-footnotes";
import rehypeStringify from "rehype-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)          // GFM support (includes footnotes)
  .use(remarkRehype)
  .use(rehypeFootnotes)    // Transform footnotes for Littlefoot
  .use(rehypeStringify);

const result = await processor.process(markdown);
```

### In Astro/Starlight

```typescript
// astro.config.mjs
import rehypeFootnotes from "rehype-footnotes";

export default {
  markdown: {
    rehypePlugins: [
      rehypeFootnotes,
    ],
  },
};
```

### With Remark

```typescript
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeFootnotes from "rehype-footnotes";

const result = await remark()
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeFootnotes)
  .process(markdown);
```

## What It Does

### GFM Footnote Syntax

```markdown
Here is a sentence with a footnote[^1].

[^1]: This is the footnote content.
```

### Default GFM Output

```html
<p>Here is a sentence with a footnote<sup><a href="#fn-1" id="fnref-1">1</a></sup>.</p>

<section data-footnotes>
  <ol>
    <li id="fn-1">
      <p>This is the footnote content. <a href="#fnref-1">↩</a></p>
    </li>
  </ol>
</section>
```

### After rehype-footnotes Transform

```html
<p>Here is a sentence with a footnote<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup>.</p>

<section data-footnotes class="footnotes">
  <ol>
    <li id="fn-1">
      <p>This is the footnote content.</p>
      <a href="#fnref-1" data-footnote-backref>↩</a>
    </li>
  </ol>
</section>
```

**Key Changes:**
- Adds `data-footnote-ref` attribute to footnote references
- Adds `data-footnote-backref` attribute to back-references
- Adds `footnotes` class to footnotes section
- Restructures backref links for Littlefoot compatibility

## Integration with Littlefoot.js

### Setup

```html
<!-- Include Littlefoot CSS and JS -->
<link rel="stylesheet" href="littlefoot.css">
<script src="littlefoot.js"></script>

<script>
  // Initialize Littlefoot
  littlefoot.littlefoot({
    activateOnHover: true,
    allowDuplicates: true,
  });
</script>
```

### Result

Footnotes appear as popover tooltips when hovering/clicking the footnote number, instead of jumping to the bottom of the page.

## Project Structure

```
packages/rehype-footnotes/
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
import type { Root } from "hast";

const rehypeFootnotes: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node) => {
      // Transform footnote references
      if (isFootnoteRef(node)) {
        node.properties.dataFootnoteRef = true;
      }

      // Transform footnote back-references
      if (isFootnoteBackref(node)) {
        node.properties.dataFootnoteBackref = true;
      }

      // Add class to footnotes section
      if (isFootnotesSection(node)) {
        node.properties.className = "footnotes";
      }
    });
  };
};
```

## Testing Strategy

Uses Vitest with remark/rehype test utilities:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test:coverage
```

**Test Structure:**
- Input: Markdown with GFM footnotes
- Process: remark-gfm → remark-rehype → rehype-footnotes
- Output: Verify HTML structure with correct attributes

**Example Test:**
```typescript
import { test, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeFootnotes from "../src/index.js";
import rehypeStringify from "rehype-stringify";

test("transforms footnotes for Littlefoot", async () => {
  const input = "Text[^1].\n\n[^1]: Footnote.";

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeFootnotes)
    .use(rehypeStringify)
    .process(input);

  expect(result.toString()).toContain('data-footnote-ref');
  expect(result.toString()).toContain('data-footnote-backref');
  expect(result.toString()).toContain('class="footnotes"');
});
```

## Common Use Cases

### Astro Blog

```typescript
// astro.config.mjs
import { defineConfig } from "astro/config";
import rehypeFootnotes from "rehype-footnotes";

export default defineConfig({
  markdown: {
    remarkPlugins: [
      "remark-gfm",
    ],
    rehypePlugins: [
      rehypeFootnotes,
    ],
  },
});
```

### Static Site Generator

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeFootnotes from "rehype-footnotes";
import rehypeStringify from "rehype-stringify";

async function processMarkdown(markdown: string) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeFootnotes)
    .use(rehypeStringify)
    .process(markdown);
}
```

## Important Constraints

1. **GFM Required** - Requires remark-gfm for footnote syntax support
2. **Peer Dependency** - Requires unified v11+
3. **HTML Transform** - Operates on HTML (rehype), not Markdown (remark)
4. **Littlefoot Target** - Designed specifically for Littlefoot.js
5. **TypeScript** - Strict mode enabled
6. **Biome Formatting** - Code must pass Biome checks

## Dependencies

**Runtime:**
- `unified` - Unified text processing framework (peer dependency)
- `unist-util-visit` - AST visitor utility

**Dev Dependencies:**
- `rehype` - HTML processor
- `remark` - Markdown processor
- `remark-gfm` - GitHub Flavored Markdown support
- `remark-rehype` - Markdown to HTML bridge
- `vitest` - Testing framework

## Alternatives

### Other Footnote Solutions

1. **Native GFM** - Use default GFM footnotes (no popover)
2. **Custom CSS** - Style footnotes with CSS only
3. **Other Plugins** - rehype-footnote-titles, remark-footnotes
4. **Manual HTML** - Write footnotes directly in HTML

## Future Enhancements

- Support configuration options
- Add support for other footnote libraries
- Improve accessibility attributes
- Add support for multiple footnote formats

## Related Packages

- **remark-lazy-links** - Sister remark plugin
- **remark-shift-headings** - Sister remark plugin
- **Littlefoot.js** - Target library for footnote popovers


<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>