# CCL Documentation

This package contains the documentation website for CCL (Configuration and Control Language) built with Astro and Starlight.

## Development

```bash
# Install dependencies (from workspace root)
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Content

Documentation content is sourced from the `ccl-test-data/docs` directory and adapted for Starlight. The site includes:

- Getting started guide
- Format comparison with other configuration languages
- Implementation guide for language authors
- Test architecture documentation
- API reference
- Glossary and FAQ

## Tech Stack

- **Astro**: Static site generator
- **Starlight**: Documentation theme
- **TypeScript**: Type safety
- **Netlify**: Deployment platform

The site follows the same patterns and configuration as other documentation sites in this monorepo.