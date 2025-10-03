<script lang="ts">
import { cn } from "$lib/utils.js";

interface Props {
	class?: string;
	children: import("svelte").Snippet;
}

let { class: className, children, ...restProps }: Props = $props();
</script>

<p
	class={cn("text-sm text-muted-foreground", className)}
	{...restProps}
>
	{@render children()}
</p>