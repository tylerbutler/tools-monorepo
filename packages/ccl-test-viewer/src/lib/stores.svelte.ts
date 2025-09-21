// Pure Svelte 5 runes-based state management
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
		} catch (error) {
			console.error("Failed to load test data:", error);
			return false;
		}
	}

	// Update data from external source (like dataSourceManager)
	updateData(categories: TestCategory[], stats: TestStats | null) {
		this.testCategories = categories;
		this.testStats = stats;
		// Note: searchIndex is not updated as it's not critical for basic functionality
		console.log(
			"AppState updated with",
			categories.length,
			"categories and",
			stats?.totalTests || 0,
			"tests",
		);
	}
}

// Global state instance
export const appState = new AppState();

// Helper function to initialize app state
export async function initializeApp() {
	const success = await appState.loadData();
	if (!success) {
		console.error("Failed to initialize application data");
	}
	return success;
}
