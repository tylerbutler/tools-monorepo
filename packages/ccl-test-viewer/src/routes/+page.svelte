<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui';
	import { ArrowRight } from 'lucide-svelte';
	import { appState, initializeApp } from '$lib/stores.js';
	import { goto } from '$app/navigation';
	import StatsDashboard from '$lib/components/StatsDashboard.svelte';

	// Local state
	let loading = $state(true);

	// Initialize data on mount
	onMount(async () => {
		await initializeApp();
		loading = false;
	});

	// Navigation handlers
	function viewAllTests() {
		goto('/browse');
	}
</script>

<svelte:head>
	<title>CCL Test Suite Viewer</title>
</svelte:head>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-3xl font-bold tracking-tight">CCL Test Suite Analytics</h2>
		<p class="text-muted-foreground mt-2">
			Comprehensive insights and statistics from the CCL test suite
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
		</div>
	{:else if appState.testStats}
		<StatsDashboard stats={appState.testStats} />

		<!-- Quick Action -->
		<div class="text-center">
			<Button size="lg" onclick={viewAllTests}>
				{#snippet children()}
					Explore All Tests
					<ArrowRight class="h-4 w-4 ml-2" />
				{/snippet}
			</Button>
		</div>
	{:else}
		<div class="text-center text-muted-foreground">
			Failed to load test statistics
		</div>
	{/if}
</div>