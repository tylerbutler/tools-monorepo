<script lang="ts">
	import '../app.css';
	import { Button } from '$lib/components/ui/index.js';
	import { Home, Search, FileText } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface Props {
		children: any;
	}

	let { children }: Props = $props();

	// Navigation state
	const currentPath = $derived($page.url.pathname);
	const isHomePage = $derived(currentPath === '/');
	const isBrowsePage = $derived(currentPath === '/browse');
</script>

<div class="min-h-screen bg-background font-sans antialiased">
	<header class="border-b">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div>
					<button onclick={() => goto('/')} class="hover:opacity-80 transition-opacity">
						<h1 class="text-2xl font-bold text-foreground">
							CCL Test Suite Viewer
						</h1>
						<p class="text-sm text-muted-foreground mt-1">
							Interactive test result visualization for CCL implementations
						</p>
					</button>
				</div>

				<!-- Navigation -->
				<nav class="flex items-center gap-2">
					<Button
						variant={isHomePage ? "default" : "outline"}
						size="sm"
						onclick={() => goto('/')}
					>
						{#snippet children()}
							<Home class="h-4 w-4 mr-2" />
							Home
						{/snippet}
					</Button>
					<Button
						variant={isBrowsePage ? "default" : "outline"}
						size="sm"
						onclick={() => goto('/browse')}
					>
						{#snippet children()}
							<Search class="h-4 w-4 mr-2" />
							Browse Tests
						{/snippet}
					</Button>
				</nav>
			</div>
		</div>
	</header>

	<main class={isBrowsePage ? '' : 'container mx-auto px-4 py-6'}>
		{@render children()}
	</main>

	<footer class="border-t mt-12">
		<div class="container mx-auto px-4 py-6">
			<p class="text-sm text-muted-foreground text-center">
				Built with SvelteKit • Part of the CCL tools ecosystem
			</p>
		</div>
	</footer>
</div>