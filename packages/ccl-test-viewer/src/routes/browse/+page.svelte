<script lang="ts">
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import FilterSidebar from "$lib/components/FilterSidebar.svelte";
import TestCard from "$lib/components/TestCard.svelte";
import { Badge, Button } from "$lib/components/ui/index.js";
import { dataSourceManager } from "$lib/stores/dataSourceManager.svelte.js";
import { appState, initializeApp } from "$lib/stores.svelte.js";
import {
	CheckSquare,
	Database,
	Grid3x3,
	Layers,
	Menu,
	X,
} from "@lucide/svelte";

// Local state - initialize to false in case of SSR
let loading = $state(!browser); // Will be false on client, true on server
let error = $state<string | null>(null);
let initialized = $state(false); // Track if we've already initialized

// Use $effect for Svelte 5 runes compatibility - runs when browser is available
$effect(() => {
	if (!browser || initialized) {
		return;
	}

	initialized = true; // Set immediately to prevent re-runs
	loading = true;
	error = null;

	(async () => {
		try {
			// Initialize dataSourceManager without static data (upload-only mode)
			await dataSourceManager.initializeEmpty();

			// Sync dataSourceManager data with appState for filtering/display
			appState.updateData(
				dataSourceManager.categories,
				dataSourceManager.stats,
			);
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to initialize";
			loading = false;
			initialized = false; // Reset on error to allow retry
		}
	})();
});

// Navigation functions
function viewTest(test: any) {
	appState.selectTest(test);
	goto(`/test/${encodeURIComponent(test.name)}`);
}

function toggleViewMode() {
	appState.setViewMode(appState.viewMode === "grid" ? "list" : "grid");
}

// Data source integration - derived states
const sourceSummaries = $derived(dataSourceManager.sourceSummaries);
const mergedStats = $derived(dataSourceManager.mergedStats);
const hasMultipleSources = $derived(dataSourceManager.hasMultipleSources);
const hasUploadedSources = $derived(
	dataSourceManager.getSourcesByType("uploaded").length > 0,
);

// Derived states for the UI
const hasTests = $derived(appState.filteredTests.length > 0);
const showResults = $derived(
	!(loading || error) && (appState.testStats || dataSourceManager.isReady),
);
</script>

<svelte:head>
	<title>Browse Tests - CCL Test Suite Viewer</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		<span class="ml-4 text-muted-foreground">Loading test data...</span>
	</div>
{:else if error}
	<div class="flex flex-col items-center justify-center h-64 text-center">
		<h3 class="text-lg font-semibold mb-2 text-destructive">Failed to load test data</h3>
		<p class="text-muted-foreground mb-4 max-w-md">
			{error}
		</p>
		<Button onclick={() => location.reload()}>Refresh Page</Button>
	</div>
{:else if showResults}
	<div class="flex h-screen">
		<!-- Sidebar toggle for mobile -->
		<div class="lg:hidden fixed top-4 left-4 z-50">
			<Button
				variant="outline"
				size="sm"
				onclick={() => appState.toggleSidebar()}
				aria-label="Toggle filters"
			>
				{#if appState.sidebarOpen}
					<X size={16} />
				{:else}
					<Menu size={16} />
				{/if}
			</Button>
		</div>

		<!-- Filter Sidebar -->
		<div
			class={`${
				appState.sidebarOpen ? "translate-x-0" : "-translate-x-full"
			} fixed lg:relative lg:translate-x-0 z-40 transition-transform duration-300 ease-in-out`}
		>
			<FilterSidebar />
		</div>

		<!-- Overlay for mobile sidebar -->
		{#if appState.sidebarOpen}
			<button
				class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden border-0 p-0 cursor-default"
				onclick={() => appState.toggleSidebar()}
				aria-label="Close filters"
				type="button"
			></button>
		{/if}

		<!-- Main content area -->
		<div class="flex-1 overflow-hidden">
			<div class="h-full flex flex-col">
				<!-- Header -->
				<div class="border-b bg-background p-6">
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-3 mb-2">
								<h1 class="text-2xl font-bold">Browse Tests</h1>
								{#if hasMultipleSources}
									<Badge variant="outline" class="text-xs">
										<Layers size={12} class="mr-1" />
										{mergedStats.activeSources} source{mergedStats.activeSources !== 1 ? 's' : ''}
									</Badge>
								{/if}
								{#if hasUploadedSources}
									<Badge variant="secondary" class="text-xs">
										<Database size={12} class="mr-1" />
										Uploaded Data
									</Badge>
								{/if}
							</div>
							<p class="text-muted-foreground">
								{appState.totalFilteredTests} of {mergedStats.totalTests || appState.testStats?.totalTests || 0} tests
								{#if appState.hasActiveFilters}
									<Badge variant="secondary" class="ml-2">
										Filtered
									</Badge>
								{/if}
								{#if hasMultipleSources}
									<span class="ml-2 text-xs">
										• {mergedStats.totalCategories} categories • {mergedStats.totalAssertions} assertions
									</span>
								{/if}
							</p>
						</div>

						<!-- View mode toggle -->
						<div class="flex items-center space-x-2">
							<Button
								variant={appState.viewMode === "grid" ? "default" : "outline"}
								size="sm"
								onclick={() => appState.setViewMode("grid")}
								aria-label="Grid view"
							>
								<Grid3x3 size={16} />
							</Button>
							<Button
								variant={appState.viewMode === "list" ? "default" : "outline"}
								size="sm"
								onclick={() => appState.setViewMode("list")}
								aria-label="List view"
							>
								<CheckSquare size={16} />
							</Button>
						</div>
					</div>
				</div>

				<!-- Data Sources Quick Management (if multiple sources) -->
				{#if hasMultipleSources}
					<div class="border-b bg-muted/30 px-6 py-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Database size={14} />
								<span>Data Sources:</span>
								{#each sourceSummaries as source (source.id)}
									<Badge
										variant={source.active ? "default" : "outline"}
										class="text-xs cursor-pointer"
										onclick={() => dataSourceManager.toggleSource(source.id)}
									>
										{source.name} ({source.testCount})
									</Badge>
								{/each}
							</div>
							<Button variant="ghost" size="sm" onclick={() => goto('/upload')}>
								Manage Sources
							</Button>
						</div>
					</div>
				{/if}

				<!-- Test results -->
				<div class="flex-1 overflow-auto p-6">
					{#if hasTests}
						<div
							class={appState.viewMode === "grid"
								? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
								: "space-y-4"}
						>
							{#each appState.filteredTests as test}
								<TestCard {test} onView={viewTest} />
							{/each}
						</div>
					{:else}
						<!-- No results state -->
						<div class="flex flex-col items-center justify-center h-64 text-center">
							<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
								<CheckSquare size={24} class="text-muted-foreground" />
							</div>
							<h3 class="text-lg font-semibold mb-2">No tests found</h3>
							<p class="text-muted-foreground mb-4 max-w-md">
								{#if appState.hasActiveFilters}
									No tests match your current filters. Try clearing some filters or adjusting your search.
								{:else}
									No test data available. Please check the data loading process.
								{/if}
							</p>
							{#if appState.hasActiveFilters}
								<Button variant="outline" onclick={() => appState.clearAllFilters()}>
									Clear All Filters
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center h-64 text-center">
		<h3 class="text-lg font-semibold mb-2">No data available</h3>
		<p class="text-muted-foreground mb-4">
			The application is ready but no test data is available.
		</p>
		<Button onclick={() => location.reload()}>Refresh Page</Button>
	</div>
{/if}