# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

### Critical Development Issue
**The dev server (`pnpm dev`) has rendering issues and does not display properly.** Always use the build-preview workflow for testing changes:

```bash
# Required development workflow
pnpm build      # Build static site with data sync
pnpm preview    # Preview production build on localhost:4173

# Alternative single command
pnpm run build && pnpm preview
```

### Core Commands
```bash
# Data synchronization (must run before build)
pnpm sync-data                 # Sync from ../../../ccl-test-data/generated_tests

# Build and testing
pnpm build                     # Builds static site (includes sync-data)
pnpm preview                   # Preview production build
pnpm check                     # TypeScript + Svelte + formatting checks
pnpm test                      # Unit tests with Vitest
pnpm test:e2e                  # Playwright end-to-end tests

# Code quality
pnpm format                    # Format with Biome
pnpm lint                      # Lint with Biome

# Tauri desktop application (requires setup)
pnpm tauri:dev                 # Development mode with hot reload
pnpm tauri:build               # Production desktop build
```

## Tauri Desktop Application

**📱 The CCL Test Viewer includes full desktop application support via Tauri.**

For complete setup, build, and testing instructions, see **[TAURI-SETUP.md](./TAURI-SETUP.md)**.

### Quick Start (after Tauri setup)
```bash
# Install Rust and Tauri CLI (one-time setup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli

# Initialize Tauri project (one-time setup)
cargo tauri init

# Development
pnpm tauri:dev                 # Desktop development mode

# Production build
pnpm tauri:build               # Creates native desktop application
```

### Desktop Features
- **Native File Dialogs**: Multi-file selection with OS integration
- **Local Data Persistence**: Cross-session data storage
- **Offline Mode**: Cached data for offline use
- **Collection Management**: Import/export data collections
- **Cross-Platform**: Windows, macOS, and Linux support
```

## Architecture Overview

### Data Pipeline Architecture
The application uses a **build-time data processing pipeline** that transforms ccl-test-data into optimized web assets:

1. **Source**: `../../../ccl-test-data/generated_tests/` (JSON test files)
2. **Processing**: `scripts/sync-data.ts` transforms and optimizes data
3. **Output**:
   - `src/lib/data/` - TypeScript types and processed data
   - `static/data/` - Static JSON files for the web app
4. **Integration**: Build process (`pnpm build`) automatically runs data sync

### Svelte 5 Runes Architecture
The application uses **pure Svelte 5 runes** with SvelteKit's load function pattern:

- **+layout.ts**: Provides data via load functions (SSR-compatible)
- **+layout.svelte**: Consumes data with `$props()` and `$derived()` runes
- **Stores**: `src/lib/stores.svelte.ts` uses runes (`$state()`, `$derived()`)
- **No legacy stores**: Avoids mixing Svelte 4 stores with Svelte 5 runes

### Component Architecture
- **UI Components**: shadcn-svelte components in `src/lib/components/ui/`
- **Application Components**: Domain-specific components (TestCard, FilterSidebar, etc.)
- **Display Components**: Specialized rendering (CodeHighlight, ValueDisplay, etc.)

### Static Site Generation
- **Adapter**: Netlify adapter with static generation
- **Prerendering**: Disabled (`export const prerender = false` in +layout.ts)
- **SSR**: Disabled (`export const ssr = false`) to avoid hydration issues
- **Deployment**: Generates static `build/` directory

### Data Flow Pattern
```
ccl-test-data → sync-data.ts → src/lib/data/ → SvelteKit load functions → Runes → Components
```

### Key File Structure
```
scripts/sync-data.ts           # Data transformation pipeline
src/lib/data/                  # Generated TypeScript types and data
src/lib/stores.svelte.ts       # Svelte 5 runes state management
src/lib/components/ui/         # shadcn-svelte UI components
src/routes/+layout.ts          # SvelteKit load functions
src/routes/+layout.svelte      # Main layout with runes
```

## Integration Context

### CCL Ecosystem Integration
This viewer is part of the broader CCL tools ecosystem:
- **Data Source**: Consumes test data from `ccl-test-data` repository (452 assertions, 167 tests)
- **Implementation Tracking**: Monitors progress of CCL implementations (Gleam, OCaml)
- **Monorepo Context**: Part of tools-monorepo following pnpm workspace patterns

### Build System Integration
- **Package Manager**: pnpm (required, specified in packageManager field)
- **Monorepo Commands**: `pnpm --filter ccl-test-viewer run <command>`
- **Build Dependencies**: Must have access to `../../../ccl-test-data/` for data sync

## Development Constraints

### Browser Compatibility
- **Primary Target**: Modern browsers with ES2022+ support
- **Mobile-First**: Responsive design optimized for mobile and desktop
- **Accessibility**: WCAG AA compliance with proper ARIA labels and keyboard navigation

### Performance Requirements
- **Static Generation**: All data processing happens at build time
- **Bundle Size**: Optimized for fast loading with code splitting
- **Large Datasets**: Handles 450+ test cases efficiently in browser

### Technical Limitations
- **No Server-Side Processing**: Pure static site, no dynamic server endpoints
- **Build-Time Data**: All test data must be available at build time
- **Dev Server Issues**: Use build-preview workflow instead of dev server

## Key Dependencies
- **SvelteKit 2.42.2** with Netlify adapter
- **Svelte 5.39.3** with runes-based architecture
- **TailwindCSS** with shadcn-svelte component library
- **TypeScript** with strict type checking
- **Biome** for formatting and linting
- **Vitest + Playwright** for testing

## JSON Upload Feature Development
The project is currently implementing dynamic JSON upload capabilities to transform from build-time static site to runtime data loading while maintaining Tauri desktop app compatibility. See project memories for detailed implementation plans and progress tracking.
- This project uses pure OKLCH everywhere with Tailwind v4's native color system.