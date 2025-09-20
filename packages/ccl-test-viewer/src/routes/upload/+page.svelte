<script lang="ts">
import MultiFileUpload from "$lib/components/MultiFileUpload.svelte";
import Button from "$lib/components/ui/button.svelte";
import Badge from "$lib/components/ui/badge.svelte";
import Card from "$lib/components/ui/card.svelte";
import CardContent from "$lib/components/ui/card-content.svelte";
import CardHeader from "$lib/components/ui/card-header.svelte";
import CardTitle from "$lib/components/ui/card-title.svelte";
import { Upload, FileText, Database, Layers, ToggleLeft, ToggleRight, Trash2 } from "lucide-svelte";
import { dataSourceManager } from "$lib/stores/dataSourceManager.svelte.js";
import { onMount } from "svelte";

interface UploadedFile {
	file: File;
	id: string;
	status: 'pending' | 'processing' | 'success' | 'error';
	error?: string;
	preview?: string;
}

// Initialize data source manager on component mount
onMount(async () => {
	await dataSourceManager.initialize();
});

// Handle successful file uploads - now using data source manager
async function handleFilesUploaded(files: UploadedFile[]) {
	const successfulFiles = files.filter(f => f.status === 'success');

	if (successfulFiles.length > 0) {
		const fileObjects = successfulFiles.map(f => f.file);
		const results = await dataSourceManager.processUploadedFiles(fileObjects);

		// Log results for debugging
		console.log('File processing results:', results);
	}
}

// Clear all uploaded data - now clears data sources
function clearAllData() {
	dataSourceManager.clearUploadedSources();
}

// Toggle data source active state
function toggleDataSource(sourceId: string) {
	dataSourceManager.toggleSource(sourceId);
}

// Remove a data source
function removeDataSource(sourceId: string) {
	dataSourceManager.removeSource(sourceId);
}

// Data source summaries for display
const sourceSummaries = $derived(dataSourceManager.sourceSummaries);
const mergedStats = $derived(dataSourceManager.mergedStats);
const isProcessing = $derived(dataSourceManager.isProcessing);
const hasUploadedSources = $derived(dataSourceManager.getSourcesByType('uploaded').length > 0);
</script>

<svelte:head>
	<title>Upload JSON Test Data - CCL Test Suite Viewer</title>
	<meta name="description" content="Upload and process JSON test data files for CCL test suite visualization" />
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-6">
	<!-- Page Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Upload Test Data</h1>
		<p class="text-muted-foreground">
			Upload JSON test files to dynamically load and visualize CCL test data.
			This complements the static test data built into the application.
		</p>
	</div>

	<!-- Upload Component -->
	<MultiFileUpload onFilesUploaded={handleFilesUploaded} maxFiles={10} />

	<!-- Combined Data Summary -->
	{#if mergedStats.totalSources > 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Database size={20} />
					Combined Data Summary
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{mergedStats.totalTests}</div>
						<div class="text-sm text-muted-foreground">Total Tests</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{mergedStats.totalAssertions}</div>
						<div class="text-sm text-muted-foreground">Total Assertions</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{mergedStats.totalCategories}</div>
						<div class="text-sm text-muted-foreground">Categories</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{mergedStats.activeSources}</div>
						<div class="text-sm text-muted-foreground">Active Sources</div>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Layers size={16} />
						<span class="text-sm text-muted-foreground">
							{mergedStats.activeSources} of {mergedStats.totalSources} source{mergedStats.totalSources !== 1 ? 's' : ''} active
						</span>
					</div>
					{#if hasUploadedSources}
						<Button variant="outline" size="sm" onclick={clearAllData}>
							Clear Uploaded Data
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Data Sources Management -->
	{#if sourceSummaries.length > 1}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Layers size={20} />
					Data Sources
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each sourceSummaries as source (source.id)}
						<div class="flex items-center justify-between p-3 border rounded-lg">
							<div class="flex items-center gap-3">
								<button
									onclick={() => toggleDataSource(source.id)}
									class="text-muted-foreground hover:text-foreground transition-colors"
									aria-label={source.active ? "Deactivate source" : "Activate source"}
								>
									{#if source.active}
										<ToggleRight size={20} class="text-primary" />
									{:else}
										<ToggleLeft size={20} />
									{/if}
								</button>

								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium">{source.name}</span>
										<Badge variant={source.type === 'static' ? 'default' : 'secondary'}>
											{source.type}
										</Badge>
										{#if !source.active}
											<Badge variant="outline" class="text-xs">inactive</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-4 text-xs text-muted-foreground mt-1">
										<span>{source.testCount} tests</span>
										<span>{source.categoryCount} categories</span>
										<span>uploaded {source.uploadedAt.toLocaleDateString()}</span>
									</div>
								</div>
							</div>

							{#if source.type !== 'static'}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeDataSource(source.id)}
									class="text-red-600 hover:text-red-700"
									aria-label="Remove data source"
								>
									<Trash2 size={14} />
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Phase Status -->
	{#if hasUploadedSources}
		<Card>
			<CardHeader>
				<CardTitle>What's Available Now</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Your test data has been uploaded and integrated! Phase 2 dynamic data management is now active:
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ul class="text-sm space-y-2">
						<li class="flex items-center gap-2">
							<div class="w-2 h-2 bg-green-500 rounded-full"></div>
							Multi-source data management
						</li>
						<li class="flex items-center gap-2">
							<div class="w-2 h-2 bg-green-500 rounded-full"></div>
							Toggle data sources on/off
						</li>
						<li class="flex items-center gap-2">
							<div class="w-2 h-2 bg-green-500 rounded-full"></div>
							Combined statistics and metrics
						</li>
					</ul>
					<ul class="text-sm space-y-2">
						<li class="flex items-center gap-2">
							<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
							Smart data validation and merging
						</li>
						<li class="flex items-center gap-2">
							<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
							Source tracking and metadata
						</li>
						<li class="flex items-center gap-2">
							<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
							Clean removal and management
						</li>
					</ul>
				</div>

				<div class="pt-4 flex items-center gap-2">
					<Badge variant="default" class="text-xs">
						✅ Phase 1 Complete: Multi-file Upload
					</Badge>
					<Badge variant="default" class="text-xs">
						✅ Phase 2 Complete: Dynamic Data Stores
					</Badge>
				</div>

				<div class="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
					<p class="font-medium mb-1">Next: Browse your uploaded data</p>
					<p>Visit the Browse page to see your uploaded tests combined with the built-in test data. Use filters and search to explore your data.</p>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Getting Started Guide -->
	{#if !hasUploadedSources}
		<Card>
			<CardHeader>
				<CardTitle>Getting Started</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-3">
					<div>
						<h4 class="text-sm font-medium mb-1">Expected JSON Format</h4>
						<p class="text-sm text-muted-foreground">
							Upload JSON files containing arrays of test objects with the following structure:
						</p>
						<pre class="text-xs bg-muted p-3 rounded mt-2 overflow-x-auto"><code>{JSON.stringify([
	{
		name: "test-name",
		input: "key=value",
		validation: "function:parse",
		expected: { count: 1, entries: [{ key: "key", value: "value" }] },
		functions: ["parse"],
		features: [],
		behaviors: [],
		variants: [],
		source_test: "original-test.json"
	}
], null, 2)}</code></pre>
					</div>

					<div>
						<h4 class="text-sm font-medium mb-1">Example Data Sources</h4>
						<ul class="text-sm text-muted-foreground space-y-1">
							<li>• CCL test data from ccl-test-data repository</li>
							<li>• Custom test suites in the same format</li>
							<li>• Generated test data from other CCL implementations</li>
						</ul>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>