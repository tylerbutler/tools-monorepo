<script lang="ts">
import { goto } from "$app/navigation";

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

	<div class="text-center">
		<h3>Welcome to CCL Test Suite Viewer</h3>
		<p>Interactive test result visualization</p>

		<button onclick={viewAllTests} class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
			Browse All Tests
		</button>
	</div>
</div>