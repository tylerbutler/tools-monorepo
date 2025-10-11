# CCL Test Viewer

A SvelteKit-based interactive web application for visualizing CCL (Configuration and Command Language) test suite results. This tool provides a comprehensive dashboard for exploring test data from the [ccl-test-data](../../../ccl-test-data) repository.

## Features

- **Interactive Dashboard**: Overview of test execution results with real-time statistics
- **Test Explorer**: Browse and filter through 167 tests with 452 assertions
- **Implementation Tracking**: Monitor progress across different CCL implementations (Gleam, OCaml, etc.)
- **Feature Analysis**: Understand feature coverage and implementation gaps
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Development

```bash
# Install dependencies
pnpm install

# Build and preview (recommended workflow)
# Note: Dev server has rendering issues - use build-preview workflow instead
pnpm build
pnpm preview

# Alternative: combined command
pnpm run build && pnpm preview

# Run tests
pnpm test              # Unit tests
pnpm test:e2e          # End-to-end tests
```

> **⚠️ Important**: The dev server (`pnpm dev`) has known rendering issues. Always use the build-preview workflow for testing changes.

### Data Synchronization

The sync-data script fetches test data from GitHub by default:

```bash
# Fetch from GitHub (default)
pnpm sync-data

# Use local filesystem instead
CCL_USE_GITHUB=false pnpm sync-data

# Skip sync if data already exists (useful in CI)
CCL_SKIP_SYNC_IF_EXISTS=true pnpm sync-data
```

**Data Source**: `tylerbutler/ccl-test-data` repository (main branch, generated_tests directory)

**Authentication**: The script automatically uses authentication via:
1. `GITHUB_TOKEN` environment variable (if set)
2. GitHub CLI (`gh auth token`) for private repository access

## Architecture

Built with:
- **SvelteKit** with static adapter for deployment
- **TypeScript** for type safety
- **TailwindCSS** with design system tokens
- **Lucide Svelte** for icons
- **shadcn-svelte** component patterns

## Integration

This viewer integrates with the broader CCL ecosystem:

- **ccl-test-data**: Source of test suite JSON data (452 assertions across 167 tests)
- **ccl_gleam**: Gleam CCL implementation being tracked
- **ccl-ocaml**: OCaml CCL implementation being tracked
- **tools-monorepo**: Part of the unified development toolchain

## Deployment

Configured for static site generation and can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

The production build generates a `build/` directory with all static assets.