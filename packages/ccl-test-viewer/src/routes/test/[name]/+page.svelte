<script lang="ts">
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import TestDetail from "$lib/components/TestDetail.svelte";
import { Button } from "$lib/components/ui/index.js";
import type { GeneratedTest } from "$lib/data/types.js";
import { dataSourceManager } from "$lib/stores/dataSourceManager.svelte.js";
import { appState } from "$lib/stores.svelte.js";
import type { PageData } from "./$types";

interface Props {
	data: PageData;
}

let { data }: Props = $props();

// Local state
let loading = $state(true);
let test = $state<GeneratedTest | null>(null);
let error = $state<string | null>(null);
let initialized = $state(false);

// Get test name from URL - using runes with data from load function
const testName = $derived(data.testName);

// Initialize and find the test
$effect(() => {
	if (!initialized && browser && testName) {
		initialized = true;
		dataSourceManager
			.initializeEmpty()
			.then(() => {
				// Find the test by name from available data sources
				const foundTest = dataSourceManager.categories
					.flatMap((cat) => cat.tests)
					.find((t) => t.name === testName);

				if (foundTest) {
					test = foundTest;
					appState.selectTest(foundTest);
				} else {
					// No test found - could be because no data is loaded
					if (dataSourceManager.categories.length === 0) {
						error = `No test data available. Please upload test data first.`;
					} else {
						error = `Test "${testName}" not found in the available data.`;
					}
				}
				loading = false;
			})
			.catch((err) => {
				console.error("Failed to initialize:", err);
				error = "Failed to initialize application";
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
		<div class="flex gap-4 justify-center">
			<Button onclick={goBack}>Back to Browse</Button>
			{#if error.includes("No test data available")}
				<Button variant="outline" onclick={() => goto("/upload")}>Upload Data</Button>
			{/if}
		</div>
	</div>
{:else if test}
	<TestDetail {test} onBack={goBack} />
{:else}
	<div class="text-center py-12">
		<h1 class="text-2xl font-bold mb-4">Test Not Found</h1>
		<p class="text-muted-foreground mb-6">The requested test could not be found. Try uploading test data first.</p>
		<div class="flex gap-4 justify-center">
			<Button onclick={goBack}>Back to Browse</Button>
			<Button variant="outline" onclick={() => goto("/upload")}>Upload Data</Button>
		</div>
	</div>
{/if}