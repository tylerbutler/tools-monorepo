<script lang="ts">
interface Props {
	entry: {
		key: string;
		value: string;
	};
}

const { entry }: Props = $props();

// Visualize whitespace in keys and values only
function visualizeWhitespace(s: string): string {
	return s
		.replace(/\t/g, "»") // Tab
		.replace(/ /g, "·") // Space
		.replace(/\r\n/g, "¶\r\n") // CRLF
		.replace(/(?<!\r)\n/g, "¶\n"); // LF
}

const displayKey = $derived(
	entry.key ? visualizeWhitespace(entry.key) : "(empty)",
);
const displayValue = $derived(
	entry.value ? visualizeWhitespace(entry.value) : "(empty)",
);
</script>

<div class="entry-display font-mono text-sm leading-5">
	<span class="entry-key {entry.key ? '' : 'empty-placeholder'}">{displayKey}</span>
	<span class="entry-separator">=</span>
	<span class="entry-value {entry.value ? '' : 'empty-placeholder'}">{displayValue}</span>
</div>

<style>
	.entry-display {
		background-color: var(--color-card);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		white-space: pre-wrap;
		overflow-x: auto;
		width: fit-content;
		max-width: 100%;
	}

	.entry-key {
		color: var(--color-primary);
		font-weight: 600;
		background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
	}

	.entry-separator {
		color: var(--color-muted-foreground);
		font-weight: 600;
		margin: 0 0.25rem;
	}

	.entry-value {
		color: var(--color-foreground);
		flex: 1;
		min-width: 0; /* Allow text to wrap */
		background-color: color-mix(in srgb, var(--color-secondary) 30%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-secondary) 50%, transparent);
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
	}

	/* Style the whitespace characters to be visually distinct */
	.entry-key,
	.entry-value {
		/* Make whitespace indicators slightly muted */
		color: inherit;
	}

	.entry-key::after,
	.entry-value::after {
		/* This ensures proper spacing for whitespace visualization */
		content: '';
	}

	/* Empty placeholder styling */
	.empty-placeholder {
		font-style: italic;
		color: var(--color-muted-foreground);
		opacity: 0.8;
	}

</style>