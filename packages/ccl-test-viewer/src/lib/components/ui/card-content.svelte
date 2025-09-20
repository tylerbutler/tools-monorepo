<script lang="ts">
import { cn } from "$lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
	class?: string;
	children: import("svelte").Snippet;
}

let { class: className, children, ...restProps }: Props = $props();
</script>

<div
	class={cn("p-6 pt-0", className)}
	{...restProps}
>
	{@render children()}
</div>