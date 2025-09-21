<script lang="ts">
import "../app.css";
import { goto } from "$app/navigation";
import { Home, Search, Upload } from "lucide-svelte";
import type { Snippet } from "svelte";
import type { LayoutData } from "./$types";

interface Props {
	children?: Snippet;
	data: LayoutData;
}

let { children, data }: Props = $props();

// Navigation state - using runes with data from load function
const currentPath = $derived(data.currentPath);
const isHomePage = $derived(currentPath === "/");
const isBrowsePage = $derived(currentPath === "/browse");
const isDataPage = $derived(currentPath === "/data");

// Skip link functionality
function skipToMain() {
	const mainElement = document.getElementById("main-content");
	if (mainElement) {
		mainElement.focus();
		mainElement.scrollIntoView();
	}
}

// Focus management for route changes - using $effect for side effects in runes mode
$effect(() => {
	// Announce route changes to screen readers
	const routeName = isHomePage
		? "Dashboard"
		: isBrowsePage
			? "Browse Tests"
			: isDataPage
				? "Data Management"
				: "Test Detail";
	// Update document title for accessibility
	document.title = `${routeName} - CCL Test Suite Viewer`;
});
</script>

<div class="min-h-screen bg-background font-sans antialiased">
	<!-- Skip to main content link for keyboard users -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
		onclick={skipToMain}
	>
		Skip to main content
	</a>

	<!-- ARIA live region for route announcements -->
	<div aria-live="polite" aria-atomic="true" class="sr-only" id="route-announcements"></div>

	<header class="border-b">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div>
					<button
						onclick={() => goto('/')}
						class="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
						aria-label="Go to homepage"
					>
						<h1 class="text-2xl font-bold text-foreground">
							CCL Test Suite Viewer
						</h1>
						<p class="text-sm text-muted-foreground mt-1">
							Interactive test result visualization for CCL implementations
						</p>
					</button>
				</div>

				<!-- Primary Navigation -->
				<nav class="flex items-center gap-2" aria-label="Main navigation">
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isHomePage ? "bg-primary text-primary-foreground" : "border border-border"}`}
						onclick={() => goto('/')}
						aria-current={isHomePage ? "page" : undefined}
						aria-label="Go to dashboard homepage"
					>
						<Home size={16} class="mr-2 inline" />
						Home
					</button>
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isBrowsePage ? "bg-primary text-primary-foreground" : "border border-border"}`}
						onclick={() => goto('/browse')}
						aria-current={isBrowsePage ? "page" : undefined}
						aria-label="Browse and filter test cases"
					>
						<Search size={16} class="mr-2 inline" />
						Browse Tests
					</button>
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isDataPage ? "bg-primary text-primary-foreground" : "border border-border"}`}
						onclick={() => goto('/data')}
						aria-current={isDataPage ? "page" : undefined}
						aria-label="Manage test data from multiple sources"
					>
						<Upload size={16} class="mr-2 inline" />
						Data
					</button>
				</nav>
			</div>
		</div>
	</header>

	<main
		class={isBrowsePage ? '' : 'container mx-auto px-4 py-6'}
		id="main-content"
		tabindex="-1"
		aria-label="Main content"
	>
		{#if children}
			{@render children()}
		{:else}
			<!-- No page content available -->
		{/if}
	</main>

	<footer class="border-t mt-12">
		<div class="container mx-auto px-4 py-6">
			<p class="text-sm text-muted-foreground text-center">
				Built with SvelteKit • Part of the CCL tools ecosystem
			</p>
		</div>
	</footer>
</div>