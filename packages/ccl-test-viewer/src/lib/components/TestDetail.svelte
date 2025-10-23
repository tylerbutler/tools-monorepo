<script lang="ts">
import { ArrowLeft, Code, Copy, File, Play } from "@lucide/svelte";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import type { FunctionSpecificResult } from "$lib/data/function-types.js";
import { FUNCTION_STATUS } from "$lib/data/function-types.js";
import type { CCLFunction, GeneratedTest } from "$lib/data/types.js";
import EntryDisplay from "./EntryDisplay.svelte";
import JsonTreeViewer from "./JsonTreeViewer.svelte";
import ListDisplay from "./ListDisplay.svelte";
import PlaceholderDisplay from "./PlaceholderDisplay.svelte";
import ValueDisplay from "./ValueDisplay.svelte";
import WhitespaceCodeHighlight from "./WhitespaceCodeHighlight.svelte";

interface Props {
	test: GeneratedTest;
	onBack: () => void;
}

let { test, onBack }: Props = $props();

// Copy functionality
async function copyToClipboard(text: string) {
	try {
		await navigator.clipboard.writeText(text);
	} catch (err) {}
}

// Function-aware result formatting
const formattedExpected = $derived.by((): FunctionSpecificResult => {
	const { expected } = test;
	const primaryFunction = (test.functions[0] as CCLFunction) || "parse";
	const isImplemented = FUNCTION_STATUS[primaryFunction] === "implemented";

	// Handle errors first
	if (expected.error) {
		return {
			type: "error",
			content:
				typeof expected.error === "string"
					? expected.error
					: "Parse error occurred",
			language: "text",
			metadata: {
				functionType: primaryFunction,
				isImplemented,
			},
		};
	}

	// Function-specific formatting
	switch (primaryFunction) {
		case "parse":
		case "parse_value":
			return {
				type: "entries",
				content: expected.entries || [],
				language: "ccl",
				metadata: {
					functionType: primaryFunction,
					itemCount: expected.entries?.length || 0,
					isImplemented: true,
				},
			};

		case "filter":
			return {
				type: "entries",
				content: expected.entries || [],
				language: "ccl",
				metadata: {
					functionType: primaryFunction,
					itemCount: expected.entries?.length || 0,
					isImplemented: false,
				},
			};

		case "build_hierarchy":
			return {
				type: "hierarchy",
				content: expected.object || {},
				language: "json",
				metadata: {
					functionType: primaryFunction,
					keyCount: expected.object ? Object.keys(expected.object).length : 0,
					isImplemented: true,
					count: expected.count,
				},
			};

		case "get_string":
		case "get_int":
		case "get_float":
		case "get_bool":
			return {
				type: "value",
				content: expected.value,
				language: "text",
				metadata: {
					functionType: primaryFunction,
					valueType: primaryFunction.replace("get_", "") as
						| "string"
						| "int"
						| "float"
						| "bool",
					isImplemented: false,
				},
			};

		case "get_list":
			return {
				type: "list",
				content: expected.list || [],
				language: "json",
				metadata: {
					functionType: primaryFunction,
					itemCount: expected.list?.length || 0,
					isImplemented: false,
				},
			};

		default:
			return {
				type: "placeholder",
				content: expected,
				language: "json",
				metadata: {
					functionType: primaryFunction,
					isImplemented: false,
				},
			};
	}
});
</script>

<div class="space-y-6">
	<!-- Header with back button -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<Button variant="outline" onclick={onBack} aria-label="Go back to test list">
				<ArrowLeft size={16} class="mr-2" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold">{test.name}</h1>
				<p class="text-muted-foreground">Test case details and expected behavior</p>
			</div>
		</div>
	</div>

	<!-- Input and Expected Result (moved above metadata) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Input -->
		<Card>
			<CardHeader class="pb-3">
				<div class="flex items-center justify-between">
					<CardTitle class="flex items-center">
						<File size={16} class="mr-2" />
						Input
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => copyToClipboard(test.input)}
						aria-label="Copy input"
					>
						<Copy size={14} />
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
				<CardTitle class="flex items-center">
					<Play size={16} class="mr-2" />
					Expected Result
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					<!-- Result type indicator -->
					<div class="flex items-center space-x-2">
						<Badge variant={formattedExpected.type === "error" ? "destructive" : "default"}>
							{formattedExpected.type}
						</Badge>
						{#if formattedExpected.metadata.itemCount !== undefined}
							<span class="text-sm text-muted-foreground">
								{formattedExpected.metadata.itemCount} {formattedExpected.type === 'list' ? 'items' : 'entries'}
							</span>
						{:else if formattedExpected.metadata.keyCount !== undefined}
							<span class="text-sm text-muted-foreground">
								{formattedExpected.metadata.keyCount} keys
							</span>
						{:else if formattedExpected.metadata.valueType}
							<span class="text-sm text-muted-foreground">
								{formattedExpected.metadata.valueType} value
							</span>
						{/if}
					</div>

					<!-- Function-specific result display -->
					{#if formattedExpected.type === 'entries' && formattedExpected.metadata.isImplemented}
						<!-- Entries display for parse and similar functions -->
						<div class="space-y-2">
							{#each (formattedExpected.content as Array<{ key: string; value: string }>) as entry}
								<EntryDisplay {entry} />
							{/each}
						</div>
					{:else if (formattedExpected.type === 'hierarchy' || formattedExpected.type === 'object') && formattedExpected.metadata.isImplemented}
						<!-- Object/Hierarchy display using JsonTreeViewer with debugging -->
						<JsonTreeViewer data={formattedExpected.content} />
					{:else if formattedExpected.type === 'value' && formattedExpected.metadata.isImplemented}
						<!-- Value display for get_string, get_int, etc. -->
						<ValueDisplay
							value={formattedExpected.content}
							functionType={formattedExpected.metadata.functionType}
						/>
					{:else if formattedExpected.type === 'list' && formattedExpected.metadata.isImplemented}
						<!-- List display for get_list -->
						<ListDisplay list={(formattedExpected.content as any[])} />
					{:else if formattedExpected.type === 'error'}
						<!-- Error display -->
						<div class="error-display">
							<WhitespaceCodeHighlight
								code={(formattedExpected.content as string)}
								language={formattedExpected.language}
							/>
						</div>
					{:else}
						<!-- Placeholder display for unimplemented functions -->
						<PlaceholderDisplay
							functionName={formattedExpected.metadata.functionType}
							rawExpected={formattedExpected.content}
						/>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Test metadata -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Functions -->
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-sm flex items-center">
					<Code size={16} class="mr-2" />
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
</div>

