# CCL Test Viewer Architecture & Technical Patterns

## Project Structure
```
tools-monorepo/packages/ccl-test-viewer/
├── scripts/
│   └── sync-data.ts           # Data pipeline from ccl-test-data
├── src/
│   ├── lib/
│   │   ├── components/ui/     # shadcn-svelte component library
│   │   ├── data/              # Generated data and types
│   │   └── utils.ts           # Utility functions
│   ├── routes/
│   │   ├── +layout.svelte     # Main layout
│   │   ├── +layout.js         # Prerendering config
│   │   └── +page.svelte       # Dashboard homepage
│   └── app.css                # Global styles
├── static/data/               # Runtime JSON files
└── build/                     # Static site output
```

## Data Pipeline Architecture

### Source → Processing → Output Flow
```
ccl-test-data/generated_tests/*.json
    ↓ (sync-data.ts)
src/lib/data/ + static/data/
    ↓ (SvelteKit build)
Static site with embedded data
```

### Data Processing Strategy
- **Build-time Processing**: All JSON transformation happens during build
- **Type Generation**: TypeScript types generated from actual test data
- **Search Optimization**: Pre-built indices for instant filtering
- **Performance**: 225KB categories + 211KB search index vs raw 200KB+ processing

### Generated Data Structure
```typescript
interface GeneratedTest {
  name: string;
  input: string;
  validation: string;
  expected: {
    count: number;
    entries?: Array<{ key: string; value: string }>;
    object?: any;
    value?: any;
    list?: any[];
    error?: boolean;
  };
  functions: string[];
  features: string[];
  behaviors: string[];
  variants: string[];
  source_test: string;
}
```

## Technology Stack Integration

### Core Technologies
- **SvelteKit 2.9.1**: Static site generation with prerendering
- **TypeScript 5.5.4**: Type safety with generated definitions
- **TailwindCSS 3.4.15**: Utility-first styling with design tokens
- **Vite 6.0.7**: Build tool and development server

### UI Component Strategy
- **shadcn-svelte**: High-quality component library (prepared but not yet integrated)
- **Lucide Svelte**: Consistent iconography throughout the application
- **TailwindCSS Variables**: CSS custom properties for theming and responsiveness

### Build System Integration
- **pnpm Workspaces**: Integrated with tools-monorepo pattern
- **Static Adapter**: @sveltejs/adapter-static for deployment
- **Biome**: Code formatting and linting consistency
- **TSX**: TypeScript script execution for data pipeline

## Performance Architecture

### Optimization Strategies
- **Static Generation**: Full prerendering eliminates server-side processing
- **Build-time Data Processing**: JSON transformation during build vs runtime
- **Search Indices**: Pre-computed tokens for instant filtering (173 unique tokens)
- **Code Splitting**: SvelteKit automatic chunking for optimal loading

### Scalability Design
- **Virtual Scrolling**: Planned for 366+ test components
- **Progressive Loading**: Chunked data loading for large datasets
- **Search Performance**: O(1) lookup via pre-built indices
- **Bundle Optimization**: Static assets with CDN-friendly caching

## Development Workflow Patterns

### Command Patterns
```bash
# Development workflow
pnpm --filter ccl-test-viewer run dev        # Development server
pnpm --filter ccl-test-viewer run sync-data  # Manual data sync
pnpm --filter ccl-test-viewer run build      # Production build
pnpm --filter ccl-test-viewer run check      # Type checking
```

### Integration Workflow
```bash
# From tools-monorepo root
pnpm install --filter ccl-test-viewer        # Install dependencies
pnpm --filter ccl-test-viewer run build      # Build with data sync
```

### Data Sync Integration
- **Automatic**: `npm run build` triggers `sync-data.ts` before Vite build
- **Manual**: `npm run sync-data` for development data updates
- **Dependency**: Build fails if ccl-test-data is not available

## Component Architecture (Ready for Implementation)

### Design System Foundation
```typescript
// Utility function for className merging
function cn(...classes: ClassValue[]): string

// Component patterns (prepared)
<Card>
  <CardHeader>
    <CardTitle />
  </CardHeader>
  <CardContent />
</Card>
```

### Planned Component Hierarchy
```
TestCard (display test case preview)
├── TestInput (CCL input with syntax highlighting)
├── TestOutput (expected results with formatting)
└── TestMetadata (functions, features, behaviors)

FilterSidebar (multi-dimensional filtering)
├── SearchInput (real-time search)
├── CategoryFilter (test categories)
├── FunctionFilter (CCL functions)
└── FeatureFilter (language features)

TestDetail (detailed test view)
├── TestCard (embedded)
├── TestContext (source test information)
└── TestValidation (validation rules)
```

## State Management Patterns

### Data Flow Architecture
```
Static JSON files → Svelte stores → Components
```

### Planned Store Structure
```typescript
// Test data store
export const testCategories = writable<TestCategory[]>([]);
export const testStats = writable<TestStats | null>(null);

// Filter state store
export const searchQuery = writable<string>('');
export const activeFilters = writable<FilterState>({
  functions: {},
  features: {},
  categories: {}
});

// UI state store
export const selectedTest = writable<GeneratedTest | null>(null);
export const viewMode = writable<'grid' | 'list'>('grid');
```

## Integration Patterns with ccl-test-data

### Data Synchronization
- **Source**: `../../../ccl-test-data/generated_tests/*.json`
- **Processing**: Category derivation from filenames
- **Validation**: Schema validation during sync process
- **Updates**: Manual sync required when ccl-test-data changes

### Test Data Format Alignment
- **Generated Tests**: Machine-friendly flat format (primary)
- **Source Tests**: Human-friendly nested format (reference)
- **Type Safety**: Generated TypeScript definitions from actual data
- **Consistency**: Validation against JSON schema during processing

## Error Handling & Resilience

### Data Pipeline Resilience
```typescript
// Graceful fallback for missing test files
async function loadTestFile(filePath: string): Promise<{ tests: GeneratedTest[] }> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load test file ${filePath}:`, error);
    return { tests: [] }; // Graceful degradation
  }
}
```

### Build Error Handling
- **Missing Data**: Build fails fast if ccl-test-data unavailable
- **Type Safety**: Generated types prevent runtime type errors
- **Validation**: JSON schema validation during data processing
- **Recovery**: Clear error messages with resolution guidance

## Next Implementation Priorities

### Immediate (Phase 2)
1. **TestCard Component**: Core test display with proper styling
2. **Basic Routing**: Test detail pages and navigation
3. **Filter Integration**: Connect generated search indices to UI
4. **shadcn-svelte Setup**: Complete component library integration

### Short-term (Phase 3)
1. **Syntax Highlighting**: Prism.js for CCL code display
2. **Search Performance**: Real-time filtering with debouncing
3. **Responsive Design**: Mobile and tablet optimizations
4. **Statistics Dashboard**: Interactive charts and analytics

### Long-term (Phase 4)
1. **Virtual Scrolling**: Performance optimization for large datasets
2. **Accessibility**: WCAG AA compliance and keyboard navigation
3. **Testing Suite**: Component and integration test coverage
4. **Deployment**: Automated CI/CD pipeline setup

This architecture provides a solid foundation for systematic component implementation while maintaining performance, type safety, and integration with the existing tools-monorepo ecosystem.