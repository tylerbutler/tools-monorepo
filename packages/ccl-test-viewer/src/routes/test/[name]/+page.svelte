<script lang="ts">
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import TestDetail from "$lib/components/TestDetail.svelte";
import { Button } from "$lib/components/ui/index.js";
import type { GeneratedTest } from "$lib/data/types.js";
import { appState, initializeApp } from "$lib/stores.svelte.js";

// Local state
let loading = $state(true);
let test = $state<GeneratedTest | null>(null);
let error = $state<string | null>(null);
let initialized = $state(false);

// Get test name from URL
const testName = $derived(decodeURIComponent($page.params.name || ""));

// Initialize and find the test
$effect(() => {
	if (!initialized && browser && testName) {
		initialized = true;
		initializeApp()
			.then(() => {
				// Find the test by name
				const foundTest = appState.testCategories
					.flatMap((cat) => cat.tests)
					.find((t) => t.name === testName);

				if (foundTest) {
					test = foundTest;
					appState.selectTest(foundTest);
				} else {
					error = `Test "${testName}" not found`;
				}
				loading = false;
			})
			.catch((err) => {
				console.error("Failed to load test data:", err);
				error = "Failed to load test data";
				loading = false;
			});
	}
});

function goBack() {
	goto("/browse");
}
</script>

<svelte:head>
	<title>{testName} - CCL Test Suite Viewer</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
		<span class="ml-4 text-muted-foreground">Loading test data...</span>
	</div>
{:else if error}
	<div class="text-center py-12">
		<h1 class="text-2xl font-bold mb-4">Test Not Found</h1>
		<p class="text-muted-foreground mb-6">{error}</p>
		<Button onclick={goBack}>Back to Tests</Button>
	</div>
{:else if test}
	<TestDetail {test} onBack={goBack} />
{:else}
	<div class="text-center py-12">
		<h1 class="text-2xl font-bold mb-4">Test Not Found</h1>
		<p class="text-muted-foreground mb-6">The requested test could not be found.</p>
		<Button onclick={goBack}>Back to Tests</Button>
	</div>
{/if}