<script lang="ts">
import { Moon, Sun } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button/index.js";
import { themeStore } from "$lib/stores.svelte.js";

// Props
interface Props {
	size?: "sm" | "default" | "lg";
	variant?: "default" | "outline" | "ghost";
}

let { size = "default", variant = "ghost" }: Props = $props();

// Reactive theme state using $effect for proper lifecycle management
let currentTheme = $state<"light" | "dark">("light");

// Update state when component mounts and when store changes
$effect(() => {
	currentTheme = themeStore.theme;
});

function toggleTheme() {
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