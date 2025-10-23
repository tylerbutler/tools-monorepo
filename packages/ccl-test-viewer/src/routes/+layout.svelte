<script lang="ts">
import "../app.css";
import { Home, Palette, Search, Upload } from "@lucide/svelte";
import type { Snippet } from "svelte";
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import Base16ThemeSelector from "$lib/components/Base16ThemeSelector.svelte";
import ThemeToggle from "$lib/components/ThemeToggle.svelte";
import { themeStore } from "$lib/stores.svelte.js";
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
const isStylesPage = $derived(currentPath === "/styles");

// Skip link functionality
function skipToMain() {
	const mainElement = document.getElementById("main-content");
	if (mainElement) {
		mainElement.focus();
		mainElement.scrollIntoView();
	}
}

// Initialize theme on mount - removed $effect DOM manipulation to fix lifecycle issues
onMount(() => {
	// Force theme application for static sites
	if (typeof window !== "undefined") {
		const root = document.documentElement;

		// Get theme values from localStorage or defaults
		const storedTheme = localStorage.getItem("theme") || "dark";
		const storedBase16 =
			localStorage.getItem("base16Theme") || "base16-tomorrow-night";

		// Remove any existing theme classes
		const existingClasses = Array.from(root.classList).filter(
			(cls) => cls.startsWith("base16-") || cls === "dark",
		);
		if (existingClasses.length > 0) {
			root.classList.remove(...existingClasses);
		}
		root.classList.add(storedBase16);
		if (storedTheme === "dark") {
			root.classList.add("dark");
		}

		// Also initialize the theme store
		themeStore.initialize();
	}
});
</script>

<div class="min-h-screen bg-background font-sans antialiased">
	<!-- Skip to main content link for keyboard users -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
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
						class="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
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

				<!-- Primary Navigation and Theme Controls -->
				<div class="flex items-center gap-4">
					<nav class="flex items-center gap-2" aria-label="Main navigation">
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isHomePage ? "bg-blue-600 text-white" : "border border-border"}`}
						onclick={() => goto('/')}
						aria-current={isHomePage ? "page" : undefined}
						aria-label="Go to dashboard homepage"
					>
						<Home size={16} class="mr-2 inline" />
						Home
					</button>
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isBrowsePage ? "bg-blue-600 text-white" : "border border-border"}`}
						onclick={() => goto('/browse')}
						aria-current={isBrowsePage ? "page" : undefined}
						aria-label="Browse and filter test cases"
					>
						<Search size={16} class="mr-2 inline" />
						Browse Tests
					</button>
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isDataPage ? "bg-blue-600 text-white" : "border border-border"}`}
						onclick={() => goto('/data')}
						aria-current={isDataPage ? "page" : undefined}
						aria-label="Manage test data from multiple sources"
					>
						<Upload size={16} class="mr-2 inline" />
						Data
					</button>
					<button
						class={`px-3 py-2 rounded text-sm font-medium ${isStylesPage ? "bg-blue-600 text-white" : "border border-border"}`}
						onclick={() => goto('/styles')}
						aria-current={isStylesPage ? "page" : undefined}
						aria-label="Test color themes and component styles"
					>
						<Palette size={16} class="mr-2 inline" />
						Styles
					</button>
					</nav>

					<!-- Theme Controls -->
					<div class="flex items-center gap-2">
						<!-- Base16 Theme Selector -->
						<Base16ThemeSelector showLabel={true} />

						<!-- Traditional Toggle for quick light/dark switching -->
						<ThemeToggle />
					</div>
				</div>
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