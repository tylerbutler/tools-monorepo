<script lang="ts">
import { goto } from "$app/navigation";
import ColorPalette from "$lib/components/ColorPalette.svelte";

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
			<button onclick={viewAllTests} class="px-6 py-3 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-all">
				Browse All Tests
			</button>
			<button onclick={viewStyleTests} class="px-6 py-3 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-all">
				Style Testing
			</button>
		</div>
	</div>

	<!-- Color Palette Demo -->
	<div class="mt-12">
		<ColorPalette />
	</div>
</div>