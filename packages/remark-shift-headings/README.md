# remark-shift-headings

Remark plugin to shift heading levels based on rendering context.

## Why?

When building content sites with frameworks like Astro, you often have different heading requirements for different contexts:

- **Content collections** (articles, blog posts): The page title is typically an `<h1>` in the layout, so your markdown content should start at `<h2>`
- **Standalone pages**: No layout title, so markdown content can start at `<h1>`

This plugin automatically adjusts heading levels based on context, with support for:
- Auto-detection of content collections via file path
- Runtime context setting (for Container API usage)
- Frontmatter overrides for per-page control

## Installation

```bash
pnpm add remark-shift-headings
```

## Usage

### Basic Usage (Astro)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { remarkShiftHeadings } from 'remark-shift-headings';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkShiftHeadings],
  },
});
```

### With Custom Options

```js
remarkPlugins: [
  [remarkShiftHeadings, {
    defaultCollectionLevel: 2,  // Start at h2 for collections (default: 2)
    defaultPageLevel: 1,        // Start at h1 for pages (default: 1)
    maxLevel: 6,                // Maximum heading level (default: 6)
  }]
],
```

### Per-Page Override

Use frontmatter to override the heading start level for specific pages:

```markdown
---
headingStartLevel: 3
---

# This becomes h3
## This becomes h4
```

### Runtime Context (Container API)

When using Astro's Container API or similar, you can set the context level at runtime:

```js
const result = await remark()
  .use(remarkShiftHeadings)
  .process({
    value: markdown,
    data: {
      headingStartLevel: 2,  // Force h2 start level
    },
  });
```

## How It Works

The plugin determines the target heading level using a 3-tier strategy:

1. **Frontmatter override** (`headingStartLevel` in metadata)
2. **Runtime context** (set via `file.data.headingStartLevel`)
3. **Auto-detect** (checks file path for `/src/content/(articles|projects)/`)

Once the target level is determined:
1. Finds the minimum heading level in your content (e.g., `# H1` = level 1)
2. Calculates the shift needed (e.g., target h2 - current h1 = shift by 1)
3. Applies the shift to all headings, clamping to valid range (1-6)

## Examples

### Content Collection (Auto-detected)

**Input** (`/src/content/articles/my-post.md`):
```markdown
# Introduction
## Details
### More Info
```

**Output** (starts at h2):
```markdown
## Introduction
### Details
#### More Info
```

### Standalone Page

**Input** (`/src/pages/about.md`):
```markdown
## About Us
### Our Team
```

**Output** (starts at h1, no change since min level is already h2):
```markdown
## About Us
### Our Team
```

### With Max Level Clamping

**Input** with `maxLevel: 4`:
```markdown
# H1
##### H5
###### H6
```

**Output** (h2 start, but h5/h6 clamped to h4):
```markdown
## H1
#### H5
#### H6
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultCollectionLevel` | `number` | `2` | Starting heading level for content collections |
| `defaultPageLevel` | `number` | `1` | Starting heading level for standalone pages |
| `maxLevel` | `number` | `6` | Maximum heading level (clamps higher levels) |

## License

MIT © Tyler Butler
