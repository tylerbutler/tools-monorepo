# rehype-footnotes

Rehype plugin to transform GFM footnotes for Littlefoot.js integration.

## Why?

[Littlefoot.js](https://littlefoot.js.org/) provides beautiful, accessible, interactive footnotes. However, it requires specific HTML attributes and structure that don't match GitHub Flavored Markdown (GFM) footnote output.

This plugin bridges the gap by:
- Transforming GFM footnote references to include `rel="footnote"` attributes
- Adjusting footnote definition IDs to match Littlefoot's expected format
- Removing back-reference links (↩) since Littlefoot handles these
- Providing helper functions to generate Littlefoot initialization code and CSS

## Installation

```bash
pnpm add rehype-footnotes
pnpm add littlefoot  # Peer dependency
```

## Usage

### Basic Usage (Astro)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { rehypeFootnotes } from 'rehype-footnotes';

export default defineConfig({
  markdown: {
    rehypePlugins: [rehypeFootnotes],
  },
});
```

### With Custom Options

```js
rehypePlugins: [
  [rehypeFootnotes, {
    activateOnLoad: true,  // Auto-activate Littlefoot (default: true)
    littlefootOptions: {
      allowMultiple: true,     // Allow multiple footnotes open
      hoverDelay: 250,         // Hover delay in ms
      dismissOnUnhover: true,  // Close on mouse leave
    },
  }]
],
```

### Complete Integration Example

**1. Install dependencies:**
```bash
pnpm add remark-gfm rehype-footnotes littlefoot
```

**2. Configure Astro:**
```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';
import { rehypeFootnotes } from 'rehype-footnotes';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeFootnotes],
  },
});
```

**3. Add Littlefoot to your layout:**
```astro
---
import { generateLittlefootScript, generateLittlefootCSS } from 'rehype-footnotes';

const script = generateLittlefootScript();
const css = generateLittlefootCSS();
---

<html>
  <head>
    <style is:inline set:html={css} />
  </head>
  <body>
    <slot />
    <script is:inline set:html={script} />
  </body>
</html>
```

**4. Write markdown with footnotes:**
```markdown
Here is a statement that needs a citation[^1].

You can also use named footnotes[^note].

[^1]: This is a footnote with a number.
[^note]: This is a named footnote.
```

## API

### `rehypeFootnotes(options?)`

Main rehype plugin for transforming footnotes.

**Options:**
```typescript
interface FootnoteOptions {
  referenceSelector?: string;     // CSS selector for references
  definitionSelector?: string;    // CSS selector for definitions
  activateOnLoad?: boolean;       // Auto-activate Littlefoot
  littlefootOptions?: {           // Littlefoot configuration
    allowDuplicates?: boolean;
    allowMultiple?: boolean;
    dismissDelay?: number;
    hoverDelay?: number;
    // ... other Littlefoot options
  };
}
```

### `transformFootnotesForLittlefoot(tree, options?)`

Low-level function to transform HAST tree directly.

```js
import { transformFootnotesForLittlefoot } from 'rehype-footnotes';

// In a custom plugin
export function myPlugin() {
  return (tree) => {
    transformFootnotesForLittlefoot(tree, {
      littlefootOptions: {
        allowMultiple: true,
      },
    });
  };
}
```

### `generateLittlefootScript(options?)`

Generate JavaScript initialization code for Littlefoot.

```js
import { generateLittlefootScript } from 'rehype-footnotes';

const script = generateLittlefootScript({
  littlefootOptions: {
    hoverDelay: 500,
    allowMultiple: true,
  },
});
```

### `generateLittlefootCSS()`

Generate CSS imports and custom styles for Littlefoot.

```js
import { generateLittlefootCSS } from 'rehype-footnotes';

const css = generateLittlefootCSS();
```

## How It Works

The plugin performs three main transformations on GFM footnote HTML:

### 1. Transform References

**GFM Output:**
```html
<sup id="user-content-fnref-1">
  <a href="#user-content-fn-1">1</a>
</sup>
```

**After Plugin:**
```html
<sup id="user-content-fnref-1">
  <a href="#user-content-fn-1" rel="footnote" data-footnote-id="1">1</a>
</sup>
```

### 2. Transform Definitions

**GFM Output:**
```html
<li id="user-content-fn-1">
  <p>Footnote text <a href="#user-content-fnref-1">↩</a></p>
</li>
```

**After Plugin:**
```html
<li id="fn:1" data-footnote-id="1">
  <p>Footnote text</p>
</li>
```

### 3. Remove Back-References

The plugin removes the `↩` (back-reference) links since Littlefoot.js provides its own close mechanism.

## Littlefoot Options

All [Littlefoot.js options](https://littlefoot.js.org/) are supported via `littlefootOptions`:

```js
{
  allowDuplicates: false,      // Allow duplicate footnote references
  allowMultiple: false,        // Allow multiple popovers open
  anchorParentSelector: 'p',   // Parent element to attach anchor to
  dismissDelay: 100,           // Delay before dismissing (ms)
  dismissOnUnhover: true,      // Dismiss when mouse leaves
  hoverDelay: 250,             // Delay before showing on hover (ms)
  scope: 'body',               // Scope for footnote activation
}
```

## Styling

The plugin includes default styles, but you can customize Littlefoot's appearance:

```css
/* Override default styles */
.littlefoot-footnote__wrapper {
  max-width: 600px;  /* Wider popovers */
}

.littlefoot-footnote__content {
  font-size: 1em;    /* Larger text */
  padding: 1.5rem;   /* More padding */
}

a[rel="footnote"] {
  color: #ff6b6b;    /* Custom color */
  font-weight: bold;
}
```

## Requirements

- **Peer dependency**: `unified` ^11.0.0
- **Requires**: `remark-gfm` for GFM footnote parsing
- **Requires**: `littlefoot` for frontend footnote functionality

## License

MIT © Tyler Butler
