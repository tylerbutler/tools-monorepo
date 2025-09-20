<script lang="ts">
import { Badge } from "$lib/components/ui/index.js";
import type { CCLFunction } from "$lib/data/types.js";

interface Props {
	value: any;
	functionType: CCLFunction;
}

let { value, functionType }: Props = $props();

// Type-specific formatting and styling
const formattedValue = $derived.by(() => {
	switch (functionType) {
		case "get_string":
			return {
				display: JSON.stringify(value),
				type: "string",
				color: "text-green-600 dark:text-green-400",
				bgColor: "bg-green-50 dark:bg-green-950/30",
			};
		case "get_int":
			return {
				display: String(value),
				type: "integer",
				color: "text-blue-600 dark:text-blue-400",
				bgColor: "bg-blue-50 dark:bg-blue-950/30",
			};
		case "get_float":
			return {
				display: String(value),
				type: "float",
				color: "text-purple-600 dark:text-purple-400",
				bgColor: "bg-purple-50 dark:bg-purple-950/30",
			};
		case "get_bool":
			return {
				display: String(value),
				type: "boolean",
				color: value
					? "text-emerald-600 dark:text-emerald-400"
					: "text-red-600 dark:text-red-400",
				bgColor: value
					? "bg-emerald-50 dark:bg-emerald-950/30"
					: "bg-red-50 dark:bg-red-950/30",
			};
		default:
			return {
				display: String(value),
				type: "value",
				color: "text-foreground",
				bgColor: "bg-muted/50",
			};
	}
});
</script>

<div class="value-display">
	<!-- Type indicator -->
	<div class="flex items-center gap-2 mb-2">
		<Badge variant="outline" class="text-xs">
			{formattedValue.type}
		</Badge>
		<span class="text-xs text-muted-foreground">
			Extracted value from CCL data
		</span>
	</div>

	<!-- Value container -->
	<div class="value-container {formattedValue.bgColor} {formattedValue.color}">
		<div class="value-content">
			{formattedValue.display}
		</div>
	</div>

	<!-- Additional context for specific types -->
	{#if functionType === 'get_string' && typeof value === 'string'}
		<div class="text-xs text-muted-foreground mt-2">
			Length: {value.length} characters
		</div>
	{:else if functionType === 'get_bool'}
		<div class="text-xs text-muted-foreground mt-2">
			Boolean value: {value ? 'true' : 'false'}
		</div>
	{:else if (functionType === 'get_int' || functionType === 'get_float') && typeof value === 'number'}
		<div class="text-xs text-muted-foreground mt-2">
			Numeric value: {functionType === 'get_int' ? 'integer' : 'floating-point'}
		</div>
	{/if}
</div>

<style>
	.value-display {
		font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
	}

	.value-container {
		border: 1px solid hsl(var(--border));
		border-radius: 0.375rem;
		padding: 1rem;
		font-size: 1.125rem;
		font-weight: 600;
		text-align: center;
		min-height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.value-content {
		word-break: break-all;
		max-width: 100%;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.value-container {
			border-color: hsl(var(--border));
		}
	}
</style>