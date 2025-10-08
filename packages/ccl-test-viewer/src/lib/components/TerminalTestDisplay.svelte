<script lang="ts">
import type { GeneratedTest } from "$lib/data/types.js";
import TerminalEntryBox from "./TerminalEntryBox.svelte";

interface Props {
	test: GeneratedTest;
	testNumber?: number;
}

let { test, testNumber = 1 }: Props = $props();

// Visualize whitespace in input
function visualizeWhitespace(s: string): string {
	return s.replace(/ /g, "·").replace(/\t/g, "→");
}

// Extract entries from expected result
const entries = $derived.by(() => {
	if (test.expected.entries && Array.isArray(test.expected.entries)) {
		return test.expected.entries;
	}
	return [];
});

const hasError = $derived(test.expected.error !== undefined);
const assertionCount = $derived(test.expected.count || 0);
</script>

<div class="terminal-test-display">
	<!-- Test header -->
	<div class="test-header">
		Test #{testNumber}: {test.name}
	</div>

	<!-- Input section -->
	<div class="input-section">
		<div class="input-header">📄 CCL INPUT:</div>
		<div class="input-content">
			{visualizeWhitespace(test.input)}
		</div>
	</div>

	<!-- Expected result section -->
	<div class="validation-section">
		{#if hasError}
			<div class="error-header">❌ EXPECTED: Parse Error</div>
			<div class="count-info">Count: {assertionCount} assertion(s)</div>
			{#if test.expected.error}
				<div class="error-message">Error: {test.expected.error}</div>
			{/if}
		{:else}
			<div class="success-header">✅ EXPECTED: Parse Success</div>
			<div class="count-info">Count: {assertionCount} assertion(s)</div>

			{#if entries.length > 0}
				<div class="entries-info">Entries ({entries.length} total):</div>
				<div class="entries-container">
					{#each entries as entry}
						<TerminalEntryBox {entry} />
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Metadata section -->
	{#if test.features.length > 0 || test.behaviors.length > 0}
		<div class="variants-section">
			<div class="variants-header">🔄 VARIANTS:</div>
			<div class="variants-tags">
				{#each test.features as feature, i}
					{#if i > 0}, {/if}<span class="variant-tag">feature:{feature}</span>
				{/each}
				{#each test.behaviors as behavior, i}
					{#if test.features.length > 0 || i > 0}, {/if}<span class="variant-tag">behavior:{behavior}</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.terminal-test-display {
		font-family: 'IBM Plex Mono', monospace;
		background: #0A0A0A;
		color: #FFFFFF;
		padding: 1.5rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
		border: 1px solid #2A2A2A;
	}

	.test-header {
		color: #00D7FF; /* Primary cyan */
		font-weight: 700;
		font-size: 1.125rem;
		margin-bottom: 1rem;
	}

	.input-section {
		margin-bottom: 1rem;
	}

	.input-header {
		color: #00D7FF; /* Primary cyan */
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.input-content {
		background: #1A1A1A;
		color: #FFFFFF;
		padding: 0.5rem;
		border-radius: 0.25rem;
		margin: 0 0 1rem 1rem;
		white-space: pre-wrap;
		font-size: 0.875rem;
	}

	.validation-section {
		margin-bottom: 1rem;
	}

	.success-header {
		color: #00D787; /* Success green */
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.error-header {
		color: #FF5F87; /* Error red */
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.count-info {
		margin: 0 0 0.5rem 2rem;
		font-size: 0.875rem;
	}

	.entries-info {
		margin: 0.5rem 0 0.5rem 2rem;
		font-size: 0.875rem;
	}

	.entries-container {
		margin-left: 1rem;
	}

	.error-message {
		margin: 0.5rem 0 0 2rem;
		color: #FF5F87; /* Error red */
		font-size: 0.875rem;
	}

	.variants-section {
		margin-top: 1rem;
	}

	.variants-header {
		color: #FFAF00; /* Warning orange */
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.variants-tags {
		margin-left: 2rem;
		font-size: 0.875rem;
	}

	.variant-tag {
		color: #FFAF00; /* Warning orange */
		font-weight: 700;
	}
</style>