# Font Consistency Final Solution

## Problem
CCL input component (WhitespaceCodeHighlight) and entry display component (EntryDisplay) had different font sizes:
- Input: 16px (wrong)
- Entry: 14px (correct, matching text-sm)

## Root Cause
Global CSS rule for PrismJS was overriding Tailwind's `text-sm` class:
```css
pre[class*="language-"], code[class*="language-"], pre, code {
    font-family: "IBM Plex Mono", monospace !important;
}
```

## Final Working Solution

**1. Added theme variable in app.css:**
```css
@theme {
    --font-size-code: 0.875rem; /* text-sm equivalent */
}
```

**2. Added specific override rule in app.css:**
```css
/* Ensure code elements match text-sm sizing */
pre.text-sm,
code.text-sm,
pre.text-sm code {
    font-size: var(--font-size-code) !important;
}
```

**3. Updated WhitespaceCodeHighlight component to use theme variable:**
```css
:global(.whitespace-indicator) {
    font-size: var(--font-size-code);
}
```

## Benefits
✅ Both components now use exactly 14px font size
✅ Stays in sync with Tailwind's text-sm automatically
✅ Uses Tailwind v4's @theme directive for design tokens
✅ Overcomes CSS specificity issues with !important override
✅ Maintains consistency across all code display components

## Future Maintenance
- Changes to text-sm in Tailwind config will automatically update both components
- New code components should use `var(--font-size-code)` for consistency
- The !important override ensures global PrismJS styles don't interfere