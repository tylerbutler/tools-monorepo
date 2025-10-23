<script lang="ts">
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Download,
	ExternalLink,
	FileText,
	FolderOpen,
	Github,
	RefreshCw,
} from "@lucide/svelte";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import type { DataSource } from "$lib/stores/dataSource.js";
import { dataSourceManager } from "$lib/stores/dataSourceManager.svelte.js";

interface Props {
	onSourceAdded?: (source: DataSource) => void;
}

let { onSourceAdded }: Props = $props();

// State management
let activeTab = $state("browser");
let refreshing = $state(false);

// Get GitHub sources from data source manager
let githubSources = $derived(dataSourceManager.getSourcesByType("github"));

// Popular repositories with CCL test data (examples for users)
const popularRepositories = [
	{
		url: "https://github.com/tylerbutler/ccl-test-data",
		name: "CCL Test Data",
		description: "Official CCL test suite",
		owner: "tylerbutler",
		repo: "ccl-test-data",
		estimatedFiles: 10,
	},
	{
		url: "https://github.com/example/config-tests",
		name: "Example Config Tests",
		description: "Example configuration test cases",
		owner: "example",
		repo: "config-tests",
		estimatedFiles: 5,
	},
];

// Refresh GitHub sources (re-fetch from GitHub)
async function refreshGitHubSource(source: DataSource) {
	if (!source.url) {
		return;
	}

	refreshing = true;
	try {
		// Re-import from the same URL
		const { githubLoader } = await import("$lib/services/githubLoader");
		const repositoryData = await githubLoader.loadRepositoryData(source.url);

		// Remove old source and add updated one
		dataSourceManager.removeSource(source.id);
		const result =
			await dataSourceManager.processGitHubRepository(repositoryData);

		if (result.success && result.dataSource) {
			onSourceAdded?.(result.dataSource);
		}
	} catch (error) {
		// Error handling for GitHub source refresh
	} finally {
		refreshing = false;
	}
}

// Load popular repository
async function loadPopularRepository(repo: (typeof popularRepositories)[0]) {
	try {
		const { githubLoader } = await import("$lib/services/githubLoader");
		const repositoryData = await githubLoader.loadRepositoryData(repo.url);
		const result =
			await dataSourceManager.processGitHubRepository(repositoryData);

		if (result.success && result.dataSource) {
			onSourceAdded?.(result.dataSource);
			// Switch to loaded sources tab
			activeTab = "loaded";
		}
	} catch (error) {
		// Error handling for popular repository loading
	}
}

// Format date for display
function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

// Format repository metadata
function getRepositoryDisplayName(source: DataSource): string {
	if (source.metadata?.githubRepo) {
		const branch =
			source.metadata.githubBranch !== "main"
				? `@${source.metadata.githubBranch}`
				: "";
		return `${source.metadata.githubRepo}${branch}`;
	}
	return source.name;
}
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<h3 class="text-lg font-semibold flex items-center gap-2">
			<Github class="h-5 w-5" />
			GitHub Repository Browser
		</h3>
		<p class="text-sm text-muted-foreground">
			Browse and manage test data from GitHub repositories
		</p>
	</div>

	<!-- Tab Navigation -->
	<div class="flex items-center gap-2 border-b border-border pb-2">
		<Button
			variant={activeTab === 'browser' ? 'default' : 'ghost'}
			size="sm"
			onclick={() => activeTab = 'browser'}
			class="flex items-center gap-2"
		>
			<FolderOpen class="h-4 w-4" />
			Browse Popular
		</Button>
		<Button
			variant={activeTab === 'loaded' ? 'default' : 'ghost'}
			size="sm"
			onclick={() => activeTab = 'loaded'}
			class="flex items-center gap-2"
		>
			<FileText class="h-4 w-4" />
			Loaded Sources ({githubSources.length})
		</Button>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'browser'}
			<div class="space-y-4">
				<div class="text-sm text-muted-foreground">
					Quick access to popular repositories with CCL test data
				</div>

				<div class="grid gap-4">
					{#each popularRepositories as repo}
						<Card class="hover:bg-muted/30 transition-colors">
							<CardHeader class="pb-3">
								<div class="flex items-start justify-between">
									<div class="space-y-1">
										<CardTitle class="text-base flex items-center gap-2">
											<Github class="h-4 w-4" />
											{repo.name}
										</CardTitle>
										<CardDescription>{repo.description}</CardDescription>
									</div>
									<Badge variant="secondary">
										~{repo.estimatedFiles} files
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div class="space-y-3">
									<div class="flex items-center gap-2 text-sm text-muted-foreground font-mono">
										<ExternalLink class="h-3 w-3" />
										{repo.owner}/{repo.repo}
									</div>

									<div class="flex gap-2">
										<Button
											size="sm"
											onclick={() => loadPopularRepository(repo)}
											disabled={dataSourceManager.isProcessing}
											class="flex items-center gap-2"
										>
											<Download class="h-4 w-4" />
											Load Repository
										</Button>
										<Button
											variant="outline"
											size="sm"
											onclick={() => window.open(repo.url, '_blank')}
											class="flex items-center gap-2"
										>
											<ExternalLink class="h-4 w-4" />
											View on GitHub
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>

				{#if dataSourceManager.isProcessing}
					<div class="bg-info/10 border border-info/20 rounded-md p-3 flex items-center gap-2 text-sm text-info">
						<RefreshCw class="h-4 w-4 animate-spin" />
						Loading repository data...
					</div>
				{/if}
			</div>
	{:else if activeTab === 'loaded'}
			{#if githubSources.length === 0}
				<div class="text-center py-8 space-y-3">
					<Github class="h-12 w-12 mx-auto text-muted-foreground" />
					<div class="space-y-1">
						<h4 class="font-medium">No GitHub sources loaded</h4>
						<p class="text-sm text-muted-foreground">
							Load repositories from the Browse tab or using the GitHub URL input
						</p>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="text-sm text-muted-foreground">
						Manage your loaded GitHub data sources
					</div>

					<div class="space-y-3">
						{#each githubSources as source}
							<Card class="relative">
								<CardHeader class="pb-3">
									<div class="flex items-start justify-between">
										<div class="space-y-1 flex-1 min-w-0">
											<CardTitle class="text-base flex items-center gap-2">
												<Github class="h-4 w-4 flex-shrink-0" />
												<span class="truncate">{getRepositoryDisplayName(source)}</span>
											</CardTitle>
											<CardDescription class="flex items-center gap-4 text-xs">
												<span class="flex items-center gap-1">
													<FileText class="h-3 w-3" />
													{source.stats.totalTests} tests
												</span>
												<span class="flex items-center gap-1">
													<FolderOpen class="h-3 w-3" />
													{source.categories.length} categories
												</span>
												<span class="flex items-center gap-1">
													<Clock class="h-3 w-3" />
													{formatDate(source.uploadedAt)}
												</span>
											</CardDescription>
										</div>

										<div class="flex items-center gap-2 flex-shrink-0">
											<Badge variant={source.active ? 'default' : 'secondary'}>
												{source.active ? 'Active' : 'Inactive'}
											</Badge>
										</div>
									</div>
								</CardHeader>

								<CardContent>
									<div class="space-y-3">
										{#if source.url}
											<div class="flex items-center gap-2 text-xs text-muted-foreground font-mono">
												<ExternalLink class="h-3 w-3" />
												<span class="truncate">{source.url}</span>
											</div>
										{/if}

										<div class="border-t border-border my-3"></div>

										<div class="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onclick={() => dataSourceManager.toggleSource(source.id)}
												class="flex items-center gap-2"
											>
												{#if source.active}
													<AlertCircle class="h-4 w-4" />
													Deactivate
												{:else}
													<CheckCircle class="h-4 w-4" />
													Activate
												{/if}
											</Button>

											<Button
												variant="outline"
												size="sm"
												onclick={() => refreshGitHubSource(source)}
												disabled={refreshing}
												class="flex items-center gap-2"
											>
												<RefreshCw class={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
												Refresh
											</Button>

											<Button
												variant="outline"
												size="sm"
												onclick={() => window.open(source.url, '_blank')}
												class="flex items-center gap-2"
											>
												<ExternalLink class="h-4 w-4" />
												View Source
											</Button>

											<Button
												variant="destructive"
												size="sm"
												onclick={() => dataSourceManager.removeSource(source.id)}
												class="ml-auto"
											>
												Remove
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						{/each}
					</div>

					{#if githubSources.length > 1}
						<div class="border-t border-border my-3"></div>
						<div class="flex justify-end">
							<Button
								variant="outline"
								onclick={() => {
									githubSources.forEach(source => dataSourceManager.removeSource(source.id));
								}}
							>
								Clear All GitHub Sources
							</Button>
						</div>
					{/if}
				</div>
			{/if}
	{/if}
</div>