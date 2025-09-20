<script lang="ts">
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/index.js";
import type { GeneratedTest } from "$lib/data/types.js";
import Icon from "./Icon.svelte";
import { ArrowRight01Icon, CodeIcon, EyeIcon } from "@hugeicons/core-free-icons";
import WhitespaceCodeHighlight from "./WhitespaceCodeHighlight.svelte";

interface Props {
	test: GeneratedTest;
	onView: (test: GeneratedTest) => void;
}

let { test, onView }: Props = $props();

function truncateInput(input: string, maxLength: number = 100): string {
	if (input.length <= maxLength) return input;
	return input.substring(0, maxLength) + "...";
}

function handleView() {
	onView(test);
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		handleView();
	}
}

// Generate human-readable expected result summary
const expectedSummary = $derived.by(() => {
	const { expected } = test;

	if (expected.error) {
		return `Error expected: ${expected.error}`;
	}

	if (expected.entries) {
		const count = Array.isArray(expected.entries) ? expected.entries.length : "invalid";
		return `${count} entries`;
	}

	if (expected.object) {
		return "Object result";
	}

	if (expected.value !== undefined) {
		return `Value: ${String(expected.value)}`;
	}

	return "Unknown result";
});
</script>

<!-- Keyboard accessible test card -->
<Card
	class="transition-all hover:shadow-lg cursor-pointer hover:border-primary/50"
	onclick={handleView}
	onkeydown={handleKeydown}
	tabindex={0}
	role="button"
	aria-label="View test case: {test.name}"
>
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between">
			<CardTitle class="text-lg font-semibold truncate pr-2">
				{test.name}
			</CardTitle>
			<Button
				variant="ghost"
				size="sm"
				onclick={handleView}
				aria-label="View test details"
			>
				<Icon icon={EyeIcon} size={16} class="mr-1" />
				View
				<Icon icon={ArrowRight01Icon} size={16} class="ml-1" />
			</Button>
		</div>
	</CardHeader>

	<CardContent class="space-y-4">
		<!-- Input preview -->
		<div>
			<h4 class="text-sm font-medium text-muted-foreground mb-2">Input</h4>
			<div class="bg-muted/50 rounded-md p-3">
				<WhitespaceCodeHighlight
					code={truncateInput(test.input)}
					language="ccl"
				/>
			</div>
		</div>

		<!-- Expected result -->
		<div>
			<h4 class="text-sm font-medium text-muted-foreground mb-2">Expected</h4>
			<div class="text-sm bg-green-50 text-green-800 border border-green-200 rounded-md px-3 py-2">
				{expectedSummary}
			</div>
		</div>

		<!-- Function tags -->
		{#if test.functions.length > 0}
			<div>
				<h4 class="text-sm font-medium text-muted-foreground mb-2 flex items-center">
					<Icon icon={CodeIcon} size={14} class="mr-1" />
					Functions
				</h4>
				<div class="flex flex-wrap gap-1">
					{#each test.functions.slice(0, 3) as func}
						<Badge variant="secondary" class="text-xs">
							{func}
						</Badge>
					{/each}
					{#if test.functions.length > 3}
						<Badge variant="outline" class="text-xs">
							+{test.functions.length - 3} more
						</Badge>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Feature tags -->
		{#if test.features.length > 0}
			<div>
				<h4 class="text-sm font-medium text-muted-foreground mb-2">Features</h4>
				<div class="flex flex-wrap gap-1">
					{#each test.features.slice(0, 2) as feature}
						<Badge variant="outline" class="text-xs">
							{feature}
						</Badge>
					{/each}
					{#if test.features.length > 2}
						<Badge variant="outline" class="text-xs">
							+{test.features.length - 2} more
						</Badge>
					{/if}
				</div>
			</div>
		{/if}
	</CardContent>
</Card>