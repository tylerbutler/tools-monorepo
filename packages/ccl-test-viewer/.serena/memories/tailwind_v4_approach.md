# Tailwind CSS v4 Approach for Component Styling

## Key Changes in Tailwind v4

**Deprecated/Changed:**
- `theme()` function is deprecated - no longer recommended for accessing theme values
- `@apply` directive has compatibility issues in some contexts (especially with global styles)

**Recommended Approach:**
- Use **CSS theme variables** with `var()` function instead of `theme()` or `@apply`
- Use `@theme` directive for defining custom design tokens

## Implementation Used

**Working Solution for Font Size Consistency:**
```css
/* Instead of @apply text-sm or theme('fontSize.sm') */
font-size: var(--font-size-sm);
color: var(--color-gray-700);

/* Dark mode */
color: var(--color-slate-400);
```

**Benefits:**
- ✅ Works with Tailwind v4's new architecture
- ✅ Compatible with global styles (needed for Prism.js integration)
- ✅ References Tailwind's actual theme values via CSS variables
- ✅ Maintains consistency between components automatically
- ✅ Build process completes successfully

**Pattern for Future Components:**
1. Use `var(--font-size-sm)` instead of `@apply text-sm`
2. Use `var(--color-{name}-{shade})` instead of `theme('colors.{name}.{shade}')`
3. This approach works in global styles where `@apply` might fail

**Updated Components:**
- WhitespaceCodeHighlight.svelte: Now uses CSS theme variables for font sizes and colors
- EntryDisplay.svelte: Already using `text-sm` class (no changes needed)

Both components now reference the same underlying Tailwind theme values, ensuring consistency.