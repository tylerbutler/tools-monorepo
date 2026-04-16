# remark-lazy-links

Remark plugin to transform lazy markdown links `[*]` into numbered references.

## Why?

Inspired by [Brett Terpstra's lazy markdown reference links](http://brettterpstra.com/2013/10/19/lazy-markdown-reference-links/), this plugin lets you write markdown links faster by using `[*]` as a placeholder instead of manually numbering references.

**Write this:**
```markdown
Check out [this article][*] and [this one][*].

[*]: https://example.com/article-1
[*]: https://example.com/article-2
```

**Get this:**
```markdown
Check out [this article][1] and [this one][2].

[1]: https://example.com/article-1
[2]: https://example.com/article-2
```

## Features

- Automatically numbers lazy link references
- Preserves existing numbered links (avoids conflicts)
- Handles multiple overlapping lazy links
- Optional persistence (write changes back to source files)
- Zero configuration required

## Installation

```bash
pnpm add remark-lazy-links
```

## Usage

### Basic Usage (In-Memory Transformation)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { remarkLazyLinks } from 'remark-lazy-links';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkLazyLinks],
  },
});
```

By default, transformation happens in-memory during build. Your source files remain unchanged with `[*]` markers.

### With Persistence (Write to Source Files)

```js
remarkPlugins: [
  [remarkLazyLinks, { persist: true }]
],
```

When `persist: true`, the plugin writes transformed content back to source files, permanently replacing `[*]` with numbered links.

**Use cases for persistence:**
- You want the numbered format to be canonical
- You need to use files in tools that don't support this plugin
- You prefer to see actual numbers in your source files

## How It Works

1. **Find existing numbered links** - Scans for `[N]:` patterns to determine highest number
2. **Start counting** - Begins numbering lazy links from max + 1
3. **Transform pairs** - Replaces each `[text][*]` ... `[*]:` pair with sequential numbers
4. **Update content** - Modifies content in-memory (or writes to file if persist enabled)

## Examples

### Basic Transformation

**Input:**
```markdown
[link text][*]

[*]: http://example.com
```

**Output:**
```markdown
[link text][1]

[1]: http://example.com
```

### Multiple Lazy Links

**Input:**
```markdown
Read [article 1][*] and [article 2][*].

[*]: https://example.com/1
[*]: https://example.com/2
```

**Output:**
```markdown
Read [article 1][1] and [article 2][2].

[1]: https://example.com/1
[2]: https://example.com/2
```

### Mixed with Existing Numbered Links

**Input:**
```markdown
[existing][1] and [lazy][*]

[1]: http://existing.com
[*]: http://lazy.com
```

**Output:**
```markdown
[existing][1] and [lazy][2]

[1]: http://existing.com
[2]: http://lazy.com
```

### Handling Gaps in Numbering

**Input:**
```markdown
[one][1] and [five][5] and [lazy][*]

[1]: http://one.com
[5]: http://five.com
[*]: http://lazy.com
```

**Output:**
```markdown
[one][1] and [five][5] and [lazy][6]

[1]: http://one.com
[5]: http://five.com
[6]: http://lazy.com
```

The plugin continues from the highest existing number (5), so the lazy link becomes [6].

### Complex Link Text

**Input:**
```markdown
[**bold** and _italic_ text][*]

[*]: http://example.com
```

**Output:**
```markdown
[**bold** and _italic_ text][1]

[1]: http://example.com
```

### With URL Titles

**Input:**
```markdown
[link][*]

[*]: http://example.com "Optional Title"
```

**Output:**
```markdown
[link][1]

[1]: http://example.com "Optional Title"
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `persist` | `boolean` | `false` | Write transformed content back to source files |

## Workflow Recommendations

### Development Workflow (Default)

Use default settings during development:
```js
remarkPlugins: [remarkLazyLinks],
```

Benefits:
- Keep source files clean with `[*]` markers
- Transformation happens automatically during build
- No git diffs from automated numbering

### Production Workflow (Persist)

Enable persistence for final versions:
```js
remarkPlugins: [
  [remarkLazyLinks, { persist: true }]
],
```

Benefits:
- Source files show actual numbered links
- Content works in any markdown renderer
- Easier to review/edit without plugin

## Brett Terpstra's Original Workflow

Brett Terpstra's original post describes using TextExpander snippets and text editor macros to transform lazy links. This plugin brings that workflow to the unified/remark ecosystem, making it:

- Automatic (no manual triggering)
- Build-time (no editor dependency)
- Configurable (in-memory or persistent)
- Framework-agnostic (works with any remark-based tool)

## Requirements

- **Peer dependency**: `unified` ^11.0.0
- **Node**: >= 18.0.0

## Caveats

- The plugin uses regex matching, so very complex markdown structures might not work perfectly
- Persistence writes to disk, so use with caution in production builds
- Only supports the `[*]` syntax, not other lazy patterns

## License

MIT © Tyler Butler
