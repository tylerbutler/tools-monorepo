# CCL Test Viewer - Development Guide and Workflow

## Project Setup and Commands

### Essential Development Workflow
```bash
# From tools-monorepo root
cd packages/ccl-test-viewer

# Development server
pnpm run dev
# or from workspace root
pnpm --filter ccl-test-viewer run dev

# Build and data sync
pnpm run build                    # Includes automatic data sync
pnpm run sync-data               # Manual data refresh
pnpm run check                   # Type checking + formatting
pnpm run check:svelte           # Svelte-specific checks only
```

### Data Pipeline Commands
```bash
# Sync test data from ccl-test-data
pnpm run sync-data
# This processes:
# - 12 test files from ../../../ccl-test-data/generated_tests/
# - Generates TypeScript types
# - Creates search indices
# - Outputs to src/lib/data/ and static/data/
```

## Architecture Overview

### Project Structure
```
tools-monorepo/packages/ccl-test-viewer/
├── scripts/
│   └── sync-data.ts              # Data processing pipeline
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/               # Reusable UI components
│   │   │   ├── TestCard.svelte   # Test case display
│   │   │   ├── FilterSidebar.svelte # Multi-dimensional filtering
│   │   │   └── TestDetail.svelte # Detailed test view
│   │   ├── stores.ts             # Svelte 5 runes state management
│   │   ├── utils.ts              # Utility functions (cn helper)
│   │   └── data/                 # Generated data and types
│   ├── routes/
│   │   ├── +layout.svelte        # Navigation shell
│   │   ├── +page.svelte          # Dashboard homepage
│   │   ├── browse/               # Test exploration
│   │   └── test/[name]/          # Dynamic test detail routes
│   └── app.css                   # Global styles
├── static/data/                  # Runtime JSON files
└── build/                        # Production output
```

### Data Flow Architecture
```
ccl-test-data/generated_tests/*.json
    ↓ (sync-data.ts script)
src/lib/data/ + static/data/
    ↓ (Svelte 5 runes state)
UI Components (reactive)
```

## State Management

### Global State Pattern
```typescript
// stores.ts - Main state management
class AppState {
  // Core data
  testCategories = $state<TestCategory[]>([]);
  testStats = $state<TestStats | null>(null);
  searchIndex = $state<SearchIndex | null>(null);

  // UI state
  searchQuery = $state('');
  activeFilters = $state<FilterState>({...});
  selectedTest = $state<GeneratedTest | null>(null);
  sidebarOpen = $state(true);

  // Computed values
  filteredTests = $derived.by(() => {/* filtering logic */});
  totalFilteredTests = $derived(this.filteredTests.length);
  hasActiveFilters = $derived(/* boolean logic */);

  // Actions
  toggleFilter(type: keyof FilterState, key: string) { /* */ }
  clearAllFilters() { /* */ }
  async loadData() { /* */ }
}

export const appState = new AppState();
```

### Component State Usage
```svelte
<script lang="ts">
  import { appState } from '$lib/stores.js';

  // Access reactive state
  const tests = appState.filteredTests;
  const isLoading = appState.testCategories.length === 0;

  // Call actions
  function handleSearch(query: string) {
    appState.setSearchQuery(query);
  }
</script>
```

## Component Development

### Component Template
```svelte
<script lang="ts">
  import { ComponentImports } from '$lib/components/ui/index.js';
  import type { ComponentTypes } from '$lib/data/types.js';

  interface Props {
    requiredProp: ComponentTypes;
    optionalProp?: string;
    onclick?: (event: MouseEvent) => void;
  }

  let { requiredProp, optionalProp, onclick }: Props = $props();

  // Local state
  let localState = $state(initialValue);

  // Computed values
  const computedValue = $derived(localState.transform());

  // Event handlers
  function handleEvent() {
    // Local logic
    onclick?.(event);
  }
</script>

<ComponentStructure>
  <!-- Template content -->
</ComponentStructure>
```

### UI Component Guidelines
1. **Consistent Styling**: Use TailwindCSS classes with design tokens
2. **Event Handlers**: Include in Props interface for type safety
3. **Responsive Design**: Mobile-first approach with breakpoint utilities
4. **Accessibility**: Proper ARIA labels and keyboard navigation
5. **Performance**: Use keyed each blocks and minimal reactive dependencies

## Data Integration

### Test Data Structure
```typescript
interface GeneratedTest {
  name: string;                    // Unique test identifier
  input: string;                   // CCL input text
  validation: string;              // Validation description
  expected: {                      // Expected results
    count: number;
    entries?: Array<{key: string; value: string}>;
    object?: any;
    value?: any;
    list?: any[];
    error?: boolean;
  };
  functions: string[];             // CCL functions tested
  features: string[];              // Language features used
  behaviors: string[];             // Behavior specifications
  variants: string[];              // Test variants
  source_test: string;             // Source test file
}
```

### Data Loading Pattern
```typescript
async function loadData() {
  try {
    // Load test categories (225KB processed)
    const categoriesResponse = await fetch('/data/categories.json');
    this.testCategories = await categoriesResponse.json();

    // Load statistics
    const statsResponse = await fetch('/data/stats.json');
    this.testStats = await statsResponse.json();

    // Load search index (211KB with 173 tokens)
    const searchResponse = await fetch('/data/search-index.json');
    this.searchIndex = await searchResponse.json();

    return true;
  } catch (error) {
    console.error('Failed to load test data:', error);
    return false;
  }
}
```

## Routing and Navigation

### Route Structure
- `/` - Dashboard with statistics and quick actions
- `/browse` - Test exploration with filtering and search
- `/test/[name]` - Individual test detail view

### Navigation Implementation
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Route-aware styling
  const currentPath = $derived($page.url.pathname);
  const isActive = $derived(currentPath === targetPath);

  // Navigation handlers
  function navigateToTest(test: GeneratedTest) {
    appState.selectTest(test);
    goto(`/test/${encodeURIComponent(test.name)}`);
  }
</script>
```

### URL State Management
- Test names encoded in URLs for bookmarking
- Filter state could be preserved in URL parameters (future enhancement)
- Navigation history maintained for back button functionality

## Performance Optimization

### Build-time Optimizations
- **Data Processing**: All JSON transformation during build
- **Type Generation**: TypeScript types from actual data
- **Search Indices**: Pre-computed for instant filtering
- **Bundle Splitting**: Automatic code splitting by route

### Runtime Optimizations
- **Reactive Filtering**: Efficient O(n) filtering with early termination
- **Virtual Scrolling**: Planned for large test lists (366+ tests)
- **Lazy Loading**: Route-based code splitting
- **Memory Management**: Proper cleanup of event listeners

### Performance Targets
- **Initial Load**: <2 seconds for first paint
- **Search Response**: <100ms for filter operations
- **Navigation**: <200ms between routes
- **Bundle Size**: <50KB gzipped for main chunks

## Testing Strategy

### Current Testing Status
- **Build Verification**: TypeScript compilation passes
- **Component Testing**: Manual testing of all core components
- **Integration Testing**: End-to-end user flows verified
- **Data Pipeline**: 366 tests loading correctly

### Future Testing Enhancements
- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Playwright for user journey validation
- **Visual Testing**: Screenshot comparison for UI consistency
- **Performance Testing**: Bundle size and runtime metrics

## Deployment Configuration

### Build Configuration
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    prerender: {
      handleHttpError: 'warn'
    }
  }
};
```

### Static Generation Notes
- **Prerendering Disabled**: Routes require runtime data loading
- **Static Assets**: All data files served from `/static/data/`
- **Build Pipeline**: `npm run sync-data && vite build`
- **Output**: Fully static site ready for CDN deployment

## Development Best Practices

### Code Organization
1. **Component Separation**: UI components in `ui/`, feature components at top level
2. **Type Safety**: Generate types from actual data, not hand-written
3. **State Management**: Global state for data, local state for UI
4. **Event Handling**: Proper typing and propagation

### Git Workflow
1. **Feature Branches**: Create branches for new components/features
2. **Data Sync**: Run `pnpm run sync-data` before commits if data changes
3. **Build Verification**: Always run `pnpm run check` before committing
4. **Clean Builds**: Ensure `pnpm run build` succeeds

### Debugging Workflow
1. **Development Server**: Use `pnpm run dev` for hot reloading
2. **Type Checking**: Use `pnpm run check:svelte` for quick validation
3. **Data Issues**: Check `src/lib/data/sync-summary.json` for processing logs
4. **Build Issues**: Check static file availability in `static/data/`

This development guide provides comprehensive information for continuing development of the CCL Test Viewer with confidence and consistency.