<script lang="ts">
	import { onMount } from 'svelte';
	import { appState, initializeApp } from '$lib/stores.js';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	import TestCard from '$lib/components/TestCard.svelte';
	import { Button, Badge } from '$lib/components/ui/index.js';
	import { Grid, List, Menu, X } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Local state
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Initialize data on mount
	onMount(async () => {
		try {
			const success = await initializeApp();
			if (!success) {
				error = 'Failed to load test data';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			loading = false;
		}
	});

	// Navigation handlers
	function handleTestClick(test: any) {
		appState.selectTest(test);
		goto(`/test/${encodeURIComponent(test.name)}`);
	}

	function toggleViewMode() {
		appState.setViewMode(appState.viewMode === 'grid' ? 'list' : 'grid');
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
								<X class="h-4 w-4" />
							{:else}
								<Menu class="h-4 w-4" />
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
								<X class="h-4 w-4 mr-2" />
								Hide Filters
							{:else}
								<Menu class="h-4 w-4 mr-2" />
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
								<List class="h-4 w-4 mr-2" />
								List View
							{:else}
								<Grid class="h-4 w-4 mr-2" />
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
						? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
						: 'space-y-4'
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