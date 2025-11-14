# CLAUDE.md - dill-docs

Package-specific guidance for the Dill documentation site.

## Package Overview

Documentation website for the Dill CLI tool, built with Astro and Starlight. The site provides user guides, CLI reference documentation, and API documentation.

**Site URL:** https://dill.tylerbutler.com/
**Framework:** Astro with Starlight theme
**Deployment:** Netlify

## Essential Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
# or
pnpm start

# Build site for production
pnpm build:site

# Preview production build
pnpm preview

# Check Astro configuration
pnpm check:astro

# Clean build artifacts
pnpm clean
```

## Development Workflow

### Local Development

```bash
# Start dev server with hot reload
pnpm dev

# Site available at http://localhost:4321 (default)
```

The dev server provides:
- Hot module replacement (HMR)
- Instant page updates on file changes
- Error overlay for debugging

### Building for Production

```bash
# Build static site
pnpm build:site

# Output: dist/ directory

# Preview production build locally
pnpm preview
```

## Project Structure

```
packages/dill-docs/
├── src/
│   ├── content/
│   │   └── docs/          # Documentation markdown files
│   │       ├── index.md   # Homepage
│   │       ├── cli-reference.md  # Auto-generated CLI docs
│   │       └── ...        # Other documentation pages
│   ├── assets/            # Images, fonts, etc.
│   └── styles/            # Custom styles
├── astro.config.mjs       # Astro configuration
├── dist/                  # Build output (generated)
├── package.json
└── tsconfig.json
```

## Astro Configuration

Key features enabled in `astro.config.mjs`:

**Starlight Theme:**
- Documentation-focused theme
- Built-in search
- Responsive navigation
- Dark mode support

**Plugins:**
- `starlight-heading-badges` - Badges for headings
- `starlight-links-validator` - Validate internal links
- `starlight-package-managers` - Package manager tabs
- `starlight-typedoc` - TypeDoc API documentation

**Netlify Adapter:**
- Server-side rendering (SSR) support
- Edge functions
- Automatic deployment

## Content Management

### Writing Documentation

Documentation files use Markdown with frontmatter:

```markdown
---
title: Page Title
description: Page description for SEO
---

# Page Title

Content goes here...
```

**Starlight Features:**
- Automatic table of contents
- Syntax highlighting for code blocks
- Callouts (note, tip, warning, danger)
- Tabs for content variants

### CLI Reference

The CLI reference (`src/content/docs/cli-reference.md`) is **auto-generated** from the dill-cli package:

```bash
# In dill-cli package:
pnpm build:readme

# This updates both:
# - dill-cli/README.md
# - dill-docs/src/content/docs/cli-reference.md
```

**Never edit cli-reference.md manually** - changes will be overwritten.

## TypeDoc Integration

API documentation is generated from the dill-cli source code using TypeDoc:

**Configuration:**
- `typedoc.json` (if present) or inline in astro.config.mjs
- Starlight-TypeDoc plugin integration
- Markdown output format

**Regeneration:**
API docs are regenerated on each build automatically.

## Styling and Theming

### Custom Styles

Add custom CSS in `src/styles/`:

```css
/* Custom theme overrides */
:root {
  --sl-color-accent: #your-color;
}
```

### Fonts

Custom fonts loaded via `@fontsource`:
- `@fontsource/ibm-plex-serif`
- `@fontsource/metropolis`
- `@fontsource/open-sans`

## Deployment

### Netlify Deployment

**Configuration:**
- Output: `dist/` directory
- Build command: `pnpm build:site`
- Adapter: `@astrojs/netlify`

**Automatic Deployment:**
- Deploys on push to main branch
- Preview builds for pull requests
- Edge functions support

### Build Validation

Before deploying:

```bash
# Check Astro configuration
pnpm check:astro

# Build site
pnpm build:site

# Verify build output
pnpm preview
```

## Plugin Configuration

### Starlight Package Managers

Enables package manager tabs for installation commands:

```markdown
```bash npm2yarn
npm install dill-cli
\```
```

Automatically generates tabs for npm, yarn, pnpm.

### Starlight Links Validator

Validates internal links during build:
- Detects broken links
- Warns about missing pages
- Validates anchors

### Starlight Heading Badges

Add badges to headings:

```markdown
## New Feature {#new}
```

## Important Constraints

1. **Part of Monorepo**: Uses `workspace:^` for dill-cli dependency
2. **Auto-Generated Content**: Don't edit CLI reference manually
3. **Astro Framework**: Follow Astro conventions
4. **Starlight Theme**: Use Starlight-compatible markdown features
5. **Static Site**: All content must be statically generated
6. **Netlify Deployment**: Site deployed via Netlify adapter

## Dependencies

**Key Dependencies:**
- `astro` - Framework
- `@astrojs/starlight` - Documentation theme
- `@astrojs/netlify` - Netlify adapter
- `dill-cli` - Source for CLI reference (workspace dependency)
- `typedoc` - API documentation generation

**Starlight Plugins:**
- `starlight-heading-badges`
- `starlight-links-validator`
- `starlight-package-managers`
- `starlight-typedoc`

## Common Tasks

### Adding a New Page

1. Create `src/content/docs/new-page.md`
2. Add frontmatter with title and description
3. Write content in Markdown
4. Update navigation if needed (in astro.config.mjs)
5. Test locally: `pnpm dev`
6. Build: `pnpm build:site`

### Updating CLI Reference

```bash
# Navigate to dill-cli package
cd ../dill-cli

# Regenerate README and docs
pnpm build:readme

# CLI reference in dill-docs is updated automatically
```

### Troubleshooting Build Issues

```bash
# Clear Astro cache
pnpm clean

# Check for configuration errors
pnpm check:astro

# Rebuild from scratch
pnpm clean && pnpm build:site
```

## Related Packages

- **dill-cli** - Source for CLI reference and API docs
- **ccl-docs** - Similar documentation site structure
- **repopo-docs** - Similar documentation site structure
