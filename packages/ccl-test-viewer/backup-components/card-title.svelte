<script lang="ts">
import { cn } from "$lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";

interface Props extends Omit<HTMLAttributes<HTMLHeadingElement>, "class"> {
	class?: string;
	children: import("svelte").Snippet;
}

let { class: className, children, ...restProps }: Props = $props();
</script>

<h3
	class={cn("text-2xl font-semibold leading-none tracking-tight", className)}
	{...restProps}
>
	{@render children()}
</h3>