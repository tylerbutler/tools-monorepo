# CLAUDE.md - ccl-docs

Package-specific guidance for the CCL documentation site built with Astro and Starlight.

## Package Overview

Documentation site for CCL (Categorical Configuration Language) deployed to https://ccl.tylerbutler.com. Built with Astro framework and Starlight documentation theme.

**Deployment:** Netlify (SSR mode)
**Dev Server:** `pnpm dev`
**Build Output:** `dist/` (Netlify adapter)

## Project Structure

```
src/
├── content/
│   └── docs/          # Markdown documentation files
│       ├── index.mdx  # Homepage
│       ├── getting-started.md
│       ├── syntax-reference.md
│       └── ...
├── content.config.ts  # Content collections config
├── styles/
│   └── custom.css     # Global styles
└── env.d.ts          # TypeScript environment definitions
```

## Astro + Starlight Patterns

### Configuration (astro.config.mjs)

```javascript
export default defineConfig({
  output: "server",              // SSR mode for Netlify
  adapter: netlify({ imageCDN: false }),
  site: "https://ccl.tylerbutler.com",
  integrations: [
    starlight({
      title: "CCL",
      sidebar: [/* ... */],       // Navigation structure
      plugins: [/* ... */],       // Starlight plugins
      expressiveCode: {/* ... */}, // Code syntax highlighting
    }),
  ],
  markdown: {
    remarkPlugins: [/* ... */],   // Markdown processing
  },
});
```

**Key Features:**
- SSR rendering via Netlify adapter
- Custom CCL syntax highlighting (ccl.tmLanguage.json)
- Starlight theme with customization
- Multiple remark plugins for markdown processing

### Content Collections

Content is organized as Astro content collections:

```typescript
// src/content.config.ts
import { defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
};
```

**File Organization:**
- All docs in `src/content/docs/`
- Frontmatter validated by Starlight's schema
- Slug-based routing (e.g., `getting-started.md` → `/getting-started`)

### Sidebar Configuration

Sidebar structure defined in `astro.config.mjs`:

```javascript
sidebar: [
  {
    label: "Learning CCL",
    items: [
      { slug: "getting-started" },
      { slug: "ccl-examples" },
    ],
  },
  {
    label: "Implementation",
    items: [
      { slug: "implementing-ccl" },
      { slug: "parsing-algorithm" },
    ],
  },
],
```

**Important:** Add new docs to sidebar manually - not auto-generated.

## Custom Syntax Highlighting

CCL syntax highlighting via TextMate grammar:

```javascript
const cclGrammar = JSON.parse(
  fs.readFileSync("ccl.tmLanguage.json", "utf-8")
);

starlight({
  expressiveCode: {
    shiki: {
      langs: [cclGrammar],
      langAlias: {
        ccl: "CCL",
        pseudocode: "python",
      },
    },
  },
});
```

**Usage in Markdown:**
````markdown
```ccl
key: value
nested:
  child: value
```
````

## Starlight Plugins

This site uses these Starlight plugins:

- `starlight-links-validator` - Validates internal links at build time
- `starlight-llms-txt` - Generates `llms.txt` for AI crawlers

## Typography and Styling

**Fonts:**
- Body: Metropolis (400, 600 weights)
- Code: Fira Code (custom via expressiveCode)

**Custom Styles:**
- Global CSS: `src/styles/custom.css`
- Override Starlight variables for theming
- Custom font families for code blocks

## Markdown Extensions

**Remark Plugins:**
- `@fec/remark-a11y-emoji` - Accessible emoji rendering
- `@hashicorp/platform-remark-plugins/includeMarkdown` - Markdown transclusion

**Include Markdown from other files:**
```markdown
@include 'path/to/file.md'
```

## Development Commands

```bash
# Start dev server (hot reload)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Check TypeScript types
pnpm check:typedoc

# Astro CLI commands
pnpm astro <command>
```

## Common Workflows

### Adding a New Documentation Page

1. Create `src/content/docs/new-page.md`
2. Add frontmatter:
   ```markdown
   ---
   title: Page Title
   description: Short description for SEO
   ---
   ```
3. Add to sidebar in `astro.config.mjs`:
   ```javascript
   { slug: "new-page" }
   ```
4. Build and test: `pnpm dev`

### Using MDX Features

For React components or advanced content, use `.mdx` extension:

```mdx
---
title: Advanced Page
---

import MyComponent from '../../components/MyComponent.astro';

<MyComponent prop="value" />
```

### Custom Code Syntax

CCL code blocks use custom grammar:

````markdown
```ccl
/= CCL comment
key: value
dotted.key.path: nested value
```
````

Fallback to Python for pseudocode:

````markdown
```pseudocode
function parse(input):
  return result
```
````

## Build Output

**Development (`pnpm dev`):**
- Hot module reload
- Runs on http://localhost:4321 (default)
- Fast refresh for content changes

**Production (`pnpm build`):**
- SSR build for Netlify
- Output to `dist/`
- Includes server functions for dynamic rendering
- `.astro/` cache directory (gitignored)

## Netlify Deployment

**Adapter Configuration:**
```javascript
adapter: netlify({
  imageCDN: false,  // Disable Netlify image optimization
}),
```

**Deployment:**
- Automatic via Netlify GitHub integration
- Build command: `pnpm build`
- Publish directory: `dist/`
- Site URL: https://ccl.tylerbutler.com

## Content Guidelines

**Frontmatter Requirements:**
```yaml
---
title: Page Title        # Required
description: Description # Required for SEO
lastUpdated: true       # Optional, shows last update date
---
```

**Internal Links:**
- Use relative paths: `[link text](./other-page)`
- Validated at build time by starlight-links-validator
- External links open in new tab (Starlight default)

**Code Blocks:**
- Use language identifiers: `ccl`, `typescript`, `bash`, etc.
- CCL blocks get custom syntax highlighting
- Include descriptive titles for complex examples

## Starlight Features

**Built-in Components:**
- `<Aside>` - Callout boxes (note, tip, caution, danger)
- `<Card>` - Visual card containers
- `<CardGrid>` - Grid layout for cards
- `<LinkCard>` - Link preview cards
- `<Tabs>` - Tab containers for alternative content

**Example:**
```markdown
<Aside type="tip">
This is a helpful tip!
</Aside>
```

## Package-Specific Constraints

- All docs must be in `src/content/docs/`
- Sidebar must be manually updated in `astro.config.mjs`
- CCL syntax requires `ccl.tmLanguage.json` to be present
- SSR mode requires Netlify adapter
- Build validates all internal links (fails on broken links)
- Custom fonts must be imported in `astro.config.mjs`
