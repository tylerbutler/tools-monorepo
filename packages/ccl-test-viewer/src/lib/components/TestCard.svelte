<script lang="ts">
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import type { GeneratedTest } from "$lib/data/types.js";
import { ArrowRight, Code, Eye } from "lucide-svelte";
import CodeHighlight from "./CodeHighlight.svelte";

interface Props {
	test: GeneratedTest;
	onClick?: () => void;
}

let { test, onClick }: Props = $props();

// Helper to format expected output for display
function formatExpected(expected: GeneratedTest["expected"]): string {
	if (expected.error) return "Error expected";
	if (expected.entries) return `${expected.count} entries`;
	if (expected.object) return "Object result";
	if (expected.list) return `List (${expected.list.length} items)`;
	if (expected.value !== undefined) return `Value: ${expected.value}`;
	return `Count: ${expected.count}`;
}

// Helper to truncate long input
function truncateInput(input: string, maxLength = 100): string {
	if (input.length <= maxLength) return input;
	return input.substring(0, maxLength) + "...";
}

// Helper to get test category color
function getCategoryColor(test: GeneratedTest): string {
	// Derive category from common patterns in test names or functions
	if (test.functions.includes("parse")) return "bg-blue-50 border-blue-200";
	if (
		test.functions.includes("get_string") ||
		test.functions.includes("get_int")
	)
		return "bg-green-50 border-green-200";
	if (test.functions.includes("build_hierarchy"))
		return "bg-purple-50 border-purple-200";
	if (test.name.includes("error") || test.expected.error)
		return "bg-red-50 border-red-200";
	return "bg-gray-50 border-gray-200";
}
</script>

<Card
	class={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${getCategoryColor(test)}`}
	onclick={onClick}
	role="button"
	tabindex={0}
	aria-label={`View test case: ${test.name}. Functions: ${test.functions.join(', ')}. Expected: ${formatExpected(test.expected)}`}
	onkeydown={(e: KeyboardEvent) => {
		if ((e.key === 'Enter' || e.key === ' ') && onClick) {
			e.preventDefault();
			onClick();
		}
	}}
>
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<CardTitle class="text-sm font-medium leading-5 text-gray-900">
				{test.name}
			</CardTitle>
			<Eye class="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
		</div>

		<!-- Function and Feature Badges -->
		<div class="flex flex-wrap gap-1 mt-2" role="list" aria-label="Test metadata">
			{#each test.functions as func}
				<Badge variant="function" class="text-xs" role="listitem" aria-label={`Function: ${func}`}>
					{func}
				</Badge>
			{/each}
			{#each test.features as feature}
				<Badge variant="feature" class="text-xs" role="listitem" aria-label={`Feature: ${feature}`}>
					{feature}
				</Badge>
			{/each}
		</div>
	</CardHeader>

	<CardContent class="pt-0">
		<!-- Input Preview with Syntax Highlighting -->
		<div class="mb-3">
			<div class="flex items-center gap-1 mb-1">
				<Code class="h-3 w-3 text-gray-500" aria-hidden="true" />
				<span class="text-xs font-medium text-gray-600" id={`input-label-${test.name}`}>Input</span>
			</div>
			<div aria-labelledby={`input-label-${test.name}`} role="code">
				<CodeHighlight
					code={truncateInput(test.input)}
					language="ccl"
					class="text-xs"
					aria-label={`CCL input code: ${truncateInput(test.input)}`}
				/>
			</div>
		</div>

		<!-- Expected Output -->
		<div class="mb-3">
			<div class="flex items-center gap-1 mb-1">
				<ArrowRight class="h-3 w-3 text-gray-500" aria-hidden="true" />
				<span class="text-xs font-medium text-gray-600" id={`expected-label-${test.name}`}>Expected</span>
			</div>
			<div
				class="text-xs text-gray-700 bg-white rounded p-2 border"
				aria-labelledby={`expected-label-${test.name}`}
				role="status"
			>
				{formatExpected(test.expected)}
			</div>
		</div>

		<!-- Test Metadata -->
		<div class="flex justify-between items-center text-xs text-gray-500" role="group" aria-label="Test metadata">
			<span aria-label={`Validation type: ${test.validation}`}>{test.validation}</span>
			{#if test.behaviors.length > 0}
				<span class="text-purple-600" aria-label={`${test.behaviors.length} behavior${test.behaviors.length === 1 ? '' : 's'} defined`}>
					{test.behaviors.length} behavior{test.behaviors.length === 1 ? '' : 's'}
				</span>
			{/if}
		</div>
	</CardContent>
</Card>