<script lang="ts">
import { goto } from "$app/navigation";
import TestDetail from "$lib/components/TestDetail.svelte";
import { Button } from "$lib/components/ui/index.js";
import type { PageData } from "./$types";

interface Props {
	data: PageData;
}

let { data }: Props = $props();

// Extract data directly from load function - no lifecycle issues
const testName = $derived(data.testName);
const test = $derived(data.test);
const error = $derived(data.error);

function goBack() {
	goto("/browse");
}
</script>

<svelte:head>
	<title>{testName} - CCL Test Suite Viewer</title>
</svelte:head>

{#if error}
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