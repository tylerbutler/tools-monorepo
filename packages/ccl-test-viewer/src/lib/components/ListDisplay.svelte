<script lang="ts">
import { Badge } from "$lib/components/ui/index.js";

interface Props {
	list: any[];
}

let { list }: Props = $props();

function formatItem(item: any, _index: number) {
	if (item === null || item === undefined) {
		return {
			display: item === null ? "null" : "undefined",
			type: "null",
			color: "text-muted-foreground italic",
		};
	}

	if (typeof item === "boolean") {
		return {
			display: String(item),
			type: "boolean",
			color: item ? "text-emerald" : "text-destructive",
		};
	}

	if (typeof item === "number") {
		return {
			display: String(item),
			type: "number",
			color: "text-info",
		};
	}

	if (typeof item === "string") {
		return {
			display: JSON.stringify(item),
			type: "string",
			color: "text-green-600 dark:text-green-400",
		};
	}

	if (Array.isArray(item)) {
		return {
			display: `[Array with ${item.length} items]`,
			type: "array",
			color: "text-purple",
		};
	}

	if (typeof item === "object") {
		const keys = Object.keys(item);
		return {
			display: `{Object with ${keys.length} keys}`,
			type: "object",
			color: "text-amber-600 dark:text-amber-400",
		};
	}

	return {
		display: String(item),
		type: "unknown",
		color: "text-muted-foreground",
	};
}
</script>

<div class="list-display">
	<!-- List metadata -->
	<div class="flex items-center gap-2 mb-3">
		<Badge variant="outline" class="text-xs">
			list
		</Badge>
		<span class="text-xs text-muted-foreground">
			{list.length} {list.length === 1 ? 'item' : 'items'}
		</span>
	</div>

	<!-- List content -->
	{#if list.length === 0}
		<div class="empty-list">
			<span class="text-muted-foreground italic">Empty list</span>
		</div>
	{:else}
		<div class="list-content">
			{#each list as item, index}
				{@const formatted = formatItem(item, index)}
				<div class="list-item">
					<div class="item-index">
						<span class="index-number">[{index}]</span>
					</div>
					<div class="item-content">
						<div class="item-value {formatted.color}">
							{formatted.display}
						</div>
						<div class="item-type">
							<Badge variant="secondary" class="text-xs">
								{formatted.type}
							</Badge>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- List summary for large lists -->
	{#if list.length > 10}
		<div class="list-summary">
			<span class="text-xs text-muted-foreground">
				Large list with {list.length} items. Consider implementing pagination for better performance.
			</span>
		</div>
	{/if}
</div>

<style>
	.list-display {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}

	.list-content {
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.75rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.empty-list {
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 2rem;
		text-align: center;
	}

	.list-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
		align-items: center;
	}

	.list-item:last-child {
		border-bottom: none;
	}

	.item-index {
		flex-shrink: 0;
		width: 3rem;
	}

	.index-number {
		color: var(--chart-2);
		font-weight: 600;
		font-size: 0.8rem;
	}

	.item-content {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0; /* Allow text truncation */
	}

	.item-value {
		flex: 1;
		font-weight: 500;
		word-break: break-all;
		line-height: 1.4;
	}

	.item-type {
		flex-shrink: 0;
	}

	.list-summary {
		margin-top: 0.75rem;
		padding: 0.5rem;
		background: oklch(from var(--muted) l c h / 0.5);
		border-radius: 0.375rem;
		text-align: center;
	}

	/* Zebra striping for better readability */
	.list-item:nth-child(even) {
		background: oklch(from var(--muted) l c h / 0.3);
		border-radius: 0.25rem;
		margin: 0 -0.25rem;
		padding-left: 0.75rem;
		padding-right: 0.75rem;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.list-content,
		.empty-list {
			background: var(--card);
			border-color: var(--border);
		}

		.list-summary {
			background: oklch(from var(--muted) l c h / 0.2);
		}

		.list-item:nth-child(even) {
			background: oklch(from var(--muted) l c h / 0.2);
		}
	}
</style>