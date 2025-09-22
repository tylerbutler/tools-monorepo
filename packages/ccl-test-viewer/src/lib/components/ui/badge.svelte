<script lang="ts">
import { cn } from "$lib/utils.js";
import type { HTMLAttributes } from "svelte/elements";
import { tv, type VariantProps } from "tailwind-variants";

const badgeVariants = tv({
	base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	variants: {
		variant: {
			default:
				"border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
			secondary:
				"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
			destructive:
				"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
			outline: "text-foreground",
			function:
				"border-transparent bg-info/10 text-info hover:bg-info/20",
			feature:
				"border-transparent bg-success/10 text-success hover:bg-success/20",
			behavior:
				"border-transparent bg-purple/10 text-purple hover:bg-purple/20",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
	class?: string;
	variant?: VariantProps<typeof badgeVariants>["variant"];
	children: import("svelte").Snippet;
}

let { class: className, variant, children, ...restProps }: Props = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)} {...restProps}>
	{@render children()}
</span>