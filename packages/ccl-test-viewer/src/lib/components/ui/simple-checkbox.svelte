<script lang="ts">
import CheckIcon from "@lucide/svelte/icons/check";
import { cn } from "$lib/utils.js";

interface Props {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	class?: string;
	id?: string;
	disabled?: boolean;
}

let {
	checked = $bindable(false),
	onCheckedChange,
	class: className,
	id,
	disabled = false,
}: Props = $props();

function handleClick() {
	if (disabled) {
		return;
	}

	checked = !checked;
	onCheckedChange?.(checked);
}

function handleKeyDown(event: KeyboardEvent) {
	if (disabled) {
		return;
	}

	if (event.key === " " || event.key === "Enter") {
		event.preventDefault();
		handleClick();
	}
}
</script>

<button
	type="button"
	role="checkbox"
	aria-checked={checked}
	aria-disabled={disabled}
	{id}
	class={cn(
		"border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 shadow-xs peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
		checked && "bg-primary text-primary-foreground border-primary",
		className
	)}
	{disabled}
	onclick={handleClick}
	onkeydown={handleKeyDown}
>
	{#if checked}
		<CheckIcon class="size-3.5" />
	{/if}
</button>