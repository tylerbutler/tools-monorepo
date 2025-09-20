<script lang="ts">
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import type { GeneratedTest } from "$lib/data/types.js";
import Icon from "./Icon.svelte";
import { ArrowLeft02Icon, CodeIcon, Copy01Icon, File01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import WhitespaceCodeHighlight from "./WhitespaceCodeHighlight.svelte";

interface Props {
	test: GeneratedTest;
	onBack: () => void;
}

let { test, onBack }: Props = $props();

// Copy functionality
async function copyToClipboard(text: string, type: string) {
	try {
		await navigator.clipboard.writeText(text);
		// Could add a toast notification here
		console.log(`${type} copied to clipboard`);
	} catch (err) {
		console.error("Failed to copy:", err);
	}
}

// Format expected result for display
const formattedExpected = $derived.by(() => {
	const { expected } = test;

	if (expected.error) {
		return {
			type: "error",
			content: expected.error,
			language: "text",
		};
	}

	if (expected.entries) {
		return {
			type: "entries",
			content: JSON.stringify(expected.entries, null, 2),
			language: "json",
		};
	}

	if (expected.object) {
		return {
			type: "object",
			content: JSON.stringify(expected.object, null, 2),
			language: "json",
		};
	}

	if (expected.value !== undefined) {
		return {
			type: "value",
			content: String(expected.value),
			language: "text",
		};
	}

	return {
		type: "unknown",
		content: "No expected result defined",
		language: "text",
	};
});

// Generate test command
const testCommand = $derived(
	`ccl parse ${JSON.stringify(test.input)} | ccl ${test.functions.join(" ")}`,
);
</script>

<div class="space-y-6">
	<!-- Header with back button -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<Button variant="outline" onclick={onBack} aria-label="Go back to test list">
				<Icon icon={ArrowLeft02Icon} size={16} class="mr-2" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold">{test.name}</h1>
				<p class="text-muted-foreground">Test case details and expected behavior</p>
			</div>
		</div>
		<Button
			variant="secondary"
			onclick={() => copyToClipboard(testCommand, "Test command")}
			aria-label="Copy test command"
		>
			<Icon icon={Copy01Icon} size={16} class="mr-2" />
			Copy Command
		</Button>
	</div>

	<!-- Test metadata -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Functions -->
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm flex items-center">
					<Icon icon={CodeIcon} size={16} class="mr-2" />
					Functions ({test.functions.length})
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-1">
					{#each test.functions as func}
						<Badge variant="secondary" class="text-xs">
							{func}
						</Badge>
					{/each}
				</div>
			</CardContent>
		</Card>

		<!-- Features -->
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm">Features ({test.features.length})</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-1">
					{#each test.features as feature}
						<Badge variant="outline" class="text-xs">
							{feature}
						</Badge>
					{/each}
					{#if test.features.length === 0}
						<span class="text-sm text-muted-foreground">No special features</span>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Behaviors -->
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm">Behaviors ({test.behaviors.length})</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-1">
					{#each test.behaviors as behavior}
						<Badge variant="outline" class="text-xs">
							{behavior}
						</Badge>
					{/each}
					{#if test.behaviors.length === 0}
						<span class="text-sm text-muted-foreground">Default behaviors</span>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Main content -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Input -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<CardTitle class="flex items-center">
						<Icon icon={File01Icon} size={16} class="mr-2" />
						Input
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => copyToClipboard(test.input, "Input")}
						aria-label="Copy input"
					>
						<Icon icon={Copy01Icon} size={14} />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div class="relative">
					<WhitespaceCodeHighlight code={test.input} language="ccl" />
				</div>
			</CardContent>
		</Card>

		<!-- Expected Result -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<CardTitle class="flex items-center">
						<Icon icon={PlayIcon} size={16} class="mr-2" />
						Expected Result
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => copyToClipboard(formattedExpected.content, "Expected result")}
						aria-label="Copy expected result"
					>
						<Icon icon={Copy01Icon} size={14} />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					<!-- Result type indicator -->
					<div class="flex items-center space-x-2">
						<Badge variant={formattedExpected.type === "error" ? "destructive" : "default"}>
							{formattedExpected.type}
						</Badge>
						{#if formattedExpected.type === "entries" && Array.isArray(test.expected.entries)}
							<span class="text-sm text-muted-foreground">
								{test.expected.entries.length} entries
							</span>
						{/if}
					</div>

					<!-- Result content -->
					<div class="relative">
						<WhitespaceCodeHighlight
							code={formattedExpected.content}
							language={formattedExpected.language}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Test Command -->
	<Card>
		<CardHeader class="pb-3">
			<div class="flex items-center justify-between">
				<CardTitle>Test Command</CardTitle>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => copyToClipboard(testCommand, "Test command")}
					aria-label="Copy test command"
				>
					<Icon icon={Copy01Icon} size={14} />
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			<div class="bg-muted/50 rounded-md p-4">
				<code class="text-sm font-mono">{testCommand}</code>
			</div>
		</CardContent>
	</Card>

	<!-- Test count information -->
	{#if test.expected.count !== undefined}
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm">Assertion Count</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{test.expected.count}</div>
				<p class="text-sm text-muted-foreground">
					This test contains {test.expected.count} assertion{test.expected.count === 1 ? "" : "s"}
				</p>
			</CardContent>
		</Card>
	{/if}
</div>