<script lang="ts">
import { Check, ChevronDown, Palette } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button/index.js";
import {
	BASE16_THEMES,
	type Base16Theme,
	themeStore,
} from "$lib/stores.svelte.js";

// Props
interface Props {
	size?: "sm" | "default" | "lg";
	variant?: "default" | "outline" | "ghost";
	showLabel?: boolean;
}

let {
	size = "default",
	variant = "ghost",
	showLabel = false,
}: Props = $props();

// Reactive theme state using $effect for proper lifecycle management
let currentTheme = $state<"light" | "dark">("light");
let currentBase16Theme = $state<Base16Theme>("base16-tomorrow");
let availableThemes = $state<{ id: Base16Theme; name: string }[]>([]);
let allThemes = $state<{
	light: { id: Base16Theme; name: string }[];
	dark: { id: Base16Theme; name: string }[];
}>({ light: [], dark: [] });

// Update state when component mounts and when store changes
$effect(() => {
	currentTheme = themeStore.theme;
	currentBase16Theme = themeStore.base16Theme;
	availableThemes = themeStore.getAvailableThemes();
	allThemes = themeStore.getAllThemes();
});

// Dropdown state
let isOpen = $state(false);

function toggleDropdown() {
	isOpen = !isOpen;
}

function selectTheme(theme: Base16Theme) {
	themeStore.setBase16Theme(theme);
	isOpen = false;
}

function toggleMode() {
	themeStore.toggle();
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
	const target = event.target as Element;
	if (!target.closest("[data-theme-selector]")) {
		isOpen = false;
	}
}

$effect(() => {
	if (isOpen) {
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}
});
</script>

<div class="relative" data-theme-selector>
	<Button
		{variant}
		{size}
		onclick={toggleDropdown}
		aria-label="Select Base16 theme"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
		class="gap-2 {showLabel ? 'min-w-32' : ''}"
	>
		<Palette class="h-4 w-4" />
		{#if showLabel}
			<span class="hidden sm:inline truncate">
				{BASE16_THEMES[currentBase16Theme].name}
			</span>
		{/if}
		<ChevronDown class="h-3 w-3 transition-transform {isOpen ? 'rotate-180' : ''}" />
	</Button>

	{#if isOpen}
		<div
			class="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-md shadow-lg z-50"
			role="listbox"
			aria-label="Base16 theme selection"
		>
			<!-- Mode Toggle Section -->
			<div class="p-3 border-b border-border">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-foreground">Theme Mode</span>
					<Button
						variant="outline"
						size="sm"
						onclick={toggleMode}
						class="h-7 px-2 text-xs"
					>
						{currentTheme === "light" ? "Switch to Dark" : "Switch to Light"}
					</Button>
				</div>
			</div>

			<!-- Current Mode Themes -->
			<div class="p-2">
				<div class="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
					{currentTheme === "light" ? "Light Themes" : "Dark Themes"}
				</div>
				{#each availableThemes as theme (theme.id)}
					<button
						class="w-full flex items-center justify-between px-2 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
						onclick={() => selectTheme(theme.id)}
						role="option"
						aria-selected={currentBase16Theme === theme.id}
					>
						<span>{theme.name}</span>
						{#if currentBase16Theme === theme.id}
							<Check class="h-4 w-4 text-primary" />
						{/if}
					</button>
				{/each}
			</div>

			<!-- Other Mode Preview -->
			<div class="border-t border-border p-2">
				<div class="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
					{currentTheme === "light" ? "Dark Themes" : "Light Themes"} (Preview)
				</div>
				{#each currentTheme === "light" ? allThemes.dark : allThemes.light as theme (theme.id)}
					<button
						class="w-full flex items-center justify-between px-2 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none opacity-60"
						onclick={() => selectTheme(theme.id)}
						role="option"
						aria-selected={false}
					>
						<span>{theme.name}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>