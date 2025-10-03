<script lang="ts">
import { cn } from "@/utils.js";
import type { Props } from "./index.js";

type $$Props = Props;

let className: $$Props["class"] = undefined;
export let value: $$Props["value"] = 0;
export let max: $$Props["max"] = 100;
export { className as class };

$: percentage = Math.min(Math.max(((value || 0) / max) * 100, 0), 100);
</script>

<div
	class={cn(
		"relative h-4 w-full overflow-hidden rounded-full bg-secondary",
		className
	)}
	{...$$restProps}
>
	<div
		class="h-full w-full flex-1 bg-primary transition-all duration-200 ease-in-out"
		style="transform: translateX(-{100 - percentage}%)"
		role="progressbar"
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={max}
	></div>
</div>