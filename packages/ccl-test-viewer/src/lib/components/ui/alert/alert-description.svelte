<script lang="ts">
import { cn } from "@/utils.js";
import type { AlertDescriptionProps } from "./index.js";

type $$Props = AlertDescriptionProps;

let className: $$Props["class"] ;
export { className as class };
</script>

<div class={cn("text-sm [&_p]:leading-relaxed", className)} {...$$restProps}>
	<slot />
</div>