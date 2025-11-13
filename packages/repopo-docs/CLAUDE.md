# CLAUDE.md - repopo-docs

Package-specific guidance for the Repopo documentation site.

## Package Overview

Documentation website for the Repopo repository policy enforcement tool, built with Astro and Starlight. The site provides user guides, CLI reference documentation, API documentation, and policy authoring guides.

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
packages/repopo-docs/
├── src/
│   ├── content/
│   │   └── docs/          # Documentation markdown files
│   │       ├── index.md   # Homepage
│   │       ├── guide/     # User guides
│   │       ├── policies/  # Built-in policies docs
│   │       └── api/       # API reference (auto-generated)
│   ├── assets/            # Images, fonts, etc.
│   └── styles/            # Custom styles
├── astro.config.mjs       # Astro configuration
├── dist/                  # Build output (generated)
├── package.json
└── tsconfig.json
```

## Content Structure

### Documentation Sections

**Guide:**
- Getting started
- Installation
- Configuration
- Creating custom policies
- CLI usage
- Best practices

**Policies:**
- Built-in policy reference
- Policy configuration examples
- Policy patterns

**API Reference:**
- Auto-generated from repopo source
- TypeScript API documentation
- Type definitions

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

### API Reference

API documentation is **auto-generated** from the repopo package using TypeDoc:

**Configuration:**
- TypeDoc configuration in astro.config.mjs or typedoc.json
- Starlight-TypeDoc plugin integration
- Markdown output format

**Regeneration:**
API docs are regenerated on each build automatically.

### Policy Documentation

Built-in policies should be documented with:
- Policy name and description
- Configuration options
- Examples
- Use cases
- Related policies

**Example:**

```markdown
## NoJsFileExtensions

Prevents ambiguous `.js` file extensions in the repository.

### Configuration

\`\`\`typescript
makePolicy(NoJsFileExtensions, undefined, {
  excludeFiles: [".*/bin/.*js"]  // Exclude bin scripts
})
\`\`\`

### Why?

Using `.js` extension with `"type": "module"` in package.json...
```

## TypeDoc Integration

API documentation is generated from the repopo source code:

**Included:**
- Public API exports
- Type definitions
- Class documentation
- Interface documentation

**Configuration:**
- Entry point: repopo/src/index.ts
- Output: src/content/docs/api/
- Format: Markdown (Starlight-compatible)

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
npm install repopo
\```
```

Automatically generates tabs for npm, yarn, pnpm.

### Starlight Links Validator

Validates internal links during build:
- Detects broken links
- Warns about missing pages
- Validates anchors

### Starlight TypeDoc

Generates API documentation:
- Extracts types from TypeScript source
- Creates markdown pages
- Integrates with Starlight navigation

## Important Constraints

1. **Part of Monorepo** - Uses `workspace:^` for repopo dependency
2. **Auto-Generated Content** - API docs regenerated on build
3. **Astro Framework** - Follow Astro conventions
4. **Starlight Theme** - Use Starlight-compatible markdown features
5. **Static Site** - All content must be statically generated
6. **Netlify Deployment** - Site deployed via Netlify adapter

## Dependencies

**Key Dependencies:**
- `astro` - Framework
- `@astrojs/starlight` - Documentation theme
- `@astrojs/netlify` - Netlify adapter
- `repopo` - Source for API reference (workspace dependency)
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

### Updating API Reference

API reference is automatically regenerated on each build from the repopo source code. No manual updates needed.

### Adding Policy Documentation

1. Create `src/content/docs/policies/policy-name.md`
2. Document policy purpose, configuration, and examples
3. Link from main policies index page
4. Test locally and build

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

- **repopo** - Source for API docs and CLI reference
- **dill-docs** - Similar documentation site structure
- **ccl-docs** - Similar documentation site structure
