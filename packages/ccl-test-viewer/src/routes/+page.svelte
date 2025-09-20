<script lang="ts">
import { goto } from "$app/navigation";
import StatsDashboard from "$lib/components/StatsDashboard.svelte";
import { Button } from "$lib/components/ui";
import { appState, initializeApp } from "$lib/stores.svelte.js";
import { HugeiconsIcon } from "@hugeicons/svelte";
import { ArrowRightIcon } from "@hugeicons/core-free-icons";
import { onMount } from "svelte";

// Local state
let loading = $state(true);

// Initialize data on mount
onMount(async () => {
	await initializeApp();
	loading = false;
});

// Navigation handlers
function viewAllTests() {
	goto("/browse");
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
	<div class="text-center">
		<h3>Stats loaded successfully!</h3>
		<p>Total Tests: {appState.testStats.totalTests}</p>
		<p>Total Assertions: {appState.testStats.totalAssertions}</p>

		<button onclick={viewAllTests} class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
			Explore All Tests
		</button>
	</div>
{:else}
	<div class="text-center text-muted-foreground">
		Failed to load test statistics
	</div>
{/if}
</div>