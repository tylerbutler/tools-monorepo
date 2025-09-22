<script lang="ts">
import { goto } from "$app/navigation";

// Navigation handlers
function viewAllTests() {
	goto("/browse");
}

function viewStyleTests() {
	goto("/styles");
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

	<div class="text-center space-y-6">
		<div>
			<h3 class="text-xl font-semibold">Welcome to CCL Test Suite Viewer</h3>
			<p class="text-muted-foreground mt-2">Interactive test result visualization</p>
		</div>

		<div class="flex flex-wrap justify-center gap-4">
			<button onclick={viewAllTests} class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all">
				Browse All Tests
			</button>
			<button onclick={viewStyleTests} class="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-all">
				Style Testing
			</button>
		</div>
	</div>
</div>