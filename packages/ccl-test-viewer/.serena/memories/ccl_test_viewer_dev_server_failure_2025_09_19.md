# CCL Test Viewer - Dev Server Load Failure Investigation

## Problem Summary
Dev server running at http://localhost:5173/ shows blank page with JavaScript runtime error:
```
TypeError: Cannot read properties of undefined (reading 'call')
at get_first_child (http://localhost:5173/node_modules/.vite/deps/chunk-5KDN2TOH.js?v=95b3fdca:3542:29)
```

## Root Cause Analysis
The error is a **Svelte 5 runes/store compatibility issue**. Specifically:
- Mixing `$page` store (legacy Svelte) with `$derived` runes (Svelte 5) in layout components
- Error occurs in DOM manipulation during SSR hydration
- Known issue in Svelte 5 ecosystem per GitHub issue #15104

## Technical Context
- **Svelte Version**: 5.39.3 (latest)
- **SvelteKit Version**: 2.42.2
- **Error Pattern**: Store access with runes in `src/routes/+layout.svelte`
- **Trigger**: `const currentPath = $derived($page.url?.pathname || "/");`

## Attempted Solutions

### 1. Store/Runes Compatibility Fix
**Approach**: Convert from reactive statements to runes
```svelte
// FAILED - Still mixed store/runes
const currentPath = $derived($page.url?.pathname || "/");
```

### 2. Pure Runes Approach
**Approach**: Replace stores with load functions
- Created `+layout.ts` with load function
- Updated components to use `data` props instead of stores
- Removed `$page` store dependencies

**Status**: PARTIAL - Build conflicts remain

### 3. Build System Issues
**Current Problems**:
- Multiple universal layout files (`.js` vs `.ts` conflicts)
- SSR module resolution errors: `Cannot find module '__SERVER__/internal.js'`
- SvelteKit sync issues with generated types

## Key Discoveries

### Svelte 5 Store/Runes Incompatibility
- **Critical**: Cannot mix `$page` stores with `$derived` runes
- **Solution**: Use load functions + props OR pure store reactivity
- **Pattern**: `$: reactiveVar = $store.value` (legacy) vs load function approach

### SvelteKit Build System Fragility
- File conflicts between `.js` and `.ts` versions cause build failures
- Generated files in `.svelte-kit/` must be properly synchronized
- SSR module resolution sensitive to build order

### Error Manifestation Pattern
1. Svelte 5 runes mode enabled by default
2. Legacy `$page` store accessed with `$derived`
3. DOM manipulation fails during hydration
4. Blank page with console error

## Working Patterns (From Memory)
Previous working implementation used:
- Class-based state management with pure runes
- No direct store access in components
- Proper separation of server/client data flow

## Next Steps for Resolution
1. **Complete pure runes conversion**: Remove all store dependencies
2. **Fix build conflicts**: Ensure only `.ts` files in routes
3. **Alternative**: Revert to working store-only pattern
4. **Clear build cache**: Full `.svelte-kit` and `node_modules/.vite` cleanup

## Technical Debt Created
- Mixed patterns between stores and runes
- Incomplete migration leaving build system in inconsistent state
- Type generation conflicts from file overlaps

## Prevention Strategy
- **Commit to single pattern**: Either full runes OR full stores, never mixed
- **Build validation**: Check for file conflicts before changes
- **Incremental migration**: Convert components systematically, not piecemeal