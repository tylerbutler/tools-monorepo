<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import TestDetail from "$lib/components/TestDetail.svelte";
import { Button } from "$lib/components/ui/index.js";
import type { GeneratedTest } from "$lib/data/types.js";
import { appState, initializeApp } from "$lib/stores.js";
import { onMount } from "svelte";

// Local state
let loading = $state(true);
let error = $state<string | null>(null);
let currentTest = $state<GeneratedTest | null>(null);

// Get test name from URL params
const testName = $derived(decodeURIComponent($page.params.name ?? ""));

// Initialize and find the test
onMount(async () => {
	try {
		// Load data if not already loaded
		if (appState.testCategories.length === 0) {
			const success = await initializeApp();
			if (!success) {
				error = "Failed to load test data";
				return;
			}
		}

		// Find the test by name
		findTest();
	} catch (err) {
		error = err instanceof Error ? err.message : "Unknown error occurred";
	} finally {
		loading = false;
	}
});

function findTest() {
	// Search through all categories for the test
	for (const category of appState.testCategories) {
		const foundTest = category.tests.find((test) => test.name === testName);
		if (foundTest) {
			currentTest = foundTest;
			appState.selectTest(foundTest);
			return;
		}
	}

	// Test not found
	error = `Test "${testName}" not found`;
}

function handleBack() {
	goto("/browse");
}
</script>

<svelte:head>
	<title>{currentTest ? currentTest.name : 'Test Detail'} - CCL Test Viewer</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-screen">
		<div class="text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
			<p class="text-muted-foreground">Loading test details...</p>
		</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center h-screen">
		<div class="text-center">
			<p class="text-red-600 mb-4">Error: {error}</p>
			<div class="space-x-2">
				<Button onclick={handleBack} variant="outline">Back to Browse</Button>
				<Button onclick={() => window.location.reload()}>Retry</Button>
			</div>
		</div>
	</div>
{:else if currentTest}
	<TestDetail test={currentTest} onBack={handleBack} />
{:else}
	<div class="flex items-center justify-center h-screen">
		<div class="text-center">
			<p class="text-muted-foreground mb-4">Test not found</p>
			<Button onclick={handleBack}>Back to Browse</Button>
		</div>
	</div>
{/if}