<script lang="ts">
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import FilterSidebar from "$lib/components/FilterSidebar.svelte";
import Icon from "$lib/components/Icon.svelte";
import TestCard from "$lib/components/TestCard.svelte";
import { Badge, Button } from "$lib/components/ui/index.js";
import { appState, initializeApp } from "$lib/stores.svelte.js";
import { CheckSquare, Grid3x3, Menu, X } from "lucide-svelte";

// Debug: Check if script is executing at all
console.log("🟦 Browse page script executed at module level");

// Local state
let loading = $state(true);
let initialized = $state(false);

// Initialize data on component mount (Svelte 5 approach)
$effect(() => {
	if (!initialized && browser) {
		console.log("🟦 Starting browse page initialization");
		initialized = true;
		initializeApp()
			.then(() => {
				console.log("🟦 Browse page data loaded successfully");
				loading = false;
			})
			.catch((error) => {
				console.error("🟦 Browse page initialization error:", error);
				loading = false;
			});
	}
});

// Navigation functions
function viewTest(test: any) {
	appState.selectTest(test);
	goto(`/test/${encodeURIComponent(test.name)}`);
}

function toggleViewMode() {
	appState.setViewMode(appState.viewMode === "grid" ? "list" : "grid");
}

// Derived states for the UI
const hasTests = $derived(appState.filteredTests.length > 0);
const showResults = $derived(!loading && appState.testStats);
</script>

<svelte:head>
	<title>Browse Tests - CCL Test Suite Viewer</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
		<span class="ml-4 text-muted-foreground">Loading test data...</span>
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
				<Icon icon={appState.sidebarOpen ? X : Menu} size={16} />
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
							<h1 class="text-2xl font-bold">Browse Tests</h1>
							<p class="text-muted-foreground">
								{appState.totalFilteredTests} of {appState.testStats?.totalTests || 0} tests
								{#if appState.hasActiveFilters}
									<Badge variant="secondary" class="ml-2">
										Filtered
									</Badge>
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
								<Icon icon={Grid3x3} size={16} />
							</Button>
							<Button
								variant={appState.viewMode === "list" ? "default" : "outline"}
								size="sm"
								onclick={() => appState.setViewMode("list")}
								aria-label="List view"
							>
								<Icon icon={CheckSquare} size={16} />
							</Button>
						</div>
					</div>
				</div>

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
								<Icon icon={CheckSquare} size={24} class="text-muted-foreground" />
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
		<h3 class="text-lg font-semibold mb-2">Failed to load test data</h3>
		<p class="text-muted-foreground mb-4">
			There was an error loading the test suite data. Please refresh the page to try again.
		</p>
		<Button onclick={() => location.reload()}>Refresh Page</Button>
	</div>
{/if}