<script lang="ts">
import { goto } from "$app/navigation";
import { browser } from "$app/environment";
import FilterSidebar from "$lib/components/FilterSidebar.svelte";
import TestCard from "$lib/components/TestCard.svelte";
import { Badge, Button } from "$lib/components/ui/index.js";
import { appState, initializeApp } from "$lib/stores.svelte.ts";
import { HugeiconsIcon } from "@hugeicons/svelte";
import { GridIcon, ListViewIcon, Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

// Debug: Check if script is executing at all
console.log("🟦 Browse page script executed at module level");

// Local state
let loading = $state(true);
let error = $state<string | null>(null);

// Auto-initialize immediately if in browser, bypassing onMount issue
if (typeof window !== 'undefined') {
	console.log("🟦 Window detected, auto-initializing...");
	initializeApp().then(success => {
		console.log("🟦 Auto-init result:", success);
		if (!success) {
			error = "Failed to load test data";
		}
		loading = false;
	}).catch(err => {
		console.error("🟦 Auto-init error:", err);
		error = err instanceof Error ? err.message : "Unknown error occurred";
		loading = false;
	});
} else {
	// For SSR, just set loading false to prevent infinite loading
	console.log("🟦 SSR mode detected");
	setTimeout(() => {
		loading = false;
	}, 100);
}

// Navigation handlers
function handleTestClick(test: any) {
	appState.selectTest(test);
	goto(`/test/${encodeURIComponent(test.name)}`);
}

function toggleViewMode() {
	appState.setViewMode(appState.viewMode === "grid" ? "list" : "grid");
}
</script>

<svelte:head>
	<title>Browse Tests - CCL Test Viewer</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-screen">
		<div class="text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
			<p class="text-muted-foreground">Loading test data...</p>
			<p class="text-xs text-gray-500 mt-2">Debug: browser={browser}, window={typeof window !== 'undefined'}</p>
		</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center h-screen">
		<div class="text-center">
			<p class="text-red-600 mb-4">Error: {error}</p>
			<Button onclick={() => window.location.reload()}>Retry</Button>
		</div>
	</div>
{:else}
	<div class="flex h-screen">
		<!-- Sidebar -->
		{#if appState.sidebarOpen}
			<FilterSidebar />
		{/if}

		<!-- Main Content -->
		<div class="flex-1 flex flex-col overflow-hidden">
			<!-- Header -->
			<header class="border-b bg-background p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<!-- Mobile menu toggle -->
						<Button
							variant="outline"
							size="sm"
							onclick={() => appState.toggleSidebar()}
							class="lg:hidden"
						>
							{#if appState.sidebarOpen}
								<HugeiconsIcon icon={Cancel01Icon} size={16} />
							{:else}
								<HugeiconsIcon icon={Menu01Icon} size={16} />
							{/if}
						</Button>

						<div>
							<h1 class="text-xl font-semibold">Browse Tests</h1>
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<span>
									{appState.totalFilteredTests} of {appState.testCategories.reduce((acc, cat) => acc + cat.tests.length, 0)} tests
								</span>
								{#if appState.hasActiveFilters}
									<Badge variant="secondary">Filtered</Badge>
								{/if}
							</div>
						</div>
					</div>

					<!-- View Controls -->
					<div class="flex items-center gap-2">
						<!-- Desktop sidebar toggle -->
						<Button
							variant="outline"
							size="sm"
							onclick={() => appState.toggleSidebar()}
							class="hidden lg:inline-flex"
						>
							{#if appState.sidebarOpen}
								<HugeiconsIcon icon={Cancel01Icon} size={16} class="mr-2" />
								Hide Filters
							{:else}
								<HugeiconsIcon icon={Menu01Icon} size={16} class="mr-2" />
								Show Filters
							{/if}
						</Button>

						<!-- View mode toggle -->
						<Button
							variant="outline"
							size="sm"
							onclick={toggleViewMode}
						>
							{#if appState.viewMode === 'grid'}
								<HugeiconsIcon icon={ListViewIcon} size={16} class="mr-2" />
								List View
							{:else}
								<HugeiconsIcon icon={GridIcon} size={16} class="mr-2" />
								Grid View
							{/if}
						</Button>
					</div>
				</div>
			</header>

			<!-- Content -->
			<main class="flex-1 overflow-y-auto p-4">
				{#if appState.filteredTests.length === 0}
					<div class="text-center py-12">
						<p class="text-muted-foreground mb-4">
							{#if appState.hasActiveFilters}
								No tests match your current filters.
							{:else}
								No tests found.
							{/if}
						</p>
						{#if appState.hasActiveFilters}
							<Button variant="outline" onclick={() => appState.clearAllFilters()}>
								Clear All Filters
							</Button>
						{/if}
					</div>
				{:else}
					<!-- Test Grid/List -->
					<div class={appState.viewMode === 'grid'
						? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4'
						: 'space-y-3 sm:space-y-4'
					}>
						{#each appState.filteredTests as test (test.name)}
							<TestCard
								{test}
								onClick={() => handleTestClick(test)}
							/>
						{/each}
					</div>
				{/if}
			</main>
		</div>
	</div>
{/if}