// Pure Svelte 5 runes-based state management
import { browser } from "$app/environment";
import type {
	GeneratedTest,
	SearchIndex,
	TestCategory,
	TestStats,
} from "./data/types.js";

// Filter state interface
export interface FilterState {
	functions: Record<string, boolean>;
	features: Record<string, boolean>;
	behaviors: Record<string, boolean>;
	categories: Record<string, boolean>;
}

// Base16 theme definitions with popular themes
export const BASE16_THEMES = {
	// Light themes
	"base16-tomorrow": { name: "Tomorrow", variant: "light" },
	"base16-one-light": { name: "One Light", variant: "light" },
	"base16-github": { name: "GitHub", variant: "light" },
	"base16-solarized-light": { name: "Solarized Light", variant: "light" },

	// Dark themes
	"base16-tomorrow-night": { name: "Tomorrow Night", variant: "dark" },
	"base16-monokai": { name: "Monokai", variant: "dark" },
	"base16-dracula": { name: "Dracula", variant: "dark" },
	"base16-nord": { name: "Nord", variant: "dark" },
	"base16-gruvbox-dark-hard": { name: "Gruvbox Dark", variant: "dark" },
	"base16-oceanicnext": { name: "Oceanic Next", variant: "dark" },
} as const;

export type Base16Theme = keyof typeof BASE16_THEMES;

// Theme management with base16 support
class ThemeStore {
	// Current theme mode (light/dark)
	theme = $state<"light" | "dark">(this.getInitialTheme());

	// Current base16 theme
	base16Theme = $state<Base16Theme>(this.getInitialBase16Theme());

	private getInitialTheme(): "light" | "dark" {
		if (!browser) {
			return "light";
		}

		// Check localStorage first
		const stored = localStorage.getItem("theme");
		if (stored === "light" || stored === "dark") {
			// Immediately apply theme classes when theme is initialized
			setTimeout(() => this.applyTheme(), 0);
			return stored;
		}

		// Fall back to system preference
		if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
			setTimeout(() => this.applyTheme(), 0);
			return "dark";
		}

		setTimeout(() => this.applyTheme(), 0);
		return "light";
	}

	private getInitialBase16Theme(): Base16Theme {
		if (!browser) {
			return "base16-tomorrow";
		}

		// Check localStorage for base16 theme
		const stored = localStorage.getItem("base16Theme") as Base16Theme;
		if (stored && stored in BASE16_THEMES) {
			return stored;
		}

		// Default themes based on current theme mode
		return this.theme === "dark" ? "base16-tomorrow-night" : "base16-tomorrow";
	}

	toggle() {
		this.theme = this.theme === "light" ? "dark" : "light";
		// Switch to appropriate base16 theme for the new mode
		this.autoSelectBase16Theme();
		this.applyTheme();
	}

	setTheme(newTheme: "light" | "dark") {
		this.theme = newTheme;
		this.autoSelectBase16Theme();
		this.applyTheme();
	}

	setBase16Theme(newBase16Theme: Base16Theme) {
		this.base16Theme = newBase16Theme;
		// Update theme mode to match the base16 theme variant
		const themeVariant = BASE16_THEMES[newBase16Theme].variant;
		this.theme = themeVariant;
		this.applyTheme();
	}

	private autoSelectBase16Theme() {
		// If current base16 theme doesn't match the mode, switch to a default one
		if (BASE16_THEMES[this.base16Theme].variant !== this.theme) {
			this.base16Theme =
				this.theme === "dark" ? "base16-tomorrow-night" : "base16-tomorrow";
		}
	}

	private applyTheme() {
		if (!browser) {
			return;
		}

		const root = document.documentElement;

		// Remove all existing base16 and theme classes
		const existingClasses = Array.from(root.classList).filter(
			(cls) => cls.startsWith("base16-") || cls === "dark",
		);
		root.classList.remove(...existingClasses);
		root.classList.add(this.base16Theme);

		// Apply dark mode class if needed
		if (this.theme === "dark") {
			root.classList.add("dark");
		}

		// Save to localStorage
		localStorage.setItem("theme", this.theme);
		localStorage.setItem("base16Theme", this.base16Theme);
	}

	// Get available themes for current mode
	getAvailableThemes() {
		return Object.entries(BASE16_THEMES)
			.filter(([_, config]) => config.variant === this.theme)
			.map(([theme, config]) => ({
				id: theme as Base16Theme,
				name: config.name,
			}));
	}

	// Get all themes grouped by variant
	getAllThemes() {
		const light = Object.entries(BASE16_THEMES)
			.filter(([_, config]) => config.variant === "light")
			.map(([theme, config]) => ({
				id: theme as Base16Theme,
				name: config.name,
			}));

		const dark = Object.entries(BASE16_THEMES)
			.filter(([_, config]) => config.variant === "dark")
			.map(([theme, config]) => ({
				id: theme as Base16Theme,
				name: config.name,
			}));

		return { light, dark };
	}

	// Initialize theme on app load
	initialize() {
		if (browser) {
			this.applyTheme();
		} else {
		}
	}
}

// Global application state using Svelte 5 runes
class AppState {
	// Data state
	testCategories = $state<TestCategory[]>([]);
	testStats = $state<TestStats | null>(null);
	searchIndex = $state<SearchIndex | null>(null);

	// Filter state
	searchQuery = $state("");
	activeFilters = $state<FilterState>({
		functions: {},
		features: {},
		behaviors: {},
		categories: {},
	});

	// UI state
	selectedTest = $state<GeneratedTest | null>(null);
	viewMode = $state<"grid" | "list">("grid");
	sidebarOpen = $state(true);

	// Derived computed states
	filteredTests = $derived.by(() => {
		let allTests: GeneratedTest[] = [];

		// Collect all tests from categories
		for (const category of this.testCategories) {
			allTests.push(...category.tests);
		}

		// Apply category filters
		const categoryFilters = Object.entries(this.activeFilters.categories)
			.filter(([_, active]) => active)
			.map(([category, _]) => category);

		if (categoryFilters.length > 0) {
			allTests = allTests.filter((test) => {
				const testCategory = this.testCategories.find((cat) =>
					cat.tests.includes(test),
				)?.name;
				return testCategory && categoryFilters.includes(testCategory);
			});
		}

		// Apply function filters
		const functionFilters = Object.entries(this.activeFilters.functions)
			.filter(([_, active]) => active)
			.map(([func, _]) => func);

		if (functionFilters.length > 0) {
			allTests = allTests.filter((test) =>
				functionFilters.some((func) => test.functions.includes(func)),
			);
		}

		// Apply feature filters
		const featureFilters = Object.entries(this.activeFilters.features)
			.filter(([_, active]) => active)
			.map(([feature, _]) => feature);

		if (featureFilters.length > 0) {
			allTests = allTests.filter((test) =>
				featureFilters.some((feature) => test.features.includes(feature)),
			);
		}

		// Apply behavior filters
		const behaviorFilters = Object.entries(this.activeFilters.behaviors)
			.filter(([_, active]) => active)
			.map(([behavior, _]) => behavior);

		if (behaviorFilters.length > 0) {
			allTests = allTests.filter((test) =>
				behaviorFilters.some((behavior) => test.behaviors.includes(behavior)),
			);
		}

		// Apply search query
		if (this.searchQuery.trim()) {
			const query = this.searchQuery.toLowerCase();
			allTests = allTests.filter(
				(test) =>
					test.name.toLowerCase().includes(query) ||
					test.input.toLowerCase().includes(query) ||
					test.functions.some((func) => func.toLowerCase().includes(query)) ||
					test.features.some((feature) =>
						feature.toLowerCase().includes(query),
					),
			);
		}

		return allTests;
	});

	// Additional computed states
	totalFilteredTests = $derived(this.filteredTests.length);
	hasActiveFilters = $derived(
		this.searchQuery.trim() !== "" ||
			Object.values(this.activeFilters.functions).some(Boolean) ||
			Object.values(this.activeFilters.features).some(Boolean) ||
			Object.values(this.activeFilters.behaviors).some(Boolean) ||
			Object.values(this.activeFilters.categories).some(Boolean),
	);

	// Actions/methods
	toggleFilter(type: keyof FilterState, key: string) {
		this.activeFilters[type][key] = !this.activeFilters[type][key];
	}

	clearAllFilters() {
		this.activeFilters = {
			functions: {},
			features: {},
			behaviors: {},
			categories: {},
		};
		this.searchQuery = "";
	}

	clearFilterType(type: keyof FilterState) {
		this.activeFilters[type] = {};
	}

	setSearchQuery(query: string) {
		this.searchQuery = query;
	}

	selectTest(test: GeneratedTest | null) {
		this.selectedTest = test;
	}

	setViewMode(mode: "grid" | "list") {
		this.viewMode = mode;
	}

	toggleSidebar() {
		this.sidebarOpen = !this.sidebarOpen;
	}

	// Data loading methods
	async loadData() {
		try {
			// Load test categories
			const categoriesResponse = await fetch("/data/categories.json");
			const categoriesData = await categoriesResponse.json();
			this.testCategories = categoriesData;

			// Load test stats
			const statsResponse = await fetch("/data/stats.json");
			const statsData = await statsResponse.json();
			this.testStats = statsData;

			// Load search index
			const searchResponse = await fetch("/data/search-index.json");
			const searchData = await searchResponse.json();
			this.searchIndex = searchData;

			return true;
		} catch (_error) {
			return false;
		}
	}

	// Update data from external source (like dataSourceManager)
	updateData(categories: TestCategory[], stats: TestStats | null) {
		this.testCategories = categories;
		this.testStats = stats;
	}
}

// Global state instances
export const themeStore = new ThemeStore();
export const appState = new AppState();

// Helper function to initialize app state
export async function initializeApp() {
	const success = await appState.loadData();
	if (!success) {
	}
	return success;
}
