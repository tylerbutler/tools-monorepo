<script lang="ts">
interface Props {
	entry: {
		key: string;
		value: string;
	};
}

let { entry }: Props = $props();

// Visualize whitespace like the terminal version
function visualizeWhitespace(s: string): string {
	return s.replace(/ /g, "·").replace(/\t/g, "→");
}

// Check if value contains newlines for multiline display
const isMultiline = $derived(entry.value.includes("\n"));
</script>

<div class="terminal-entry-box">
	{#if isMultiline}
		<!-- Multiline value: key on first line, value on subsequent lines -->
		<div class="entry-key-line">
			<span class="entry-key">{visualizeWhitespace(entry.key)}</span>
			<span class="entry-equals">=</span>
		</div>
		<div class="entry-value multiline">
			{visualizeWhitespace(entry.value)}
		</div>
	{:else}
		<!-- Single line: key = value -->
		<div class="entry-single-line">
			<span class="entry-key">{visualizeWhitespace(entry.key)}</span>
			<span class="entry-equals">=</span>
			<span class="entry-value">{visualizeWhitespace(entry.value)}</span>
		</div>
	{/if}
</div>

<style>
	.terminal-entry-box {
		/* Terminal-inspired rounded border box */
		border: 1px solid #626262;
		border-radius: 0.5rem;
		padding: 0.25rem 0.5rem;
		margin: 0 0 0 1rem;
		background: #1A1A1A;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.25;
	}

	.entry-key-line,
	.entry-single-line {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
	}

	.entry-key {
		color: #00D7FF; /* Primary cyan */
		font-weight: 700;
	}

	.entry-equals {
		color: #FFAF00; /* Warning orange */
		font-weight: 700;
	}

	.entry-value {
		color: #FFFFFF;
	}

	.entry-value.multiline {
		white-space: pre-wrap;
		margin-top: 0.25rem;
	}

	/* Empty value styling */
	.entry-value:empty::after {
		content: '(empty)';
		color: #999999;
		font-style: italic;
	}
</style>