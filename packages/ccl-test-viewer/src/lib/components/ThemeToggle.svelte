<script lang="ts">
import { themeStore } from "$lib/stores.svelte.js";

// Props
interface Props {
	size?: "sm" | "default" | "lg";
	variant?: "default" | "outline" | "ghost";
}

const { size = "default", variant = "ghost" }: Props = $props();

// Reactive theme state using $effect for proper lifecycle management
let _currentTheme = $state<"light" | "dark">("light");

// Update state when component mounts and when store changes
$effect(() => {
	_currentTheme = themeStore.theme;
});

function _toggleTheme() {
	themeStore.toggle();
}
</script>

<Button
	{variant}
	{size}
	onclick={toggleTheme}
	aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} mode`}
	class="relative"
>
	{#if currentTheme === "light"}
		<Sun class="h-4 w-4" />
		<span class="sr-only">Switch to dark mode</span>
	{:else}
		<Moon class="h-4 w-4" />
		<span class="sr-only">Switch to light mode</span>
	{/if}
</Button>