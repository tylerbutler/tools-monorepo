<script lang="ts">
import { cn } from "$lib/utils.js";

interface Props {
	class?: string;
	children: import("svelte").Snippet;
}

let { class: className, children, ...restProps }: Props = $props();
</script>

<div
	class={cn("flex flex-col space-y-1.5 p-6", className)}
	{...restProps}
>
	{@render children()}
</div>