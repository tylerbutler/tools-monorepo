# CCL Test Viewer - Svelte 5 Patterns and Best Practices

## Core Runes Implementation Patterns

### State Management with Classes
```typescript
class AppState {
  // Reactive primitives
  testCategories = $state<TestCategory[]>([]);
  searchQuery = $state('');
  activeFilters = $state<FilterState>({
    functions: {},
    features: {},
    behaviors: {},
    categories: {}
  });

  // Computed reactive values
  filteredTests = $derived.by(() => {
    let allTests: GeneratedTest[] = [];
    // Complex filtering logic...
    return allTests;
  });

  totalFilteredTests = $derived(this.filteredTests.length);
  hasActiveFilters = $derived(
    this.searchQuery.trim() !== '' ||
    Object.values(this.activeFilters.functions).some(Boolean)
    // ... other filter checks
  );

  // Actions/methods
  toggleFilter(type: keyof FilterState, key: string) {
    this.activeFilters[type][key] = !this.activeFilters[type][key];
  }

  async loadData() {
    // Async data loading with state updates
    const response = await fetch('/data/categories.json');
    this.testCategories = await response.json();
  }
}

// Global singleton instance
export const appState = new AppState();
```

### Component Props Pattern
```svelte
<script lang="ts">
  import type { GeneratedTest } from '$lib/data/types.js';

  interface Props {
    test: GeneratedTest;
    onclick?: (event: MouseEvent) => void;
  }

  let { test, onclick }: Props = $props();

  // Local reactive state
  let expanded = $state(false);
  
  // Local computed values
  const isExpanded = $derived(expanded);
  const cardClass = $derived(
    `cursor-pointer transition-all ${expanded ? 'shadow-lg' : 'shadow-sm'}`
  );
</script>
```

### Event Handler Integration
```svelte
<!-- Component accepting event handlers -->
<script lang="ts">
  interface Props {
    onclick?: (event: MouseEvent) => void;
    oninput?: (event: Event) => void;
  }

  let { onclick, oninput, ...restProps }: Props = $props();
</script>

<button {onclick} {...restProps}>
  <slot />
</button>

<input {oninput} {...restProps} />
```

## Advanced Reactive Patterns

### Complex Filtering Logic
```typescript
filteredTests = $derived.by(() => {
  let allTests: GeneratedTest[] = [];

  // Collect tests from all categories
  for (const category of this.testCategories) {
    allTests.push(...category.tests);
  }

  // Apply multiple filter dimensions
  const categoryFilters = Object.entries(this.activeFilters.categories)
    .filter(([_, active]) => active)
    .map(([category, _]) => category);

  if (categoryFilters.length > 0) {
    allTests = allTests.filter(test => {
      const testCategory = this.testCategories
        .find(cat => cat.tests.includes(test))?.name;
      return testCategory && categoryFilters.includes(testCategory);
    });
  }

  // Search query filtering
  if (this.searchQuery.trim()) {
    const query = this.searchQuery.toLowerCase();
    allTests = allTests.filter(test =>
      test.name.toLowerCase().includes(query) ||
      test.input.toLowerCase().includes(query) ||
      test.functions.some(func => func.toLowerCase().includes(query))
    );
  }

  return allTests;
});
```

### Async Data Loading Pattern
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { appState, initializeApp } from '$lib/stores.js';

  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const success = await initializeApp();
      if (!success) {
        error = 'Failed to load test data';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="loading-skeleton">Loading...</div>
{:else if error}
  <div class="error-state">{error}</div>
{:else}
  <!-- Main content using appState.testCategories -->
{/if}
```

## UI Component Patterns

### Collapsible Sections
```svelte
<script lang="ts">
  let expanded = $state(true);
  
  function toggle() {
    expanded = !expanded;
  }
</script>

<button onclick={toggle} class="flex items-center justify-between w-full">
  <CardTitle>Section Title</CardTitle>
  {#if expanded}
    <ChevronDown class="h-4 w-4" />
  {:else}
    <ChevronRight class="h-4 w-4" />
  {/if}
</button>

{#if expanded}
  <CardContent>
    <!-- Section content -->
  </CardContent>
{/if}
```

### Dynamic Styling with Derived Values
```svelte
<script lang="ts">
  let { test }: Props = $props();

  const categoryColor = $derived.by(() => {
    if (test.functions.includes('parse')) return 'bg-blue-50 border-blue-200';
    if (test.functions.includes('get_string')) return 'bg-green-50 border-green-200';
    if (test.expected.error) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  });
</script>

<Card class={`cursor-pointer transition-all hover:shadow-md ${categoryColor}`}>
  <!-- Card content -->
</Card>
```

### Badge Variants with Props
```svelte
<script lang="ts">
  import { tv, type VariantProps } from "tailwind-variants";

  const badgeVariants = tv({
    base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
    variants: {
      variant: {
        function: "border-transparent bg-blue-100 text-blue-800",
        feature: "border-transparent bg-green-100 text-green-800",
        behavior: "border-transparent bg-purple-100 text-purple-800"
      }
    }
  });

  interface Props {
    variant?: VariantProps<typeof badgeVariants>["variant"];
  }

  let { variant, ...restProps }: Props = $props();
</script>

<span class={badgeVariants({ variant })} {...restProps}>
  <slot />
</span>
```

## Navigation and Routing Patterns

### Route-aware Navigation
```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const currentPath = $derived($page.url.pathname);
  const isHomePage = $derived(currentPath === '/');
  const isBrowsePage = $derived(currentPath === '/browse');
</script>

<nav class="flex items-center gap-2">
  <Button
    variant={isHomePage ? "default" : "outline"}
    onclick={() => goto('/')}
  >
    Home
  </Button>
  <Button
    variant={isBrowsePage ? "default" : "outline"}
    onclick={() => goto('/browse')}
  >
    Browse
  </Button>
</nav>
```

### Dynamic Route Parameters
```svelte
<script lang="ts">
  import { page } from '$app/stores';

  const testName = $derived(decodeURIComponent($page.params.name ?? ''));

  function findTest() {
    for (const category of appState.testCategories) {
      const foundTest = category.tests.find(test => test.name === testName);
      if (foundTest) {
        return foundTest;
      }
    }
    return null;
  }

  const currentTest = $derived(findTest());
</script>
```

## Performance Optimization Patterns

### Memoization with $derived.by
```typescript
const expensiveComputation = $derived.by(() => {
  // Only recalculates when dependencies change
  let result = 0;
  for (const test of this.filteredTests) {
    // Complex calculation
    result += performExpensiveOperation(test);
  }
  return result;
});
```

### Conditional Rendering for Performance
```svelte
{#if appState.filteredTests.length === 0}
  <EmptyState />
{:else}
  <div class="test-grid">
    {#each appState.filteredTests as test (test.name)}
      <TestCard {test} onclick={() => handleTestClick(test)} />
    {/each}
  </div>
{/if}
```

## Best Practices Learned

### 1. State Organization
- Use class-based state for complex applications
- Group related state and actions together
- Prefer `$derived.by()` for complex computations
- Keep UI state separate from business logic state

### 2. Component Design
- Always type Props interfaces explicitly
- Use `$props()` destructuring for clean prop handling
- Include event handlers in Props when needed
- Leverage `{...restProps}` for prop forwarding

### 3. Event Handling
- Use `onclick`, `oninput` properties instead of `on:` directives
- Type event handlers properly in component interfaces
- Handle event propagation explicitly when needed

### 4. Performance
- Use `$derived` for simple computations
- Use `$derived.by()` for complex or expensive operations
- Minimize reactive dependencies in computed values
- Use keyed each blocks for list rendering

### 5. Data Loading
- Handle loading and error states explicitly
- Use `onMount` for initial data fetching
- Implement proper error boundaries
- Show loading skeletons for better UX

This pattern collection provides a comprehensive guide for Svelte 5 development in the CCL Test Viewer project, demonstrating modern reactive programming patterns and best practices.