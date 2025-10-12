<script lang="ts">
import {
	Database,
	Download,
	FileText,
	Github,
	HardDrive,
	Layers,
	RefreshCw,
	ToggleLeft,
	ToggleRight,
	Trash2,
	Upload,
} from "@lucide/svelte";
import { onMount } from "svelte";
import DataCollectionManager from "$lib/components/DataCollectionManager.svelte";
import GitHubRepositoryBrowser from "$lib/components/GitHubRepositoryBrowser.svelte";
import GitHubUrlInput from "$lib/components/GitHubUrlInput.svelte";
import MultiFileUpload from "$lib/components/MultiFileUpload.svelte";
import TauriFileUpload from "$lib/components/TauriFileUpload.svelte";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import {
	isTauriEnvironment,
	type TauriFileResult,
} from "$lib/services/tauriFileService.js";
import type { DataSource } from "$lib/stores/dataSource.js";
import { dataSourceManager } from "$lib/stores/dataSourceManager.svelte.js";
import { tauriDataSourceManager } from "$lib/stores/tauriDataSourceManager.svelte.js";

interface UploadedFile {
	file: File;
	id: string;
	status: "pending" | "processing" | "success" | "error";
	error?: string;
	preview?: string;
}

// Initialize data source manager on component mount (upload-only mode)
onMount(async () => {
	await dataSourceManager.initializeEmpty();

	// Detect Tauri environment
	isDesktopApp = isTauriEnvironment();
});

// Handle successful file uploads - now using data source manager
async function handleFilesUploaded(files: UploadedFile[]) {
	const successfulFiles = files.filter((f) => f.status === "success");

	if (successfulFiles.length > 0) {
		const fileObjects = successfulFiles.map((f) => f.file);
		const results = await dataSourceManager.processUploadedFiles(fileObjects);
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

// Handle GitHub repository loading
async function handleGitHubRepositoryLoad(repositoryData: {
	files: { name: string; content: any; url: string }[];
	repository: { owner: string; repo: string; branch?: string; path?: string };
	metadata: any;
}) {
	const result =
		await dataSourceManager.processGitHubRepository(repositoryData);
}

// Handle source added from GitHub browser
function handleSourceAdded(_source: DataSource) {}

// Handle Tauri file uploads
async function handleTauriFilesLoaded(files: TauriFileResult[]) {
	if (files.length === 0) {
		return;
	}

	try {
		// Create local data source from Tauri files
		const localSource =
			await tauriDataSourceManager.createLocalSourceFromFiles(files);

		// Process files through the main data source manager for UI integration
		const fileObjects = files.map(
			(file) =>
				({
					name: file.name,
					type: "application/json" as const,
					size: file.size,
					text: async () => file.content,
					lastModified: Date.now(),
					webkitRelativePath: "",
					arrayBuffer: async () => new ArrayBuffer(0),
					stream: () => new ReadableStream(),
					slice: () => new Blob(),
				}) as File,
		);

		await dataSourceManager.processUploadedFiles(fileObjects);
	} catch (error) {}
}

// Handle Tauri file upload errors
function handleTauriError(_error: string) {}

// Tab state management
let activeTab = $state("upload");

// Tauri environment detection
let isDesktopApp = $state(false);

// Load built-in data state
let loadMessage = $state<string | null>(null);

// Clear tests state
let clearMessage = $state<string | null>(null);

// Handle loading built-in data
async function handleLoadBuiltInData() {
	const result = await dataSourceManager.loadBuiltInData();
	loadMessage = result.message;

	// Clear message after 3 seconds
	setTimeout(() => {
		loadMessage = null;
	}, 3000);
}

// Handle clearing all test data
function handleClearAllData() {
	dataSourceManager.clearAllData();
	clearMessage = "All test data cleared successfully";

	// Clear message after 3 seconds
	setTimeout(() => {
		clearMessage = null;
	}, 3000);
}

// Data source summaries for display
const sourceSummaries = $derived(dataSourceManager.sourceSummaries);
const mergedStats = $derived(dataSourceManager.mergedStats);
const isProcessing = $derived(dataSourceManager.isProcessing);
const hasUploadedSources = $derived(
	dataSourceManager.getSourcesByType("uploaded").length > 0,
);
const hasGitHubSources = $derived(
	dataSourceManager.getSourcesByType("github").length > 0,
);
const hasImportedSources = $derived(hasUploadedSources || hasGitHubSources);
const hasStaticData = $derived(dataSourceManager.hasStaticData);
</script>

<svelte:head>
	<title>Data Source Management - CCL Test Suite Viewer</title>
	<meta name="description" content="Manage all your CCL test data sources including built-in data, uploaded files, and GitHub repositories. Toggle sources on/off and remove them as needed." />
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-6">
	<!-- Page Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Data Source Management</h1>
		<p class="text-muted-foreground">
			Manage all your test data sources including built-in data, uploaded files, and GitHub repositories.
			Each source can be toggled on/off and removed as needed.
		</p>
	</div>

	<!-- Data Sources Management -->
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<CardTitle class="flex items-center gap-2">
					<Layers size={20} />
					Current Data Sources
				</CardTitle>
				<div class="flex items-center gap-2">
					{#if loadMessage}
						<div class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
							{loadMessage}
						</div>
					{/if}
					{#if clearMessage}
						<div class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
							{clearMessage}
						</div>
					{/if}
					<Button
						variant="outline"
						size="sm"
						onclick={handleLoadBuiltInData}
						disabled={isProcessing}
						class="flex items-center gap-2"
						title={hasStaticData ? "Built-in data is already loaded" : "Load all built-in test data files"}
					>
						<Download class="h-4 w-4" />
						Load Built-in Data
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={handleClearAllData}
						disabled={isProcessing}
						class="flex items-center gap-2 text-destructive hover:text-destructive/80"
						title="Clear all test data and reset to empty state"
					>
						<RefreshCw class="h-4 w-4" />
						Clear All
					</Button>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			{#if sourceSummaries.length === 0}
				<!-- Empty state -->
				<div class="text-center py-8 space-y-4">
					<div class="text-muted-foreground">
						<Database size={48} class="mx-auto mb-4 opacity-50" />
						<p class="text-lg font-medium">No Data Sources</p>
						<p class="text-sm">Load built-in data or add new sources to get started</p>
					</div>
				</div>
			{:else}
				<!-- Data sources list -->
				<div class="space-y-3">
					{#each sourceSummaries as source (source.id)}
						<div class="flex items-center justify-between p-4 border rounded-lg bg-card">
							<div class="flex items-center gap-3">
								<button
									onclick={() => toggleDataSource(source.id)}
									class="text-muted-foreground hover:text-foreground transition-colors"
									aria-label={source.active ? "Deactivate source" : "Activate source"}
								>
									{#if source.active}
										<ToggleRight size={20} class="text-blue-600" />
									{:else}
										<ToggleLeft size={20} />
									{/if}
								</button>

								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-medium truncate">{source.name}</span>
										<Badge
											variant={source.type === 'static' ? 'default' : source.type === 'github' ? 'destructive' : 'secondary'}
											class="flex-shrink-0"
										>
											{source.type === 'static' ? 'Built-in' : source.type === 'github' ? 'GitHub' : 'Uploaded'}
										</Badge>
										{#if !source.active}
											<Badge variant="outline" class="text-xs flex-shrink-0">inactive</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-4 text-xs text-muted-foreground">
										<span class="flex items-center gap-1">
											<FileText size={12} />
											{source.testCount} tests
										</span>
										<span class="flex items-center gap-1">
											<Layers size={12} />
											{source.categoryCount} categories
										</span>
										<span class="flex items-center gap-1">
											<Database size={12} />
											{source.type === 'static' ? 'Built-in' : `Added ${source.uploadedAt.toLocaleDateString()}`}
										</span>
									</div>
									{#if source.metadata}
										<div class="text-xs text-muted-foreground mt-1">
											{#if source.type === 'github' && source.metadata.githubRepo}
												<span class="flex items-center gap-1">
													<Github size={12} />
													{source.metadata.githubRepo}
													{#if source.metadata.githubBranch}
														on {source.metadata.githubBranch}
													{/if}
												</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>

							{#if source.type !== 'static'}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeDataSource(source.id)}
									class="text-destructive hover:text-destructive/80 hover:bg-destructive/10 ml-2"
									aria-label="Remove data source"
									title="Remove this data source"
								>
									<Trash2 size={14} />
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

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
						<div class="text-2xl font-bold text-blue-600">{mergedStats.totalTests}</div>
						<div class="text-sm text-muted-foreground">Total Tests</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{mergedStats.totalAssertions}</div>
						<div class="text-sm text-muted-foreground">Total Assertions</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{mergedStats.totalCategories}</div>
						<div class="text-sm text-muted-foreground">Categories</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{mergedStats.activeSources}</div>
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
					{#if hasImportedSources}
						<Button variant="outline" size="sm" onclick={() => dataSourceManager.clearAllImportedSources()} class="text-destructive hover:text-destructive/80">
							Clear All Imported Data
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Add New Data Sources -->
	<div class="space-y-6">
		<!-- Tab Navigation -->
		<div class="border-b border-border">
			<div class="flex items-center gap-2 pb-2">
				<h2 class="text-lg font-semibold">Add New Data Sources</h2>
			</div>
			<div class="flex items-center gap-2 mb-4">
				<Button
					variant={activeTab === 'upload' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => activeTab = 'upload'}
					class="flex items-center gap-2"
				>
					<Upload class="h-4 w-4" />
					{isDesktopApp ? 'Native File Upload' : 'File Upload'}
				</Button>
				<Button
					variant={activeTab === 'github-url' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => activeTab = 'github-url'}
					class="flex items-center gap-2"
				>
					<Github class="h-4 w-4" />
					GitHub URL
				</Button>
				<Button
					variant={activeTab === 'github-browse' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => activeTab = 'github-browse'}
					class="flex items-center gap-2"
				>
					<FileText class="h-4 w-4" />
					Browse Repositories
				</Button>
				{#if isDesktopApp}
					<Button
						variant={activeTab === 'collections' ? 'default' : 'ghost'}
						size="sm"
						onclick={() => activeTab = 'collections'}
						class="flex items-center gap-2"
					>
						<HardDrive class="h-4 w-4" />
						Collections
					</Button>
				{/if}
			</div>
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'upload'}
			{#if isDesktopApp}
				<TauriFileUpload
					onFilesLoaded={handleTauriFilesLoaded}
					onError={handleTauriError}
					maxFiles={10}
				/>
			{:else}
				<MultiFileUpload onFilesUploaded={handleFilesUploaded} maxFiles={10} />
			{/if}
		{:else if activeTab === 'github-url'}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Github class="h-5 w-5" />
						Load from GitHub URL
					</CardTitle>
				</CardHeader>
				<CardContent>
					<GitHubUrlInput onLoad={handleGitHubRepositoryLoad} disabled={isProcessing} />
				</CardContent>
			</Card>
		{:else if activeTab === 'github-browse'}
			<GitHubRepositoryBrowser onSourceAdded={handleSourceAdded} />
		{:else if activeTab === 'collections' && isDesktopApp}
			<DataCollectionManager />
		{/if}
	</div>



</div>