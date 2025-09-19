<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Check } from "lucide-svelte";

	interface Props {
		class?: string;
		checked?: boolean;
		disabled?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	}

	let { class: className, checked = false, disabled = false, onCheckedChange, ...restProps }: Props = $props();

	function handleClick() {
		if (!disabled && onCheckedChange) {
			onCheckedChange(!checked);
		}
	}
</script>

<button
	type="button"
	role="checkbox"
	aria-checked={checked}
	{disabled}
	onclick={handleClick}
	class={cn(
		"peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
		checked && "bg-primary text-primary-foreground",
		className
	)}
	{...restProps}
>
	{#if checked}
		<Check class="h-3 w-3" />
	{/if}
</button>