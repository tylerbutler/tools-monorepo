# CCL Test Viewer - Complete Design Specification

## Project Overview

A SvelteKit-based web application for visualizing and browsing CCL (Categorical Configuration Language) test cases from the ccl-test-data repository. The application provides an interactive interface to quickly compare test inputs with their expected outputs across different CCL functions and features.

### Key Requirements
- **Primary Use Case**: Visual comparison of CCL test cases for quick browsing
- **Target Users**: CCL library implementers and language developers
- **Data Source**: JSON test files from ccl-test-data repository (both source and generated formats)
- **Deployment**: Static site generation for build-time data processing
- **Performance**: Optimized for browsing large test datasets (450+ tests)

## Technical Architecture

### Tech Stack Selection

#### Core Framework
- **SvelteKit**: Main application framework with static site generation
- **TypeScript**: Type safety and better developer experience
- **Vite**: Build tool and development server

#### UI Component Library
- **shadcn-svelte** (`/huntabyte/shadcn-svelte`)
  - Trust Score: 9.5/10
  - 386+ code examples in Context7
  - Components: Card, Table, Badge, Tabs, Dialog, Accordion, Input, Checkbox
  - Perfect for structured test case display

#### Styling & Icons
- **TailwindCSS** (`/websites/tailwindcss`)
  - Trust Score: 7.5/10
  - 1545+ code examples
  - Utility-first CSS for rapid development

- **Lucide Svelte** (`/websites/lucide_dev-guide`)
  - Trust Score: 7.5/10
  - 125+ code examples
  - Icons: Search, Filter, Code, Eye, ChevronRight

#### Syntax Highlighting
- **Prism.js** (`/prismjs/prism`)
  - Trust Score: 8.3/10
  - 129+ code examples
  - CCL syntax highlighting for input display

### Data Architecture

#### Data Sources
```
ccl-test-data/
├── source_tests/           # Human-readable source format
│   ├── api_core_ccl_parsing.json
│   ├── api_core_ccl_hierarchy.json
│   ├── api_typed_access.json
│   ├── api_comments.json
│   └── ...
└── generated_tests/        # Flat format (PRIMARY DATA SOURCE)
    ├── api_core_ccl_parsing.json
    ├── api_core_ccl_hierarchy.json
    └── ...
```

#### Data Processing Strategy
- **Build-time Processing**: Copy JSON files to `static/data/` during build
- **Primary Format**: Use `generated_tests/` for consistency and completeness
- **Data Structure**: Each test has standardized `expected` object with `count` field

#### TypeScript Interfaces
```typescript
interface GeneratedTest {
  name: string;
  input: string;
  validation: CCLFunction;
  expected: {
    count: number;
    entries?: Array<{key: string, value: string}>;
    object?: any;
    value?: any;
    list?: any[];
    error?: boolean;
  };
  functions: string[];
  features: string[];
  behaviors: string[];
  args?: string[];
  source_test: string;
}

type CCLFunction =
  | "parse" | "parse_value" | "filter" | "compose" | "expand_dotted"
  | "build_hierarchy" | "get_string" | "get_int" | "get_bool" | "get_float" | "get_list"
  | "canonical_format" | "load" | "round_trip" | "associativity";
```

## Application Structure

### Route Architecture
```
src/
├── routes/
│   ├── +layout.svelte           # App shell with navigation
│   ├── +page.svelte             # Dashboard with overview stats
│   ├── browse/
│   │   ├── +page.svelte         # Test browser with filtering
│   │   └── [category]/
│   │       └── +page.svelte     # Category-specific tests
│   └── test/
│       └── [id]/
│           └── +page.svelte     # Individual test detail view
├── lib/
│   ├── components/
│   │   ├── TestCard.svelte      # Test case preview card
│   │   ├── TestDetail.svelte    # Detailed test view
│   │   ├── FilterSidebar.svelte # Advanced filtering controls
│   │   ├── StatsOverview.svelte # Test statistics display
│   │   └── ui/                  # shadcn-svelte components
│   ├── data/
│   │   └── loader.ts           # Data loading utilities
│   ├── utils/
│   │   ├── formatting.ts       # CCL syntax highlighting
│   │   └── filtering.ts        # Test filtering logic
│   └── stores/
│       ├── tests.ts            # Test data store
│       └── filters.ts          # Filter state store
└── static/
    └── data/                   # JSON test files (copied from ccl-test-data)
```

## Component Design Specifications

### 1. TestCard Component

#### Visual Layout
```
┌─────────────────────────────────────────────────────┐
│ basic_key_value_pairs_parse              [parse]    │ ← Title + Function Badge
│ [function:parse] [feature:parsing]                  │ ← Feature/Function Tags
├─────────────────────────────────────────────────────┤
│ 📝 Input                    │ 👁 Expected (2)       │ ← Split Layout with Icons
│ name = Alice               │ ┌─────────────────────┐ │
│ age = 42                   │ │ key     │ value     │ │
│                            │ ├─────────────────────┤ │
│                            │ │ name    │ Alice     │ │
│                            │ │ age     │ 42        │ │
│                            │ └─────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ from: basic_key_value_pairs       [View Details →] │ ← Footer
└─────────────────────────────────────────────────────┘
```

#### shadcn-svelte Implementation
```svelte
<!-- TestCard.svelte -->
<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Code, Eye } from 'lucide-svelte';

  export let test: GeneratedTest;
  export let compact = false;
</script>

<Card.Root class="hover:shadow-md transition-shadow cursor-pointer">
  <Card.Header class="pb-3">
    <div class="flex items-center justify-between">
      <Card.Title class="text-base font-semibold">{test.name}</Card.Title>
      <Badge variant="secondary" class="font-mono text-xs">{test.validation}</Badge>
    </div>
    <div class="flex gap-1 flex-wrap mt-2">
      {#each test.functions as func}
        <Badge variant="outline" class="text-xs">function:{func}</Badge>
      {/each}
      {#each test.features as feature}
        <Badge variant="default" class="text-xs">feature:{feature}</Badge>
      {/each}
    </div>
  </Card.Header>

  <Card.Content class="pt-0">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Input Section -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <Code class="w-4 h-4 text-blue-600" />
          <h4 class="font-semibold text-sm">Input</h4>
        </div>
        <pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono border"><code class="language-ccl">{test.input}</code></pre>
      </div>

      <!-- Output Section -->
      <div>
        <div class="flex items-center gap-2 mb-2">
          <Eye class="w-4 h-4 text-green-600" />
          <h4 class="font-semibold text-sm">Expected ({test.expected.count})</h4>
        </div>

        {#if test.expected.entries}
          <!-- Key-Value Entries Display -->
          <div class="bg-muted border rounded-md overflow-hidden">
            <div class="bg-muted-foreground/10 px-3 py-1 text-xs font-semibold border-b">
              <span class="inline-block w-20">Key</span>
              <span>Value</span>
            </div>
            {#each test.expected.entries as entry}
              <div class="px-3 py-1 text-xs border-b last:border-0 font-mono">
                <span class="inline-block w-20 font-semibold text-blue-700">{entry.key}</span>
                <span class="text-green-700">{entry.value}</span>
              </div>
            {/each}
          </div>
        {:else if test.expected.object}
          <!-- Object Display -->
          <pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono border"><code>{JSON.stringify(test.expected.object, null, 2)}</code></pre>
        {:else if test.expected.value !== undefined}
          <!-- Single Value Display -->
          <div class="bg-muted p-3 rounded-md text-xs font-mono border">
            <span class="text-green-700">{test.expected.value}</span>
          </div>
        {/if}
      </div>
    </div>
  </Card.Content>

  <Card.Footer class="pt-3 border-t">
    <div class="flex items-center justify-between w-full text-sm text-muted-foreground">
      <span class="text-xs">from: <span class="font-mono">{test.source_test}</span></span>
      <a href="/test/{test.name}" class="text-primary hover:underline text-xs">View Details →</a>
    </div>
  </Card.Footer>
</Card.Root>
```

### 2. FilterSidebar Component

#### Visual Layout
```
┌─────────────────────────────┐
│ 🔍 [Search tests...]       │ ← Search Input
├─────────────────────────────┤
│ ▼ CATEGORIES               │
│   ☑ Parsing (45)           │
│   ☑ Hierarchy (23)         │
│   ☐ Typed Access (31)      │
│   ☐ Comments (12)          │
├─────────────────────────────┤
│ ▼ FUNCTIONS                │
│   ☑ parse (163)            │
│   ☐ build_hierarchy (77)   │
│   ☐ get_string (42)        │
│   ☐ get_int (28)           │
├─────────────────────────────┤
│ ▼ FEATURES                 │
│   ☐ comments (12)          │
│   ☐ unicode (8)            │
│   ☐ whitespace (24)        │
└─────────────────────────────┘
```

#### shadcn-svelte Implementation
```svelte
<!-- FilterSidebar.svelte -->
<script lang="ts">
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Search, X } from 'lucide-svelte';

  export let filters = {
    search: '',
    functions: {},
    features: {},
    categories: {}
  };

  export let availableFunctions = [];
  export let availableFeatures = [];
  export let availableCategories = [];
  export let testCounts = {};

  function clearAllFilters() {
    filters.search = '';
    filters.functions = {};
    filters.features = {};
    filters.categories = {};
  }
</script>

<div class="w-64 border-r bg-background p-4 h-full overflow-y-auto">
  <!-- Search Section -->
  <div class="relative mb-6">
    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      placeholder="Search tests..."
      class="pl-10 pr-8"
      bind:value={filters.search}
    />
    {#if filters.search}
      <button
        on:click={() => filters.search = ''}
        class="absolute right-3 top-1/2 transform -translate-y-1/2"
      >
        <X class="w-4 h-4 text-muted-foreground hover:text-foreground" />
      </button>
    {/if}
  </div>

  <!-- Clear All Button -->
  <div class="mb-4">
    <button
      on:click={clearAllFilters}
      class="text-xs text-muted-foreground hover:text-foreground underline"
    >
      Clear All Filters
    </button>
  </div>

  <!-- Filter Accordions -->
  <Accordion.Root type="multiple" class="space-y-2">
    <!-- Categories -->
    <Accordion.Item value="categories" class="border rounded-lg">
      <Accordion.Trigger class="px-3 py-2 hover:bg-muted/50">
        <span class="font-semibold text-sm">Categories</span>
      </Accordion.Trigger>
      <Accordion.Content class="px-3 pb-3">
        <div class="space-y-2">
          {#each availableCategories as category}
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <Checkbox
                  bind:checked={filters.categories[category]}
                  id="cat-{category}"
                />
                <label for="cat-{category}" class="text-sm capitalize cursor-pointer">
                  {category.replace(/_/g, ' ')}
                </label>
              </div>
              <Badge variant="outline" class="text-xs">
                {testCounts.categories[category] || 0}
              </Badge>
            </div>
          {/each}
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <!-- Functions -->
    <Accordion.Item value="functions" class="border rounded-lg">
      <Accordion.Trigger class="px-3 py-2 hover:bg-muted/50">
        <span class="font-semibold text-sm">Functions</span>
      </Accordion.Trigger>
      <Accordion.Content class="px-3 pb-3">
        <div class="space-y-2">
          {#each availableFunctions as func}
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <Checkbox
                  bind:checked={filters.functions[func]}
                  id="func-{func}"
                />
                <label for="func-{func}" class="text-sm font-mono cursor-pointer">
                  {func}
                </label>
              </div>
              <Badge variant="outline" class="text-xs">
                {testCounts.functions[func] || 0}
              </Badge>
            </div>
          {/each}
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <!-- Features -->
    <Accordion.Item value="features" class="border rounded-lg">
      <Accordion.Trigger class="px-3 py-2 hover:bg-muted/50">
        <span class="font-semibold text-sm">Features</span>
      </Accordion.Trigger>
      <Accordion.Content class="px-3 pb-3">
        <div class="space-y-2">
          {#each availableFeatures as feature}
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <Checkbox
                  bind:checked={filters.features[feature]}
                  id="feat-{feature}"
                />
                <label for="feat-{feature}" class="text-sm cursor-pointer">
                  {feature}
                </label>
              </div>
              <Badge variant="outline" class="text-xs">
                {testCounts.features[feature] || 0}
              </Badge>
            </div>
          {/each}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</div>
```

### 3. TestDetail Component (Modal/Page View)

#### Visual Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Browse    basic_key_value_pairs_parse        [parse]  │
├─────────────────────────────────────────────────────────────────┤
│ [function:parse] [feature:parsing] [behavior:none]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ 📝 INPUT ─────────────────┐ ┌─ 👁 EXPECTED (parse) ─────────┐ │
│ │ name = Alice               │ │ Count: 2                      │ │
│ │ age = 42                   │ │                               │ │
│ │                            │ │ Entries:                      │ │
│ │                            │ │ ┌───────────────────────────┐ │ │
│ │                            │ │ │ Key     │ Value           │ │ │
│ │                            │ │ ├───────────────────────────┤ │ │
│ │                            │ │ │ name    │ Alice           │ │ │
│ │                            │ │ │ age     │ 42              │ │ │
│ │                            │ │ └───────────────────────────┘ │ │
│ └────────────────────────────┘ └───────────────────────────────┘ │
│                                                                 │
│ METADATA                                                        │
│ • Functions: parse                                              │
│ • Features: (none)                                              │
│ • Source: basic_key_value_pairs                                 │
│ • Behaviors: (none)                                             │
│ • Arguments: (none)                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Dashboard/Stats Overview

#### Visual Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                    CCL Test Viewer                              │
├─────────────────────────────────────────────────────────────────┤
│ 📊 TEST STATISTICS                                              │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │    452      │ │     12      │ │     15      │ │     167     │ │
│ │ Total Tests │ │ Categories  │ │ Functions   │ │ Source Tests│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                 │
│ 📈 FUNCTION COVERAGE                                           │
│ parse ████████████████████████████████ 163 tests              │
│ build_hierarchy ███████████████ 77 tests                      │
│ get_string ██████████ 42 tests                                │
│ get_list ████████ 35 tests                                    │
│                                                                 │
│ 🏷️ FEATURE DISTRIBUTION                                        │
│ empty_keys ████████ 43 tests                                  │
│ whitespace ████ 24 tests                                      │
│ comments ██ 12 tests                                          │
│                                                                 │
│ [Browse All Tests →]                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Loading and Processing

### Build-time Data Processing
```typescript
// scripts/build-data.js
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function processTestData() {
  const sourceDir = '../ccl-test-data/generated_tests';
  const targetDir = 'static/data';

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true });

  // Read all JSON files
  const files = await readdir(sourceDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const allTests = [];
  const categories = {};

  for (const file of jsonFiles) {
    const content = await readFile(join(sourceDir, file), 'utf-8');
    const data = JSON.parse(content);

    const category = file.replace('.json', '').replace('api_', '');
    categories[category] = data.tests;
    allTests.push(...data.tests);
  }

  // Generate statistics
  const stats = generateStats(allTests);

  // Write processed data
  await writeFile(join(targetDir, 'all-tests.json'), JSON.stringify(allTests, null, 2));
  await writeFile(join(targetDir, 'categories.json'), JSON.stringify(categories, null, 2));
  await writeFile(join(targetDir, 'stats.json'), JSON.stringify(stats, null, 2));
}

function generateStats(tests) {
  const stats = {
    totalTests: tests.length,
    functions: {},
    features: {},
    categories: {},
    behaviors: {}
  };

  tests.forEach(test => {
    // Count functions
    test.functions.forEach(func => {
      stats.functions[func] = (stats.functions[func] || 0) + 1;
    });

    // Count features
    test.features.forEach(feature => {
      stats.features[feature] = (stats.features[feature] || 0) + 1;
    });

    // Count behaviors
    test.behaviors.forEach(behavior => {
      stats.behaviors[behavior] = (stats.behaviors[behavior] || 0) + 1;
    });
  });

  return stats;
}
```

### Runtime Data Loading
```typescript
// lib/data/loader.ts
export class CCLTestLoader {
  private cache = new Map();

  async loadAllTests(): Promise<GeneratedTest[]> {
    if (this.cache.has('all-tests')) {
      return this.cache.get('all-tests');
    }

    const response = await fetch('/data/all-tests.json');
    const tests = await response.json();
    this.cache.set('all-tests', tests);
    return tests;
  }

  async loadTestsByCategory(category: string): Promise<GeneratedTest[]> {
    const cacheKey = `category-${category}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await fetch('/data/categories.json');
    const categories = await response.json();
    const tests = categories[category] || [];
    this.cache.set(cacheKey, tests);
    return tests;
  }

  async loadStats(): Promise<TestStats> {
    if (this.cache.has('stats')) {
      return this.cache.get('stats');
    }

    const response = await fetch('/data/stats.json');
    const stats = await response.json();
    this.cache.set('stats', stats);
    return stats;
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. **SvelteKit Setup**: Initialize project with TypeScript and TailwindCSS
2. **shadcn-svelte Integration**: Install and configure component library
3. **Data Processing**: Build-time JSON processing and static file generation
4. **Basic Routing**: Set up route structure and navigation shell

### Phase 2: Core Components (Week 2)
1. **TestCard Component**: Implement main test case display component
2. **FilterSidebar Component**: Build filtering interface with checkboxes
3. **Basic Browse Page**: Grid layout with TestCard components
4. **Data Integration**: Connect components to processed JSON data

### Phase 3: Advanced Features (Week 3)
1. **TestDetail Component**: Detailed test view with full metadata
2. **Search Functionality**: Full-text search across test names and content
3. **Statistics Dashboard**: Test coverage and distribution analytics
4. **Responsive Design**: Mobile and tablet optimizations

### Phase 4: Polish and Performance (Week 4)
1. **Syntax Highlighting**: Prism.js integration for CCL code
2. **Virtual Scrolling**: Performance optimization for large datasets
3. **Accessibility**: WCAG compliance and keyboard navigation
4. **Testing**: Unit tests for components and integration tests

## Performance Considerations

### Optimization Strategies
- **Virtual Scrolling**: Handle 450+ tests efficiently in grid view
- **Search Indexing**: Pre-built search indices for fast filtering
- **Code Splitting**: Lazy load components and routes
- **Static Generation**: Pre-render pages during build
- **Image Optimization**: Optimize any icons or graphics
- **Bundle Analysis**: Monitor and optimize JavaScript bundle size

### Responsive Design Breakpoints
- **Mobile (< 768px)**: Single column, collapsible filters
- **Tablet (768px - 1024px)**: Two-column grid, sidebar filters
- **Desktop (> 1024px)**: Three-column grid, persistent sidebar

## Accessibility Standards

### WCAG Compliance
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG AA compliant color schemes (4.5:1 ratio)
- **Focus Management**: Clear focus indicators and logical tab order
- **Alt Text**: Descriptive text for all icons and graphics

### Implementation Details
- Use semantic HTML elements (`main`, `section`, `article`, `nav`)
- Provide ARIA labels for interactive elements
- Ensure sufficient color contrast for text and backgrounds
- Implement skip links for keyboard navigation
- Test with screen readers (NVDA, JAWS, VoiceOver)

## Development Setup

### Installation Commands
```bash
# Initialize SvelteKit project
npm create svelte@latest ccl-test-viewer
cd ccl-test-viewer
npm install

# Install dependencies
npm install -D typescript tailwindcss @tailwindcss/typography
npm install -D @types/prismjs prismjs
npm install lucide-svelte

# Install shadcn-svelte
npx shadcn-svelte@latest init
npx shadcn-svelte@latest add card table badge tabs dialog accordion input checkbox
```

### Configuration Files
```javascript
// vite.config.js
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: ['../ccl-test-data'] // Allow access to test data
    }
  }
});
```

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
```

This comprehensive design specification provides a complete blueprint for implementing the CCL Test Viewer with modern web technologies, excellent user experience, and maintainable code architecture.