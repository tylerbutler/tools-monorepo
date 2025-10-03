<script lang="ts">
import { cn } from "$lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";

interface Props
	extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "onclick"> {
	class?: string;
	onclick?: (event: MouseEvent) => void;
	children: import("svelte").Snippet;
}

let { class: className, children, ...restProps }: Props = $props();
</script>

<div
	class={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
	{...restProps}
>
	{@render children()}
</div>