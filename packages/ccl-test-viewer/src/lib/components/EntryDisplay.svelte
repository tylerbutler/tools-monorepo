<script lang="ts">
interface Props {
	entry: {
		key: string;
		value: string;
	};
}

let { entry }: Props = $props();

// Visualize whitespace in keys and values only
function visualizeWhitespace(s: string): string {
	return s
		.replace(/\t/g, '<span class="whitespace-indicator tab">➞</span>') // Tab
		.replace(/ /g, '<span class="whitespace-indicator space">●</span>') // Space
		.replace(/\r\n/g, '<span class="whitespace-indicator newline">¶</span>\r\n') // CRLF
		.replace(
			/(?<!\r)\n/g,
			'<span class="whitespace-indicator newline">¶</span>\n',
		); // LF
}

const displayKey = $derived(
	entry.key
		? visualizeWhitespace(entry.key)
		: '<span class="empty-placeholder">(empty)</span>',
);
const displayValue = $derived(
	entry.value
		? visualizeWhitespace(entry.value)
		: '<span class="empty-placeholder">(empty)</span>',
);
</script>

<div class="entry-display font-mono">
	<span class="entry-key">{@html displayKey}</span>
	<span class="entry-separator">=</span>
	<span class="entry-value">{@html displayValue}</span>
</div>

<style>
	.entry-display {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 0.375rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25;
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		white-space: pre-wrap;
		overflow-x: auto;
		width: fit-content;
		max-width: 100%;
	}

	.entry-key {
		color: hsl(var(--primary));
		font-weight: 600;
	}

	.entry-separator {
		color: hsl(var(--muted-foreground));
		font-weight: 600;
		margin: 0 0.25rem;
	}

	.entry-value {
		color: hsl(var(--foreground));
		flex: 1;
		min-width: 0; /* Allow text to wrap */
	}

	/* Whitespace indicator styling */
	:global(.whitespace-indicator) {
		opacity: 0.6;
		font-size: 0.9em;
		color: hsl(var(--muted-foreground));
		user-select: none;
		pointer-events: none;
	}

	:global(.whitespace-indicator.space) {
		color: #6b7280;
	}

	:global(.whitespace-indicator.tab) {
		color: #6b7280;
		font-weight: bold;
	}

	:global(.whitespace-indicator.newline) {
		color: #6b7280;
		font-weight: bold;
	}

	/* Empty placeholder styling */
	:global(.empty-placeholder) {
		font-style: italic;
		color: hsl(var(--muted-foreground));
		opacity: 0.8;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.entry-display {
			background: hsl(var(--card));
		}
	}
</style>