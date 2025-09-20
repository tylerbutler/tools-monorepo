<script lang="ts">
import MultiFileUpload from "$lib/components/MultiFileUpload.svelte";
import Button from "$lib/components/ui/button.svelte";
import Badge from "$lib/components/ui/badge.svelte";
import Card from "$lib/components/ui/card.svelte";
import CardContent from "$lib/components/ui/card-content.svelte";
import CardHeader from "$lib/components/ui/card-header.svelte";
import CardTitle from "$lib/components/ui/card-title.svelte";
import { Upload, FileText, Database } from "lucide-svelte";

interface UploadedFile {
	file: File;
	id: string;
	status: 'pending' | 'processing' | 'success' | 'error';
	error?: string;
	preview?: string;
}

// State for uploaded files and processing
let uploadedFiles = $state<UploadedFile[]>([]);
let processedData = $state<any[]>([]);

// Handle successful file uploads
function handleFilesUploaded(files: UploadedFile[]) {
	uploadedFiles = [...uploadedFiles, ...files];

	// Process the data from successful files
	processUploadedData(files);
}

// Process uploaded JSON data
async function processUploadedData(files: UploadedFile[]) {
	const allData: any[] = [];

	for (const uploadedFile of files) {
		if (uploadedFile.status === 'success') {
			try {
				const text = await uploadedFile.file.text();
				const jsonData = JSON.parse(text);
				allData.push(...jsonData);
			} catch (error) {
				console.error('Error processing file:', uploadedFile.file.name, error);
			}
		}
	}

	processedData = allData;
}

// Clear all uploaded data
function clearAllData() {
	uploadedFiles = [];
	processedData = [];
}

// Get total test count
const totalTests = $derived(processedData.length);

// Get total assertion count
const totalAssertions = $derived(
	processedData.reduce((sum, test) => sum + (test.expected?.count || 0), 0)
);

// Get unique functions
const uniqueFunctions = $derived(
	new Set(processedData.flatMap(test => test.functions || [])).size
);

// Get unique features
const uniqueFeatures = $derived(
	new Set(processedData.flatMap(test => test.features || [])).size
);
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

	<!-- Data Summary -->
	{#if uploadedFiles.length > 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Database size={20} />
					Uploaded Data Summary
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{totalTests}</div>
						<div class="text-sm text-muted-foreground">Total Tests</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{totalAssertions}</div>
						<div class="text-sm text-muted-foreground">Total Assertions</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{uniqueFunctions}</div>
						<div class="text-sm text-muted-foreground">Functions</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{uniqueFeatures}</div>
						<div class="text-sm text-muted-foreground">Features</div>
					</div>
				</div>

				{#if uploadedFiles.length > 0}
					<div class="mt-6 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<FileText size={16} />
							<span class="text-sm text-muted-foreground">
								{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
							</span>
						</div>
						<Button variant="outline" size="sm" onclick={clearAllData}>
							Clear All Data
						</Button>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<!-- Next Steps -->
	{#if processedData.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>What's Next?</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Your test data has been uploaded successfully. Currently, this demonstrates
					the upload functionality. In Phase 2, you'll be able to:
				</p>

				<ul class="text-sm space-y-1 ml-4">
					<li class="flex items-center gap-2">
						<div class="w-1 h-1 bg-muted-foreground rounded-full"></div>
						Browse and filter your uploaded test data
					</li>
					<li class="flex items-center gap-2">
						<div class="w-1 h-1 bg-muted-foreground rounded-full"></div>
						Combine uploaded data with static test data
					</li>
					<li class="flex items-center gap-2">
						<div class="w-1 h-1 bg-muted-foreground rounded-full"></div>
						Switch between different data sources
					</li>
					<li class="flex items-center gap-2">
						<div class="w-1 h-1 bg-muted-foreground rounded-full"></div>
						Load test data directly from GitHub URLs
					</li>
				</ul>

				<div class="pt-4">
					<Badge variant="secondary" class="text-xs">
						Phase 1 Complete: Multi-file Upload
					</Badge>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Getting Started Guide -->
	{#if uploadedFiles.length === 0}
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