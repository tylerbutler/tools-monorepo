#!/usr/bin/env node

/**
 * Base16 to CCL Test Viewer Color Scheme Converter
 *
 * Converts any Base16 theme to our app's OKLCH color scheme format.
 *
 * Usage:
 *   node scripts/base16-converter.js <theme-name> <base00> <base01> ... <base0F>
 *   node scripts/base16-converter.js "Tomorrow Night" "1d1f21" "282a2e" "373b41" "969896" "b4b7b4" "c5c8c6" "e0e0e0" "ffffff" "cc6666" "de935f" "f0c674" "b5bd68" "8abeb7" "81a2be" "b294bb" "a3685a"
 */

// Convert hex to OKLCH using approximate conversion
function hexToOklch(hex) {
	// Remove # if present
	hex = hex.replace("#", "");

	// Parse hex to RGB
	const r = parseInt(hex.substr(0, 2), 16) / 255;
	const g = parseInt(hex.substr(2, 2), 16) / 255;
	const b = parseInt(hex.substr(4, 2), 16) / 255;

	// Simple RGB to OKLCH approximation
	// For production, use more accurate conversion
	const lightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;

	// Approximate chroma and hue calculation
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const chroma = (max - min) * 0.5; // Simplified chroma

	let hue = 0;
	if (chroma > 0) {
		if (max === r) hue = (((g - b) / (max - min)) * 60) % 360;
		else if (max === g) hue = (((b - r) / (max - min)) * 60 + 120) % 360;
		else hue = (((r - g) / (max - min)) * 60 + 240) % 360;
	}

	if (hue < 0) hue += 360;

	return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(0)})`;
}

// Base16 to semantic color mapping
function generateCSSScheme(themeName, base16Colors) {
	const [
		base00,
		base01,
		base02,
		base03,
		base04,
		base05,
		base06,
		base07,
		base08,
		base09,
		base0A,
		base0B,
		base0C,
		base0D,
		base0E,
		base0F,
	] = base16Colors;

	return `/* ========================================
   COLOR SCHEME: ${themeName.toUpperCase()}
   ========================================
   Generated from Base16 theme
   To change color schemes:
   1. Replace this section with another scheme
   2. Keep the same CSS variable names
   3. Run \`pnpm build\` to apply changes
   ======================================== */

:root {
	--radius: 0.625rem;

	/* ${themeName} Base16 Palette */
	--base00: ${hexToOklch(base00)};  /* ${base00} - background */
	--base01: ${hexToOklch(base01)};  /* ${base01} - lighter background */
	--base02: ${hexToOklch(base02)};  /* ${base02} - selection background */
	--base03: ${hexToOklch(base03)};  /* ${base03} - comments */
	--base04: ${hexToOklch(base04)};  /* ${base04} - dark foreground */
	--base05: ${hexToOklch(base05)};  /* ${base05} - foreground */
	--base06: ${hexToOklch(base06)};  /* ${base06} - light foreground */
	--base07: ${hexToOklch(base07)};  /* ${base07} - light background */
	--base08: ${hexToOklch(base08)};  /* ${base08} - red */
	--base09: ${hexToOklch(base09)};  /* ${base09} - orange */
	--base0A: ${hexToOklch(base0A)};  /* ${base0A} - yellow */
	--base0B: ${hexToOklch(base0B)};  /* ${base0B} - green */
	--base0C: ${hexToOklch(base0C)};  /* ${base0C} - cyan */
	--base0D: ${hexToOklch(base0D)};  /* ${base0D} - blue */
	--base0E: ${hexToOklch(base0E)};  /* ${base0E} - purple */
	--base0F: ${hexToOklch(base0F)};  /* ${base0F} - brown */

	/* Semantic UI Mapping using Base16 colors */
	--background: var(--base00);
	--foreground: var(--base05);
	--card: var(--base01);
	--card-foreground: var(--base05);
	--popover: var(--base01);
	--popover-foreground: var(--base05);
	--primary: var(--base0D);
	--primary-foreground: var(--base00);
	--secondary: var(--base02);
	--secondary-foreground: var(--base05);
	--muted: var(--base02);
	--muted-foreground: var(--base03);
	--accent: var(--base0C);
	--accent-foreground: var(--base00);
	--destructive: var(--base08);
	--destructive-foreground: var(--base07);
	--border: var(--base03);
	--input: var(--base02);
	--ring: var(--base0D);

	/* Chart colors using Base16 palette */
	--chart-1: var(--base08); /* red */
	--chart-2: var(--base09); /* orange */
	--chart-3: var(--base0A); /* yellow */
	--chart-4: var(--base0B); /* green */
	--chart-5: var(--base0E); /* purple */

	/* Semantic accents using Base16 colors */
	--success: var(--base0B);
	--success-foreground: var(--base00);
	--warning: var(--base0A);
	--warning-foreground: var(--base00);
	--info: var(--base0C);
	--info-foreground: var(--base00);
	--purple: var(--base0E);
	--purple-foreground: var(--base07);
	--teal: var(--base0C);
	--teal-foreground: var(--base00);
	--pink: var(--base08);
	--pink-foreground: var(--base07);

	/* Sidebar using Base16 tones */
	--sidebar: var(--base01);
	--sidebar-foreground: var(--base05);
	--sidebar-primary: var(--base0D);
	--sidebar-primary-foreground: var(--base07);
	--sidebar-accent: var(--base02);
	--sidebar-accent-foreground: var(--base05);
	--sidebar-border: var(--base03);
	--sidebar-ring: var(--base0C);
}`;
}

// Predefined Base16 themes
const base16Themes = {
	"tomorrow-night": {
		name: "Tomorrow Night",
		colors: [
			"1d1f21",
			"282a2e",
			"373b41",
			"969896",
			"b4b7b4",
			"c5c8c6",
			"e0e0e0",
			"ffffff",
			"cc6666",
			"de935f",
			"f0c674",
			"b5bd68",
			"8abeb7",
			"81a2be",
			"b294bb",
			"a3685a",
		],
	},
	monokai: {
		name: "Monokai",
		colors: [
			"272822",
			"383830",
			"49483e",
			"75715e",
			"a59f85",
			"f8f8f2",
			"f5f4f1",
			"f9f8f5",
			"f92672",
			"fd971f",
			"f4bf75",
			"a6e22e",
			"a1efe4",
			"66d9ef",
			"ae81ff",
			"cc6633",
		],
	},
	github: {
		name: "GitHub",
		colors: [
			"ffffff",
			"f5f5f5",
			"c8c8fa",
			"969896",
			"e8e8e8",
			"333333",
			"ffffff",
			"ffffff",
			"ed6a43",
			"0086b3",
			"795da3",
			"183691",
			"183691",
			"795da3",
			"a71d5d",
			"333333",
		],
	},
	"solarized-dark": {
		name: "Solarized Dark",
		colors: [
			"002b36",
			"073642",
			"586e75",
			"657b83",
			"839496",
			"93a1a1",
			"eee8d5",
			"fdf6e3",
			"dc322f",
			"cb4b16",
			"b58900",
			"859900",
			"2aa198",
			"268bd2",
			"6c71c4",
			"d33682",
		],
	},
	"solarized-light": {
		name: "Solarized Light",
		colors: [
			"fdf6e3",
			"eee8d5",
			"93a1a1",
			"839496",
			"657b83",
			"586e75",
			"073642",
			"002b36",
			"dc322f",
			"cb4b16",
			"b58900",
			"859900",
			"2aa198",
			"268bd2",
			"6c71c4",
			"d33682",
		],
	},
	"gruvbox-dark": {
		name: "Gruvbox Dark",
		colors: [
			"282828",
			"3c3836",
			"504945",
			"665c54",
			"bdae93",
			"d5c4a1",
			"ebdbb2",
			"fbf1c7",
			"fb4934",
			"fe8019",
			"fabd2f",
			"b8bb26",
			"8ec07c",
			"83a598",
			"d3869b",
			"d65d0e",
		],
	},
	"gruvbox-light": {
		name: "Gruvbox Light",
		colors: [
			"fbf1c7",
			"ebdbb2",
			"d5c4a1",
			"bdae93",
			"665c54",
			"504945",
			"3c3836",
			"282828",
			"cc241d",
			"d65d0e",
			"d79921",
			"98971a",
			"689d6a",
			"458588",
			"b16286",
			"d65d0e",
		],
	},
	"one-dark": {
		name: "One Dark",
		colors: [
			"282c34",
			"353b45",
			"3e4451",
			"545862",
			"565c64",
			"abb2bf",
			"b6bdca",
			"c8ccd4",
			"e06c75",
			"d19a66",
			"e5c07b",
			"98c379",
			"56b6c2",
			"61afef",
			"c678dd",
			"be5046",
		],
	},
	nord: {
		name: "Nord",
		colors: [
			"2e3440",
			"3b4252",
			"434c5e",
			"4c566a",
			"d8dee9",
			"e5e9f0",
			"eceff4",
			"8fbcbb",
			"bf616a",
			"d08770",
			"ebcb8b",
			"a3be8c",
			"88c0d0",
			"81a1c1",
			"b48ead",
			"5e81ac",
		],
	},
	dracula: {
		name: "Dracula",
		colors: [
			"282a36",
			"44475a",
			"6272a4",
			"6272a4",
			"f8f8f2",
			"f8f8f2",
			"f8f8f2",
			"ffffff",
			"ff5555",
			"ffb86c",
			"f1fa8c",
			"50fa7b",
			"8be9fd",
			"bd93f9",
			"ff79c6",
			"6272a4",
		],
	},
	"catppuccin-mocha": {
		name: "Catppuccin Mocha",
		colors: [
			"1e1e2e",
			"181825",
			"313244",
			"45475a",
			"585b70",
			"cdd6f4",
			"f5e0dc",
			"b4befe",
			"f38ba8",
			"fab387",
			"f9e2af",
			"a6e3a1",
			"94e2d5",
			"89b4fa",
			"cba6f7",
			"f2cdcd",
		],
	},
	"catppuccin-latte": {
		name: "Catppuccin Latte",
		colors: [
			"eff1f5",
			"e6e9ef",
			"ccd0da",
			"bcc0cc",
			"acb0be",
			"4c4f69",
			"dc8a78",
			"7287fd",
			"d20f39",
			"fe640b",
			"df8e1d",
			"40a02b",
			"179299",
			"1e66f5",
			"8839ef",
			"dd7878",
		],
	},
	"tokyo-night": {
		name: "Tokyo Night",
		colors: [
			"1a1b26",
			"16161e",
			"2f3549",
			"444b6a",
			"787c99",
			"a9b1d6",
			"cbccd1",
			"d5d6db",
			"f7768e",
			"ff9e64",
			"e0af68",
			"9ece6a",
			"73daca",
			"7aa2f7",
			"bb9af7",
			"c0caf5",
		],
	},
	"ayu-dark": {
		name: "Ayu Dark",
		colors: [
			"0f1419",
			"131721",
			"272d38",
			"3e4b59",
			"bfbdb6",
			"e6e1cf",
			"e6e1cf",
			"f3f4f5",
			"f07178",
			"ff8f40",
			"ffb454",
			"b8cc52",
			"95e6cb",
			"59c2ff",
			"d2a6ff",
			"e6b450",
		],
	},
	"ayu-light": {
		name: "Ayu Light",
		colors: [
			"fafafa",
			"f8f9fa",
			"f0f0f0",
			"abb0b6",
			"5c6773",
			"5c6773",
			"242936",
			"1a1aa6",
			"f51818",
			"ff6a00",
			"f2ae49",
			"86b300",
			"4cbf99",
			"36a3d9",
			"a37acc",
			"ed9366",
		],
	},
	"material-darker": {
		name: "Material Darker",
		colors: [
			"212121",
			"303030",
			"353535",
			"4a4a4a",
			"b2ccd6",
			"eeffff",
			"eeffff",
			"ffffff",
			"f07178",
			"f78c6c",
			"ffcb6b",
			"c3e88d",
			"89ddff",
			"82aaff",
			"c792ea",
			"ff5370",
		],
	},
	"material-palenight": {
		name: "Material Palenight",
		colors: [
			"292d3e",
			"444267",
			"32374d",
			"676e95",
			"8796b0",
			"a6accd",
			"959dcb",
			"ffffff",
			"f07178",
			"f78c6c",
			"ffcb6b",
			"c3e88d",
			"89ddff",
			"82aaff",
			"c792ea",
			"ff5370",
		],
	},
	"horizon-dark": {
		name: "Horizon Dark",
		colors: [
			"1c1e26",
			"232530",
			"2e303e",
			"6c6f93",
			"9da0a2",
			"cbced0",
			"dcdfe4",
			"e3e6ee",
			"e95678",
			"fab795",
			"fac29a",
			"29d398",
			"59e1e3",
			"26bbd9",
			"ee64ac",
			"f09383",
		],
	},
	"oceanic-next": {
		name: "Oceanic Next",
		colors: [
			"1b2b34",
			"343d46",
			"4f5b66",
			"65737e",
			"a7adba",
			"c0c5ce",
			"cdd3de",
			"d8dee9",
			"ec5f67",
			"f99157",
			"fac863",
			"99c794",
			"5fb3b3",
			"6699cc",
			"c594c5",
			"ab7967",
		],
	},
	railscasts: {
		name: "Railscasts",
		colors: [
			"2b2b2b",
			"272935",
			"3a4055",
			"5a647e",
			"d4cfc8",
			"e6e1dc",
			"f4f1ed",
			"f9f7f3",
			"da4939",
			"cc7833",
			"ffc66d",
			"a5c261",
			"519f50",
			"6d9cbe",
			"b6b3eb",
			"bc9458",
		],
	},
	"papercolor-light": {
		name: "PaperColor Light",
		colors: [
			"eeeeee",
			"af0000",
			"008700",
			"5f8700",
			"0087af",
			"878787",
			"005f87",
			"444444",
			"bcbcbc",
			"d70000",
			"d70087",
			"8700af",
			"d75f00",
			"d75f00",
			"005faf",
			"005f87",
		],
	},
	"papercolor-dark": {
		name: "PaperColor Dark",
		colors: [
			"1c1c1c",
			"af005f",
			"5faf00",
			"d7af5f",
			"5fafd7",
			"808080",
			"d7875f",
			"d0d0d0",
			"585858",
			"5faf5f",
			"afd700",
			"af87d7",
			"ffaf00",
			"ff5faf",
			"00afaf",
			"5f8787",
		],
	},
	spacemacs: {
		name: "Spacemacs",
		colors: [
			"1f2022",
			"282828",
			"444155",
			"585858",
			"b8b8b8",
			"a3a3a3",
			"e8e8e8",
			"f8f8f8",
			"f2241f",
			"ffa500",
			"b1951d",
			"67b11d",
			"2d9574",
			"4f97d7",
			"a31db1",
			"b03060",
		],
	},
	"ir-black": {
		name: "IR Black",
		colors: [
			"000000",
			"242422",
			"484844",
			"6c6c66",
			"918f88",
			"b5b3aa",
			"d9d7cc",
			"fdfbee",
			"ff6c60",
			"e9c062",
			"ffffb6",
			"a8ff60",
			"c6c5fe",
			"96cbfe",
			"ff73fd",
			"b18a3d",
		],
	},
	tender: {
		name: "Tender",
		colors: [
			"282828",
			"383838",
			"484848",
			"4c4c4c",
			"b8b8b8",
			"eeeeee",
			"e4e4e4",
			"feffff",
			"f43753",
			"c9d05c",
			"ffc24b",
			"b3deef",
			"d3b987",
			"73cef4",
			"c9d05c",
			"a16946",
		],
	},
};

// CLI interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log("Base16 to CCL Test Viewer Converter\n");
		console.log("Usage:");
		console.log("  node base16-converter.js <theme-name>");
		console.log(
			"  node base16-converter.js <theme-name> <base00> <base01> ... <base0F>\n",
		);
		console.log("Available predefined themes:");
		Object.keys(base16Themes).forEach((key) => {
			console.log(`  ${key} - ${base16Themes[key].name}`);
		});
		console.log("\nExample:");
		console.log("  node base16-converter.js tomorrow-night");
		console.log('  node base16-converter.js "Custom Theme" 1d1f21 282a2e ...');
		process.exit(0);
	}

	const themeName = args[0];

	if (args.length === 1 && base16Themes[themeName]) {
		// Use predefined theme
		const theme = base16Themes[themeName];
		const css = generateCSSScheme(theme.name, theme.colors);
		console.log(css);
	} else if (args.length === 17) {
		// Custom theme with 16 colors
		const colors = args.slice(1);
		const css = generateCSSScheme(themeName, colors);
		console.log(css);
	} else {
		console.error(
			"Error: Provide either a predefined theme name or theme name + 16 hex colors",
		);
		process.exit(1);
	}
}

export { generateCSSScheme, base16Themes, hexToOklch };
