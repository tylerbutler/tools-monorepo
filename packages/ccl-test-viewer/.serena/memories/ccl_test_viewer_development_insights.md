# CCL Test Viewer Development Insights & Patterns

## Project Overview
CCL Test Viewer is a SvelteKit 5 application for visualizing CCL (Configuration Command Language) test results with a sophisticated data source management system.

## Architecture Key Points

### Data Pipeline Architecture
1. **Build-Time Processing**: `scripts/sync-data.ts` transforms ccl-test-data into optimized web assets
2. **Source**: `../../../ccl-test-data/generated_tests/` (366 tests, 630 assertions, 12 categories)
3. **Output Targets**:
   - `src/lib/data/` - TypeScript types and processed data
   - `static/data/` - Static JSON files for web app (`/data/categories.json`, `/data/stats.json`)

### Svelte 5 Runes Implementation
- **Pure Runes Architecture**: Uses `$state()`, `$derived()`, `$effect()` throughout
- **No Legacy Stores**: Avoids mixing Svelte 4 stores with Svelte 5 runes
- **Data Sources**: `dataSourceManager.svelte.ts` with reactive state management
- **App State**: `stores.svelte.ts` for global application state

### Critical Development Constraints
- **Dev Server Issues**: `pnpm dev` has rendering problems - always use `pnpm build && pnpm preview`
- **Required Workflow**: Build → Preview → Test (not dev server)
- **Data Dependencies**: Must have access to `../../../ccl-test-data/` for sync operations

## Component Architecture Patterns

### Safe Component Patterns ✅
```typescript
// Direct data loading (lifecycle-safe)
$effect(() => {
    if (browser && testName) {
        async function loadData() {
            const response = await fetch("/data/categories.json");
            const data = await response.json();
            // Process data...
        }
        loadData();
    }
});
```

### Problematic Patterns ❌
```typescript
// Reactive store access in async context (lifecycle violations)
$effect(() => {
    dataSourceManager.initializeEmpty().then(() => {
        const data = dataSourceManager.categories; // ❌ Lifecycle violation
    });
});
```

### Data Source Management
- **Multiple Sources**: Built-in static data + uploaded files + GitHub repositories
- **Reactive Merging**: `mergeDataSources()` combines active sources
- **LocalStorage Persistence**: Maintains state across page navigation
- **Upload-First Design**: Application can work without static data (upload-only mode)

## Development Workflow Best Practices

### Essential Commands
```bash
# Required development workflow (dev server broken)
pnpm build      # Build static site with data sync
pnpm preview    # Preview production build on localhost:4173

# Data management
pnpm sync-data  # Sync from ../../../ccl-test-data/generated_tests

# Quality checks
pnpm check      # TypeScript + Svelte + formatting
pnpm test       # Unit tests with Vitest
pnpm test:e2e   # Playwright end-to-end tests
```

### Critical Debugging Steps
1. **Always rebuild** after significant changes: `pnpm build`
2. **Restart preview server** after builds: `pkill -f "vite preview" && pnpm preview`
3. **Check console logs** for Svelte lifecycle errors
4. **Verify data sync** completed successfully (366 tests loaded)

## Common Issues & Solutions

### Svelte 5 Lifecycle Errors
- **Symptom**: `https://svelte.dev/e/lifecycle_outside_component`
- **Cause**: Reactive store access in async contexts, `$effect` timing conflicts
- **Solution**: Use direct fetch calls instead of reactive stores for critical paths

### Build/Preview Server Issues
- **Symptom**: "Loading test data..." stuck state, missing build files
- **Solution**: `pnpm build && pkill -f "vite preview" && pnpm preview`

### Data Loading Problems
- **Symptom**: "No test data available" or test not found
- **Solution**: Verify `/data/categories.json` accessible, check data sync logs

## Static Site Generation
- **Adapter**: `@sveltejs/adapter-static` (Netlify)
- **SSR Disabled**: `export const ssr = false` to avoid hydration issues
- **Prerendering Disabled**: `export const prerender = false`
- **Output**: Static `build/` directory for deployment

## Testing Strategy
- **Unit Tests**: Vitest for component logic
- **E2E Tests**: Playwright for user workflows
- **Data Validation**: JSON schema compliance checks
- **Build Verification**: Ensure all assets generated correctly

## Performance Considerations
- **Build-Time Optimization**: All data processing happens at build time
- **Static Assets**: Optimized JSON files for fast browser loading
- **Code Splitting**: Bundle optimization for large datasets (366+ tests)
- **Mobile-First**: Responsive design for mobile and desktop

## Key Dependencies
- **SvelteKit 2.42.2** with Netlify adapter
- **Svelte 5.39.3** with runes architecture
- **TailwindCSS** with shadcn-svelte components
- **TypeScript** with strict checking
- **Biome** for formatting/linting
- **Vitest + Playwright** for testing

## Integration Context
Part of broader CCL tools ecosystem:
- **Consumes**: ccl-test-data (452 assertions, 167 tests)
- **Tracks**: CCL implementation progress (Gleam, OCaml, Go)
- **Provides**: Interactive test result visualization and analysis