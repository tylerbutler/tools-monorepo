# Color Schemes

This app uses a modular color scheme system that makes it easy to swap between different themes.

## Current Theme: Nord

The app currently uses the **Nord** color scheme - an arctic, north-bluish clean theme with 16 carefully chosen colors.

## How to Change Color Schemes

### 1. Simple Theme System

The app uses a **simple theme system** with a single `theme.css` file that gets updated when you want to switch themes.

**Current structure:**
- `src/app.css` - Main application styles with `@import "./theme.css"`
- `src/theme.css` - Current theme (Nord), gets replaced when switching

### 2. Super Easy Theme Change 🎨

**One-line theme switching:**
```bash
# Switch to any Base16 theme
node scripts/base16-converter.js [theme-name] > src/theme.css
pnpm build

# Examples:
node scripts/base16-converter.js tomorrow-night > src/theme.css
node scripts/base16-converter.js monokai > src/theme.css
node scripts/base16-converter.js gruvbox-dark > src/theme.css
node scripts/base16-converter.js railscasts > src/theme.css
```

**Available themes (generate on demand):**
```bash
# All Base16 themes supported:
node scripts/base16-converter.js tomorrow-night > src/theme.css
node scripts/base16-converter.js monokai > src/theme.css
node scripts/base16-converter.js github > src/theme.css
node scripts/base16-converter.js solarized-dark > src/theme.css
node scripts/base16-converter.js gruvbox-dark > src/theme.css
node scripts/base16-converter.js one-dark > src/theme.css
node scripts/base16-converter.js railscasts > src/theme.css
```

### 3. Legacy Color Schemes (Manual Copy-Paste)

Here are additional color schemes for manual use:

#### Nord (Current Theme File)
```css
/* Current Nord implementation - see src/theme-nord.css */
```

#### Dracula Theme
```css
:root {
	--radius: 0.625rem;

	/* Dracula Palette */
	--dracula-bg: oklch(0.20 0.027 264);      /* #282a36 */
	--dracula-current: oklch(0.32 0.027 264); /* #44475a */
	--dracula-fg: oklch(0.97 0.013 264);      /* #f8f8f2 */
	--dracula-comment: oklch(0.55 0.073 264); /* #6272a4 */
	--dracula-cyan: oklch(0.85 0.099 195);    /* #8be9fd */
	--dracula-green: oklch(0.83 0.135 136);   /* #50fa7b */
	--dracula-orange: oklch(0.80 0.125 70);   /* #ffb86c */
	--dracula-pink: oklch(0.75 0.166 339);    /* #ff79c6 */
	--dracula-purple: oklch(0.72 0.122 285);  /* #bd93f9 */
	--dracula-red: oklch(0.68 0.176 17);      /* #ff5555 */
	--dracula-yellow: oklch(0.89 0.137 99);   /* #f1fa8c */

	/* Semantic mapping */
	--background: var(--dracula-bg);
	--foreground: var(--dracula-fg);
	--primary: var(--dracula-purple);
	--primary-foreground: var(--dracula-bg);
	--success: var(--dracula-green);
	--success-foreground: var(--dracula-bg);
	--warning: var(--dracula-yellow);
	--warning-foreground: var(--dracula-bg);
	--info: var(--dracula-cyan);
	--info-foreground: var(--dracula-bg);
	--destructive: var(--dracula-red);
	--destructive-foreground: var(--dracula-fg);
	/* ... add remaining mappings */
}
```

#### Tokyo Night Theme
```css
:root {
	--radius: 0.625rem;

	/* Tokyo Night Palette */
	--tokyo-bg: oklch(0.15 0.027 264);        /* #1a1b26 */
	--tokyo-bg-dark: oklch(0.12 0.027 264);   /* #16161e */
	--tokyo-fg: oklch(0.85 0.027 264);        /* #c0caf5 */
	--tokyo-blue: oklch(0.65 0.130 225);      /* #7aa2f7 */
	--tokyo-cyan: oklch(0.75 0.076 195);      /* #7dcfff */
	--tokyo-green: oklch(0.75 0.130 135);     /* #9ece6a */
	--tokyo-orange: oklch(0.75 0.140 70);     /* #ff9e64 */
	--tokyo-purple: oklch(0.70 0.140 285);    /* #bb9af7 */
	--tokyo-red: oklch(0.65 0.160 17);        /* #f7768e */
	--tokyo-yellow: oklch(0.85 0.120 85);     /* #e0af68 */

	/* Semantic mapping */
	--background: var(--tokyo-bg);
	--foreground: var(--tokyo-fg);
	--primary: var(--tokyo-blue);
	--primary-foreground: var(--tokyo-bg);
	/* ... add remaining mappings */
}
```

#### Catppuccin Mocha
```css
:root {
	--radius: 0.625rem;

	/* Catppuccin Mocha Palette */
	--ctp-base: oklch(0.17 0.017 267);        /* #1e1e2e */
	--ctp-mantle: oklch(0.15 0.017 267);      /* #181825 */
	--ctp-crust: oklch(0.13 0.017 267);       /* #11111b */
	--ctp-text: oklch(0.87 0.017 267);        /* #cdd6f4 */
	--ctp-blue: oklch(0.70 0.137 250);        /* #89b4fa */
	--ctp-green: oklch(0.82 0.106 130);       /* #a6e3a1 */
	--ctp-peach: oklch(0.79 0.132 40);        /* #fab387 */
	--ctp-pink: oklch(0.81 0.144 340);        /* #f5c2e7 */
	--ctp-mauve: oklch(0.74 0.156 320);       /* #cba6f7 */
	--ctp-red: oklch(0.71 0.142 15);          /* #f38ba8 */
	--ctp-yellow: oklch(0.87 0.108 85);       /* #f9e2af */

	/* Semantic mapping */
	--background: var(--ctp-base);
	--foreground: var(--ctp-text);
	--primary: var(--ctp-blue);
	--primary-foreground: var(--ctp-base);
	/* ... add remaining mappings */
}
```

### 3. CSS Variable Structure

All schemes must define these core variables:

**Core UI Variables:**
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

**Semantic Colors:**
- `--success`, `--success-foreground`
- `--warning`, `--warning-foreground`
- `--info`, `--info-foreground`
- `--purple`, `--purple-foreground`
- `--teal`, `--teal-foreground`
- `--pink`, `--pink-foreground`

**Chart Colors:**
- `--chart-1` through `--chart-5`

**Sidebar Variables:**
- `--sidebar`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`

### 4. Base16 Theme Converter 🎨

**Automatic Base16 Conversion**: Use the built-in converter to convert any Base16 theme to our app format!

```bash
# Convert predefined Base16 themes
node scripts/base16-converter.js tomorrow-night
node scripts/base16-converter.js monokai
node scripts/base16-converter.js github
node scripts/base16-converter.js solarized-dark
node scripts/base16-converter.js gruvbox-dark
node scripts/base16-converter.js one-dark

# Convert custom Base16 theme (provide 16 hex colors)
node scripts/base16-converter.js "My Theme" base00 base01 base02 ... base0F
```

**Available Predefined Themes:**
- `tomorrow-night` - Tomorrow Night
- `monokai` - Monokai
- `github` - GitHub
- `solarized-dark` - Solarized Dark
- `gruvbox-dark` - Gruvbox Dark
- `one-dark` - One Dark

**Usage Example:**
```bash
# Generate CSS for Tomorrow Night theme
node scripts/base16-converter.js tomorrow-night > temp-theme.css

# Copy the output and replace the :root section in src/app.css
# Then run: pnpm build
```

**Base16 Color Mapping:**
The converter automatically maps Base16 colors to our semantic variables:
- `base00-base07` → Backgrounds and foregrounds
- `base08` (red) → Destructive actions, error states
- `base09` (orange) → Chart color, warm accents
- `base0A` (yellow) → Warning states, highlights
- `base0B` (green) → Success states, positive actions
- `base0C` (cyan) → Info states, primary accents
- `base0D` (blue) → Primary actions, links
- `base0E` (purple) → Creative elements, function tags
- `base0F` (brown) → Chart accent, special elements

### 5. Manual Color Conversion

For non-Base16 themes:

1. **Find hex colors** from the official theme documentation
2. **Convert to OKLCH** using tools like:
   - [OKLCH Color Picker](https://oklch.com/)
   - [Culori converter](https://culorijs.org/oklch/)
3. **Test accessibility** to ensure proper contrast ratios
4. **Map semantically** to the required CSS variables

### 5. Testing

After changing schemes:

1. Run `pnpm build`
2. Run `pnpm preview`
3. Test all pages: `/`, `/styles`, `/browse`
4. Check both light and dark mode compatibility
5. Verify accessibility with screen readers

## Tips

- **Keep original colors commented** for reference
- **Use semantic variable names** rather than color names
- **Test with actual content** to ensure readability
- **Consider brand guidelines** when choosing schemes
- **Maintain consistent contrast ratios** across themes

## Contributing

When adding new color schemes:

1. Add the scheme to this documentation
2. Test thoroughly across all components
3. Include accessibility notes
4. Provide conversion commands/tools used