<script lang="ts">
import {
	AlertCircle,
	CheckCircle,
	FileText,
	FolderOpen,
	Github,
	LoaderCircle,
} from "@lucide/svelte";
import { Badge, Button, Input } from "$lib/components/ui/index.js";
import {
	GitHubAPIError,
	type GitHubRepository,
	githubLoader,
} from "$lib/services/githubLoader";

interface Props {
	onLoad?: (data: {
		files: { name: string; content: any; url: string }[];
		repository: GitHubRepository;
		metadata: any;
	}) => void;
	disabled?: boolean;
}

let { onLoad, disabled = false }: Props = $props();

// Component state
let url = $state("");
let isLoading = $state(false);
let error = $state<string | null>(null);
let validationResult = $state<{
	valid: boolean;
	error?: string;
	repository?: GitHubRepository;
} | null>(null);
let repositoryInfo = $state<{
	repository: GitHubRepository;
	fileCount: number;
	files: any[];
} | null>(null);
let successMessage = $state<string | null>(null);

// URL validation - runs on every change
let urlValidation = $derived(() => {
	if (!url.trim()) {
		return null;
	}
	return githubLoader.validateGitHubUrl(url);
});

// Reset states when URL changes
$effect(() => {
	url; // Track URL changes
	error = null;
	repositoryInfo = null;
	successMessage = null;
});

// Preview repository info
async function previewRepository() {
	if (!urlValidation()?.valid) {
		return;
	}

	isLoading = true;
	error = null;
	repositoryInfo = null;

	try {
		const info = await githubLoader.getRepositoryInfo(url);
		repositoryInfo = info;
	} catch (err) {
		if (err instanceof GitHubAPIError) {
			error = err.message;
		} else {
			error = "Failed to load repository information";
		}
	} finally {
		isLoading = false;
	}
}

// Load repository data
async function loadRepository() {
	if (!(urlValidation()?.valid && repositoryInfo)) {
		return;
	}

	isLoading = true;
	error = null;
	successMessage = null;

	try {
		const result = await githubLoader.loadRepositoryData(url);

		if (result.files.length === 0) {
			error = "No JSON files found in the repository path";
			return;
		}

		successMessage = `Successfully loaded ${result.files.length} JSON files from ${repositoryInfo.repository.owner}/${repositoryInfo.repository.repo}`;

		// Call the callback with loaded data
		onLoad?.(result);

		// Reset form
		url = "";
		repositoryInfo = null;
	} catch (err) {
		if (err instanceof GitHubAPIError) {
			error = err.message;
		} else {
			error = "Failed to load repository data";
		}
	} finally {
		isLoading = false;
	}
}

// Example URLs for user guidance
const exampleUrls = [
	"https://github.com/owner/repo/tree/main/tests",
	"https://github.com/owner/repo/tree/main/data/tests.json",
	"https://api.github.com/repos/owner/repo/contents/tests",
	"https://raw.githubusercontent.com/owner/repo/main/tests/file.json",
];
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<label for="github-url" class="flex items-center gap-2 text-sm font-medium">
			<Github class="h-4 w-4" />
			GitHub Repository URL
		</label>

		<div class="space-y-2">
			<Input
				id="github-url"
				type="url"
				placeholder="https://github.com/owner/repo/tree/main/tests"
				bind:value={url}
				{disabled}
				class="font-mono text-sm"
			/>

			<!-- URL Validation Feedback -->
			{#if url.trim() && urlValidation()}
				{#if urlValidation().valid}
					<div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
						<CheckCircle class="h-4 w-4" />
						Valid GitHub URL detected
					</div>
				{:else}
					<div class="flex items-center gap-2 text-sm text-destructive">
						<AlertCircle class="h-4 w-4" />
						{urlValidation().error}
					</div>
				{/if}
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={previewRepository}
				disabled={!urlValidation()?.valid || isLoading || disabled}
			>
				{#if isLoading}
					<LoaderCircle class="h-4 w-4 animate-spin mr-2" />
				{:else}
					<FolderOpen class="h-4 w-4 mr-2" />
				{/if}
				Preview Repository
			</Button>

			{#if repositoryInfo}
				<Button
					size="sm"
					onclick={loadRepository}
					disabled={isLoading || disabled || repositoryInfo.fileCount === 0}
				>
					{#if isLoading}
						<LoaderCircle class="h-4 w-4 animate-spin mr-2" />
					{:else}
						<FileText class="h-4 w-4 mr-2" />
					{/if}
					Load {repositoryInfo.fileCount} JSON Files
				</Button>
			{/if}
		</div>
	</div>

	<!-- Repository Information -->
	{#if repositoryInfo}
		<div class="rounded-lg border p-4 bg-muted/50">
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h4 class="font-medium flex items-center gap-2">
						<Github class="h-4 w-4" />
						{repositoryInfo.repository.owner}/{repositoryInfo.repository.repo}
					</h4>
					<Badge variant="secondary">
						{repositoryInfo.fileCount} JSON files
					</Badge>
				</div>

				{#if repositoryInfo.repository.branch}
					<div class="text-sm text-muted-foreground">
						Branch: <code class="px-1 py-0.5 bg-muted rounded text-xs">{repositoryInfo.repository.branch}</code>
					</div>
				{/if}

				{#if repositoryInfo.repository.path}
					<div class="text-sm text-muted-foreground">
						Path: <code class="px-1 py-0.5 bg-muted rounded text-xs">{repositoryInfo.repository.path}</code>
					</div>
				{/if}

				{#if repositoryInfo.files.length > 0}
					<div class="space-y-2">
						<div class="text-sm font-medium">JSON Files Found:</div>
						<div class="grid gap-1 max-h-32 overflow-y-auto">
							{#each repositoryInfo.files.slice(0, 10) as file}
								<div class="text-xs font-mono px-2 py-1 bg-muted rounded flex items-center gap-2">
									<FileText class="h-3 w-3" />
									{file.name}
									<Badge variant="outline" class="text-xs">
										{(file.size / 1024).toFixed(1)}KB
									</Badge>
								</div>
							{/each}
							{#if repositoryInfo.files.length > 10}
								<div class="text-xs text-muted-foreground px-2">
									... and {repositoryInfo.files.length - 10} more files
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
						<AlertCircle class="h-4 w-4" />
						No JSON files found in this repository path.
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<div class="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-2 text-sm text-destructive">
			<AlertCircle class="h-4 w-4" />
			{error}
		</div>
	{/if}

	<!-- Success Message -->
	{#if successMessage}
		<div class="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
			<CheckCircle class="h-4 w-4" />
			{successMessage}
		</div>
	{/if}

	<!-- Help Section -->
	<div class="space-y-2">
		<div class="text-sm font-medium">Supported URL Formats:</div>
		<div class="space-y-1">
			{#each exampleUrls as exampleUrl}
				<button
					type="button"
					class="block w-full text-left text-xs font-mono px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
					onclick={() => { url = exampleUrl; }}
					disabled={disabled}
				>
					{exampleUrl}
				</button>
			{/each}
		</div>
		<div class="text-xs text-muted-foreground">
			Supports repository folders, API endpoints, and raw file URLs. Click any example to use it.
		</div>
	</div>
</div>