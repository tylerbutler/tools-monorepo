<script lang="ts">
import { cn } from "@/utils.js";
import { alertVariants, type Props } from "./index.js";

type $$Props = Props;

let className: $$Props["class"] = undefined;
export let variant: $$Props["variant"] = undefined;
export { className as class };
</script>

<div class={cn(alertVariants({ variant }), className)} role="alert" {...$$restProps}>
	<slot />
</div>