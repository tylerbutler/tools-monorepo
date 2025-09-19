<script lang="ts">
	import { cn } from "$lib/utils.js";

	interface Props {
		class?: string;
		children: any;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<h3
	class={cn("text-2xl font-semibold leading-none tracking-tight", className)}
	{...restProps}
>
	{@render children()}
</h3>