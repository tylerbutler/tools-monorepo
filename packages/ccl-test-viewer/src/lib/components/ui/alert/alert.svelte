<script lang="ts">
import type { Props } from "./index.js";

type $$Props = Props;

let className: $$Props["class"];
export const variant: $$Props["variant"] = undefined;
export { className as class };
</script>

<div class={cn(alertVariants({ variant }), className)} role="alert" {...$$restProps}>
	<slot />
</div>