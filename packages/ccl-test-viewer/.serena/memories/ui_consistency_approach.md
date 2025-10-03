# UI Consistency Approach Decision

## Font Size Consistency Strategy

**Decision**: Use Tailwind's `@apply` directive for consistent font sizing across components

**Implementation**: 
- Both EntryDisplay and WhitespaceCodeHighlight now use Tailwind's `text-sm` class
- WhitespaceCodeHighlight converted from hardcoded `rem` values to `@apply text-sm`
- Dark mode styles also use `@apply` with Tailwind color classes

**Benefits**:
- Single source of truth via Tailwind's design system
- Works with Prism.js global styles via `@apply` directive
- Automatic consistency - changing Tailwind's `text-sm` updates both components
- Leverages existing Tailwind color classes for consistency
- No additional abstraction layers needed

**Pattern for Future Changes**:
When adding new code-related components, use:
- `text-sm` for font size consistency
- `@apply` directive in global styles when needed for third-party libraries
- Tailwind color classes (`text-gray-700`, `text-slate-400`) instead of hex values

**Components Updated**:
- WhitespaceCodeHighlight.svelte: Converted to `@apply text-sm` pattern
- EntryDisplay.svelte: Already using `text-sm` class (no changes needed)