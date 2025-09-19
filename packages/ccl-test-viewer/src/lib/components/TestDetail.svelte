<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '$lib/components/ui/index.js';
	import type { GeneratedTest } from '$lib/data/types.js';
	import { ArrowLeft, Code, Play, Copy, ExternalLink } from 'lucide-svelte';

	interface Props {
		test: GeneratedTest;
		onBack?: () => void;
	}

	let { test, onBack }: Props = $props();

	// Helper to format expected output in detail
	function formatExpectedDetail(expected: GeneratedTest['expected']): string {
		if (expected.error) return 'Error is expected to occur';

		let result = `Expected count: ${expected.count}`;

		if (expected.entries) {
			result += '\n\nExpected entries:';
			for (const entry of expected.entries) {
				result += `\n  ${entry.key} = ${entry.value}`;
			}
		}

		if (expected.object) {
			result += '\n\nExpected object:\n' + JSON.stringify(expected.object, null, 2);
		}

		if (expected.value !== undefined) {
			result += `\n\nExpected value: ${JSON.stringify(expected.value)}`;
		}

		if (expected.list) {
			result += '\n\nExpected list:\n' + JSON.stringify(expected.list, null, 2);
		}

		return result;
	}

	// Copy functionality
	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			// TODO: Show toast notification
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	}

	function copyInput() {
		copyToClipboard(test.input);
	}

	function copyExpected() {
		copyToClipboard(formatExpectedDetail(test.expected));
	}

	function copyValidation() {
		copyToClipboard(test.validation);
	}
</script>

<div class="max-w-4xl mx-auto p-6">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-6">
		{#if onBack}
			<Button variant="outline" size="sm" onclick={onBack}>
				<ArrowLeft class="h-4 w-4 mr-2" />
				Back to Browse
			</Button>
		{/if}
		<div class="flex-1">
			<h1 class="text-2xl font-bold">{test.name}</h1>
			<p class="text-muted-foreground">Test Details and Validation</p>
		</div>
	</div>

	<!-- Test Metadata -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
		<Card>
			<CardHeader>
				<CardTitle class="text-sm">Functions</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2">
					{#each test.functions as func}
						<Badge variant="function">{func}</Badge>
					{/each}
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm">Features</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2">
					{#if test.features.length > 0}
						{#each test.features as feature}
							<Badge variant="feature">{feature}</Badge>
						{/each}
					{:else}
						<span class="text-sm text-muted-foreground">No special features</span>
					{/if}
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm">Behaviors</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-wrap gap-2">
					{#if test.behaviors.length > 0}
						{#each test.behaviors as behavior}
							<Badge variant="behavior">{behavior}</Badge>
						{/each}
					{:else}
						<span class="text-sm text-muted-foreground">Standard behavior</span>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Test Input -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="flex items-center gap-2">
					<Code class="h-5 w-5" />
					Test Input
				</CardTitle>
				<Button variant="outline" size="sm" onclick={copyInput}>
					<Copy class="h-4 w-4 mr-2" />
					Copy
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			<pre class="bg-muted p-4 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto">{test.input}</pre>
		</CardContent>
	</Card>

	<!-- Expected Output -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="flex items-center gap-2">
					<Play class="h-5 w-5" />
					Expected Output
				</CardTitle>
				<Button variant="outline" size="sm" onclick={copyExpected}>
					<Copy class="h-4 w-4 mr-2" />
					Copy
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			<pre class="bg-muted p-4 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto">{formatExpectedDetail(test.expected)}</pre>

			{#if test.expected.error}
				<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
					<p class="text-sm text-red-800 font-medium">⚠️ This test expects an error to occur</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Validation Rules -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle>Validation</CardTitle>
				<Button variant="outline" size="sm" onclick={copyValidation}>
					<Copy class="h-4 w-4 mr-2" />
					Copy
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			<p class="text-sm bg-muted p-4 rounded-md">{test.validation}</p>
		</CardContent>
	</Card>

	<!-- Source Information -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<ExternalLink class="h-5 w-5" />
				Source Information
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				<div>
					<span class="text-sm font-medium">Source Test:</span>
					<span class="text-sm text-muted-foreground ml-2">{test.source_test}</span>
				</div>

				<div class="text-xs text-muted-foreground">
					<p>This test is part of the CCL test suite designed to validate CCL parsing implementations across different programming languages.</p>
				</div>
			</div>
		</CardContent>
	</Card>
</div>