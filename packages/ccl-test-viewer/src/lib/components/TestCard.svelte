<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, Badge } from '$lib/components/ui/index.js';
	import type { GeneratedTest } from '$lib/data/types.js';
	import { Code, Eye, ArrowRight } from 'lucide-svelte';
	import CodeHighlight from './CodeHighlight.svelte';

	interface Props {
		test: GeneratedTest;
		onClick?: () => void;
	}

	let { test, onClick }: Props = $props();

	// Helper to format expected output for display
	function formatExpected(expected: GeneratedTest['expected']): string {
		if (expected.error) return 'Error expected';
		if (expected.entries) return `${expected.count} entries`;
		if (expected.object) return 'Object result';
		if (expected.list) return `List (${expected.list.length} items)`;
		if (expected.value !== undefined) return `Value: ${expected.value}`;
		return `Count: ${expected.count}`;
	}

	// Helper to truncate long input
	function truncateInput(input: string, maxLength = 100): string {
		if (input.length <= maxLength) return input;
		return input.substring(0, maxLength) + '...';
	}

	// Helper to get test category color
	function getCategoryColor(test: GeneratedTest): string {
		// Derive category from common patterns in test names or functions
		if (test.functions.includes('parse')) return 'bg-blue-50 border-blue-200';
		if (test.functions.includes('get_string') || test.functions.includes('get_int')) return 'bg-green-50 border-green-200';
		if (test.functions.includes('build_hierarchy')) return 'bg-purple-50 border-purple-200';
		if (test.name.includes('error') || test.expected.error) return 'bg-red-50 border-red-200';
		return 'bg-gray-50 border-gray-200';
	}
</script>

<Card
	class={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${getCategoryColor(test)}`}
	onclick={onClick}
>
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<CardTitle class="text-sm font-medium leading-5 text-gray-900">
				{test.name}
			</CardTitle>
			<Eye class="h-4 w-4 text-gray-400 shrink-0" />
		</div>

		<!-- Function and Feature Badges -->
		<div class="flex flex-wrap gap-1 mt-2">
			{#each test.functions as func}
				<Badge variant="function" class="text-xs">
					{func}
				</Badge>
			{/each}
			{#each test.features as feature}
				<Badge variant="feature" class="text-xs">
					{feature}
				</Badge>
			{/each}
		</div>
	</CardHeader>

	<CardContent class="pt-0">
		<!-- Input Preview with Syntax Highlighting -->
		<div class="mb-3">
			<div class="flex items-center gap-1 mb-1">
				<Code class="h-3 w-3 text-gray-500" />
				<span class="text-xs font-medium text-gray-600">Input</span>
			</div>
			<CodeHighlight
				code={truncateInput(test.input)}
				language="ccl"
				class="text-xs"
			/>
		</div>

		<!-- Expected Output -->
		<div class="mb-3">
			<div class="flex items-center gap-1 mb-1">
				<ArrowRight class="h-3 w-3 text-gray-500" />
				<span class="text-xs font-medium text-gray-600">Expected</span>
			</div>
			<div class="text-xs text-gray-700 bg-white rounded p-2 border">
				{formatExpected(test.expected)}
			</div>
		</div>

		<!-- Test Metadata -->
		<div class="flex justify-between items-center text-xs text-gray-500">
			<span>{test.validation}</span>
			{#if test.behaviors.length > 0}
				<span class="text-purple-600">
					{test.behaviors.length} behavior{test.behaviors.length === 1 ? '' : 's'}
				</span>
			{/if}
		</div>
	</CardContent>
</Card>