# CCL Test Viewer: Architecture Patterns and Development Guidelines

## Svelte 5 Runes Architecture
- **State Management**: Pure Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Legacy Avoidance**: No Svelte 4 stores mixed with runes
- **Lifecycle Pattern**: Use `$effect` instead of `onMount` for reliable execution
- **Load Functions**: SvelteKit load functions provide initial data, components handle client-side

## Data Pipeline Architecture
- **Build-Time Processing**: `scripts/sync-data.ts` transforms test data
- **Source**: `../../../ccl-test-data/generated_tests/` (452 assertions, 167 tests)
- **Output Targets**:
  - `src/lib/data/` - TypeScript types and processed data
  - `static/data/` - Static JSON files for web app
- **Integration**: Build process automatically runs data sync

## Static Site Generation
- **Adapter**: Netlify adapter with static generation
- **SSR**: Disabled (`export const ssr = false`) to avoid hydration issues
- **Prerendering**: Disabled to prevent build conflicts
- **Service Worker**: Disabled completely for static deployment

## Development Workflow Requirements
- **Build Process**: `pnpm build` includes data sync automatically
- **Testing**: Must use `pnpm preview` - dev server has rendering issues
- **Restart Pattern**: Kill and restart preview server after each build
- **Port Strategy**: Use specific ports (e.g., 4177) to avoid conflicts

## Component Communication Patterns
- **Data Flow**: Load functions → Runes stores → Component props/derived
- **State Updates**: Reactive updates through `$derived` computations
- **Error Handling**: Component-level error states with proper user feedback
- **Loading States**: Client-side loading indicators during data fetching

## File Organization Standards
- **UI Components**: `src/lib/components/ui/` (shadcn-svelte)
- **App Components**: Domain-specific components (TestCard, FilterSidebar, etc.)
- **Stores**: `src/lib/stores.svelte.ts` (Svelte 5 runes only)
- **Data**: `src/lib/data/` (generated types and processed data)
- **Static Assets**: `static/` (JSON data files, icons, etc.)

## Build System Integration
- **Package Manager**: pnpm (required, specified in packageManager field)
- **Dependencies**: Must check existing patterns before adding libraries
- **Monorepo**: Part of tools-monorepo following workspace patterns
- **External Data**: Access to `../../../ccl-test-data/` required for builds

## Quality Assurance Patterns
- **TypeScript**: Strict type checking enabled
- **Linting**: Biome for formatting and linting
- **Testing**: Vitest + Playwright for comprehensive coverage
- **Error Boundaries**: Component-level error handling with user feedback

## Performance Considerations
- **Bundle Size**: Optimized for fast loading with code splitting
- **Large Datasets**: Handles 450+ test cases efficiently in browser
- **Static Assets**: All data processing at build time, not runtime
- **Mobile First**: Responsive design optimized for mobile and desktop