<script lang="ts">
import { Badge } from "$lib/components/ui/index.js";
import { ChevronDown, ChevronRight } from "lucide-svelte";

interface Props {
	object: Record<string, any>;
}

let { object }: Props = $props();

// Track expanded state for nested objects
let expandedPaths = $state<Set<string>>(new Set());

function toggleExpanded(path: string) {
	const newExpanded = new Set(expandedPaths);
	if (newExpanded.has(path)) {
		newExpanded.delete(path);
	} else {
		newExpanded.add(path);
	}
	expandedPaths = newExpanded;
}

function isExpanded(path: string): boolean {
	return expandedPaths.has(path);
}

function renderValue(value: any, path: string = "", depth: number = 0): any {
	const indentClass = `ml-${Math.min(depth * 4, 16)}`;

	if (value === null || value === undefined) {
		return {
			type: "null",
			content: value === null ? "null" : "undefined",
			class: "text-muted-foreground italic",
		};
	}

	if (typeof value === "boolean") {
		return {
			type: "boolean",
			content: String(value),
			class: value
				? "text-emerald-600 dark:text-emerald-400"
				: "text-red-600 dark:text-red-400",
		};
	}

	if (typeof value === "number") {
		return {
			type: "number",
			content: String(value),
			class: "text-blue-600 dark:text-blue-400",
		};
	}

	if (typeof value === "string") {
		return {
			type: "string",
			content: JSON.stringify(value),
			class: "text-green-600 dark:text-green-400",
		};
	}

	if (Array.isArray(value)) {
		return {
			type: "array",
			content: value,
			class: "",
			isExpandable: value.length > 0,
		};
	}

	if (typeof value === "object") {
		const keys = Object.keys(value);
		return {
			type: "object",
			content: value,
			class: "",
			isExpandable: keys.length > 0,
			keyCount: keys.length,
		};
	}

	return {
		type: "unknown",
		content: String(value),
		class: "text-muted-foreground",
	};
}

function getObjectStats(obj: Record<string, any>): {
	keys: number;
	depth: number;
} {
	const keys = Object.keys(obj).length;

	function getMaxDepth(value: any, currentDepth: number = 0): number {
		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			const childDepths = Object.values(value).map((v) =>
				getMaxDepth(v, currentDepth + 1),
			);
			return Math.max(currentDepth, ...childDepths);
		}
		return currentDepth;
	}

	return { keys, depth: getMaxDepth(obj) };
}

const stats = $derived(getObjectStats(object));
</script>

<div class="object-display">
	<!-- Object metadata -->
	<div class="flex items-center gap-2 mb-3">
		<Badge variant="outline" class="text-xs">
			object
		</Badge>
		<span class="text-xs text-muted-foreground">
			{stats.keys} {stats.keys === 1 ? 'key' : 'keys'}, depth: {stats.depth}
		</span>
	</div>

	<!-- Object content -->
	<div class="object-content">
		{#each Object.entries(object) as [key, value], index}
			{@const path = key}
			{@const rendered = renderValue(value, path, 0)}

			<div class="object-entry" class:last={index === Object.keys(object).length - 1}>
				<div class="flex items-start gap-2">
					<!-- Expand/collapse button for complex values -->
					{#if rendered.isExpandable}
						<button
							class="expand-button"
							onclick={() => toggleExpanded(path)}
							aria-label={isExpanded(path) ? 'Collapse' : 'Expand'}
						>
							{#if isExpanded(path)}
								<ChevronDown size={14} />
							{:else}
								<ChevronRight size={14} />
							{/if}
						</button>
					{:else}
						<div class="expand-placeholder"></div>
					{/if}

					<!-- Key -->
					<span class="object-key">"{key}":</span>

					<!-- Value -->
					<div class="flex-1">
						{#if rendered.type === 'object' && rendered.isExpandable}
							<span class="object-preview {rendered.class}">
								{isExpanded(path) ? '{' : `{ ... } (${rendered.keyCount} keys)`}
							</span>

							{#if isExpanded(path)}
								<div class="nested-object">
									{#each Object.entries(rendered.content) as [nestedKey, nestedValue]}
										{@const nestedRendered = renderValue(nestedValue, `${path}.${nestedKey}`, 1)}
										<div class="nested-entry">
											<span class="object-key">"{nestedKey}":</span>
											<span class="object-value {nestedRendered.class}">
												{nestedRendered.content}
											</span>
										</div>
									{/each}
								</div>
								<span class="object-preview">}</span>
							{/if}
						{:else if rendered.type === 'array' && rendered.isExpandable}
							<span class="object-preview {rendered.class}">
								{isExpanded(path) ? '[' : `[ ... ] (${rendered.content.length} items)`}
							</span>

							{#if isExpanded(path)}
								<div class="nested-object">
									{#each rendered.content as item, itemIndex}
										{@const itemRendered = renderValue(item, `${path}[${itemIndex}]`, 1)}
										<div class="nested-entry">
											<span class="array-index">[{itemIndex}]:</span>
											<span class="object-value {itemRendered.class}">
												{itemRendered.content}
											</span>
										</div>
									{/each}
								</div>
								<span class="object-preview">]</span>
							{/if}
						{:else}
							<span class="object-value {rendered.class}">
								{rendered.content}
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.object-display {
		font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
		font-size: 0.875rem;
	}

	.object-content {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 0.375rem;
		padding: 1rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.object-entry {
		padding: 0.25rem 0;
		border-bottom: 1px solid hsl(var(--border));
	}

	.object-entry.last {
		border-bottom: none;
	}

	.expand-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: none;
		background: none;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		border-radius: 2px;
		transition: background-color 0.2s;
	}

	.expand-button:hover {
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
	}

	.expand-placeholder {
		width: 20px;
		height: 20px;
	}

	.object-key {
		color: hsl(var(--primary));
		font-weight: 600;
		margin-right: 0.5rem;
	}

	.array-index {
		color: hsl(var(--chart-2));
		font-weight: 600;
		margin-right: 0.5rem;
	}

	.object-value {
		color: hsl(var(--foreground));
	}

	.object-preview {
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.nested-object {
		margin-left: 1rem;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
		padding-left: 1rem;
		border-left: 2px solid hsl(var(--border));
	}

	.nested-entry {
		padding: 0.125rem 0;
		display: flex;
		gap: 0.5rem;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.object-content {
			background: hsl(var(--card));
			border-color: hsl(var(--border));
		}
	}
</style>