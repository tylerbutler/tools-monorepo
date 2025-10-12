<script lang="ts">
import { Settings, Wrench } from "@lucide/svelte";
import { Badge } from "$lib/components/ui/index.js";
import {
	FUNCTION_DESCRIPTIONS,
	FUNCTION_STATUS,
} from "$lib/data/function-types.js";
import type { CCLFunction } from "$lib/data/types.js";

interface Props {
	functionName: CCLFunction;
	rawExpected?: any;
}

let { functionName, rawExpected }: Props = $props();

const status = $derived(FUNCTION_STATUS[functionName]);
const description = $derived(
	FUNCTION_DESCRIPTIONS[functionName] ||
		"CCL function with specialized behavior",
);
</script>

<div class="placeholder-display">
	<!-- Function header -->
	<div class="function-header">
		<div class="flex items-center gap-3">
			<Settings size={20} class="text-muted-foreground" />
			<div>
				<h3 class="function-name">{functionName}</h3>
				<p class="function-description">{description}</p>
			</div>
		</div>
		<Badge
			variant={status === 'implemented' ? 'default' : status === 'planned' ? 'secondary' : 'outline'}
			class="text-xs"
		>
			{status}
		</Badge>
	</div>

	<!-- Status message -->
	<div class="status-content">
		{#if status === 'implemented'}
			<div class="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 text-sm">
				<Wrench size={16} class="text-green-600 dark:text-green-400" />
				<span>This function is implemented and ready for use.</span>
			</div>
		{:else if status === 'planned'}
			<div class="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-sm">
				<Wrench size={16} class="text-amber-600 dark:text-amber-400" />
				<span>This function visualization is planned for implementation.</span>
			</div>
		{:else}
			<div class="flex items-center gap-2 p-3 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-sm">
				<Wrench size={16} class="text-purple-600 dark:text-purple-400" />
				<span>This function is experimental and may have limited support.</span>
			</div>
		{/if}
	</div>

	<!-- Raw data preview if available -->
	{#if rawExpected}
		<div class="raw-preview">
			<div class="preview-header">
				<span class="text-sm font-medium">Raw Expected Data</span>
				<Badge variant="outline" class="text-xs">debug</Badge>
			</div>
			<pre class="raw-content">{JSON.stringify(rawExpected, null, 2)}</pre>
		</div>
	{/if}

	<!-- Implementation note -->
	<div class="implementation-note">
		<p class="text-xs text-muted-foreground">
			{#if status === 'planned'}
				This function will receive a custom visualization in a future update.
				Currently showing placeholder content.
			{:else if status === 'experimental'}
				This function may be part of experimental CCL features.
				Visualization support may be limited.
			{:else}
				Function visualization should be available. If you see this message,
				there may be an implementation issue.
			{/if}
		</p>
	</div>
</div>

<style>
	.placeholder-display {
		font-family: 'Inter', system-ui, sans-serif;
	}

	.function-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	.function-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--foreground);
		font-family: 'IBM Plex Mono', monospace;
	}

	.function-description {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-top: 0.25rem;
	}

	.status-content {
		margin-bottom: 1rem;
	}


	.raw-preview {
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		margin-bottom: 1rem;
		overflow: hidden;
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
		background: oklch(from var(--muted) l c h / 0.5);
	}

	.raw-content {
		padding: 1rem;
		margin: 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--foreground);
		background: none;
		border: none;
		max-height: 200px;
		overflow-y: auto;
	}

	.implementation-note {
		padding: 0.75rem 1rem;
		background: oklch(from var(--muted) l c h / 0.3);
		border-radius: 0.375rem;
		border-left: 3px solid var(--primary);
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.function-header,
		.raw-preview {
			background: var(--card);
			border-color: var(--border);
		}

		.preview-header {
			background: oklch(from var(--muted) l c h / 0.2);
			border-color: var(--border);
		}


		.implementation-note {
			background: oklch(from var(--muted) l c h / 0.15);
		}
	}
</style>