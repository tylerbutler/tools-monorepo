<!--
  Data Collection Import/Export Manager
  Handles import/export of data source collections in desktop app
-->
<script lang="ts">
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Download,
	FileText,
	HardDrive,
	Package,
	Trash2,
	Upload,
} from "@lucide/svelte";
import { onMount } from "svelte";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { isTauriEnvironment } from "@/services/tauriFileService";
import { offlineManager } from "@/stores/offlineManager.svelte";
import { tauriDataSourceManager } from "@/stores/tauriDataSourceManager.svelte";

// State
let isDesktopApp = $state(false);
let isImporting = $state(false);
let isExporting = $state(false);
let importProgress = $state(0);
let exportProgress = $state(0);
let lastOperation = $state<string | null>(null);
let operationError = $state<string | null>(null);
let operationSuccess = $state<string | null>(null);

// Check environment on mount
onMount(() => {
	isDesktopApp = isTauriEnvironment();
});

/**
 * Handle export of all data sources
 */
async function handleExportCollection() {
	if (!isDesktopApp) {
		operationError = "Export only available in desktop app";
		return;
	}

	isExporting = true;
	exportProgress = 0;
	operationError = null;
	operationSuccess = null;

	try {
		// Simulate progress for user feedback
		const progressInterval = setInterval(() => {
			if (exportProgress < 90) {
				exportProgress += 10;
			}
		}, 100);

		// Get timestamp for filename
		const timestamp = new Date().toISOString().split("T")[0];
		const filename = `ccl-data-collection-${timestamp}.json`;

		await tauriDataSourceManager.exportAllSources(filename);

		clearInterval(progressInterval);
		exportProgress = 100;

		operationSuccess = `Data collection exported successfully to ${filename}`;
		lastOperation = `Export completed at ${new Date().toLocaleTimeString()}`;
	} catch (error) {
		operationError = error instanceof Error ? error.message : "Export failed";
	} finally {
		isExporting = false;
		setTimeout(() => {
			exportProgress = 0;
		}, 2000);
	}
}

/**
 * Handle import of data collection
 */
async function handleImportCollection() {
	if (!isDesktopApp) {
		operationError = "Import only available in desktop app";
		return;
	}

	isImporting = true;
	importProgress = 0;
	operationError = null;
	operationSuccess = null;

	try {
		// Simulate progress for user feedback
		const progressInterval = setInterval(() => {
			if (importProgress < 80) {
				importProgress += 15;
			}
		}, 150);

		const importedSources =
			await tauriDataSourceManager.importSourceCollection();

		clearInterval(progressInterval);
		importProgress = 100;

		if (importedSources.length > 0) {
			operationSuccess = `Successfully imported ${importedSources.length} data source${importedSources.length === 1 ? "" : "s"}`;
			lastOperation = `Import completed at ${new Date().toLocaleTimeString()}`;

			// Cache imported data for offline use
			if (offlineManager.autoCache) {
				await offlineManager.cacheCurrentData();
			}
		} else {
			operationError = "No data sources found in selected file";
		}
	} catch (error) {
		operationError = error instanceof Error ? error.message : "Import failed";
	} finally {
		isImporting = false;
		setTimeout(() => {
			importProgress = 0;
		}, 2000);
	}
}

/**
 * Clear all local data sources
 */
async function handleClearAllData() {
	if (!isDesktopApp) {
		operationError = "Clear data only available in desktop app";
		return;
	}

	try {
		await tauriDataSourceManager.clearAllLocalSources();
		operationSuccess = "All local data sources cleared";
		lastOperation = `Data cleared at ${new Date().toLocaleTimeString()}`;
	} catch (error) {
		operationError =
			error instanceof Error ? error.message : "Failed to clear data";
	}
}

/**
 * Clear operation messages
 */
function clearMessages() {
	operationError = null;
	operationSuccess = null;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) {
		return "0 Bytes";
	}
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

// Reactive values
const storageStats = $derived(tauriDataSourceManager.storageStats);
const offlineStats = $derived(offlineManager.stats);
</script>

<!-- Data Collection Manager -->
{#if isDesktopApp}
	<Card class="w-full">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Package size={20} />
				Data Collection Manager
			</CardTitle>
		</CardHeader>

		<CardContent class="space-y-6">
			<!-- Current Storage Stats -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-muted/50 p-4 rounded-lg">
					<div class="flex items-center gap-2 text-sm font-medium mb-1">
						<FileText size={16} />
						Local Sources
					</div>
					<div class="text-2xl font-bold">{storageStats.sourceCount}</div>
					<div class="text-xs text-muted-foreground">
						{storageStats.totalFiles} files total
					</div>
				</div>

				<div class="bg-muted/50 p-4 rounded-lg">
					<div class="flex items-center gap-2 text-sm font-medium mb-1">
						<HardDrive size={16} />
						Storage Used
					</div>
					<div class="text-2xl font-bold">{formatFileSize(storageStats.totalSize)}</div>
					<div class="text-xs text-muted-foreground">
						{offlineStats.cachedDataSources} cached sources
					</div>
				</div>

				<div class="bg-muted/50 p-4 rounded-lg">
					<div class="flex items-center gap-2 text-sm font-medium mb-1">
						<Clock size={16} />
						Last Sync
					</div>
					<div class="text-lg font-bold">
						{storageStats.lastSync ?
							storageStats.lastSync.toLocaleTimeString() :
							'Never'
						}
					</div>
					<div class="text-xs text-muted-foreground">
						{offlineStats.isOnline ? 'Online' : 'Offline'}
					</div>
				</div>
			</div>

			<!-- Import/Export Controls -->
			<div class="space-y-4">
				<h4 class="text-sm font-medium">Collection Operations</h4>

				<div class="flex flex-col sm:flex-row gap-3">
					<!-- Export Button -->
					<Button
						onclick={handleExportCollection}
						disabled={isExporting || isImporting || storageStats.sourceCount === 0}
						class="flex items-center gap-2"
					>
						<Download size={16} />
						{isExporting ? 'Exporting...' : 'Export Collection'}
					</Button>

					<!-- Import Button -->
					<Button
						variant="outline"
						onclick={handleImportCollection}
						disabled={isImporting || isExporting}
						class="flex items-center gap-2"
					>
						<Upload size={16} />
						{isImporting ? 'Importing...' : 'Import Collection'}
					</Button>

					<!-- Clear Data Button -->
					<Button
						variant="destructive"
						onclick={handleClearAllData}
						disabled={isImporting || isExporting || storageStats.sourceCount === 0}
						class="flex items-center gap-2"
					>
						<Trash2 size={16} />
						Clear All Data
					</Button>
				</div>
			</div>

			<!-- Progress Indicators -->
			{#if isExporting && exportProgress > 0}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Exporting data collection...</span>
						<span>{Math.round(exportProgress)}%</span>
					</div>
					<Progress value={exportProgress} class="w-full" />
				</div>
			{/if}

			{#if isImporting && importProgress > 0}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Importing data collection...</span>
						<span>{Math.round(importProgress)}%</span>
					</div>
					<Progress value={importProgress} class="w-full" />
				</div>
			{/if}

			<!-- Success Message -->
			{#if operationSuccess}
				<Alert>
					<CheckCircle size={16} />
					<AlertDescription>
						{operationSuccess}
						<Button
							variant="ghost"
							size="sm"
							onclick={clearMessages}
							class="ml-2 h-auto p-1 text-xs"
						>
							Dismiss
						</Button>
					</AlertDescription>
				</Alert>
			{/if}

			<!-- Error Message -->
			{#if operationError}
				<Alert variant="destructive">
					<AlertCircle size={16} />
					<AlertDescription>
						{operationError}
						<Button
							variant="ghost"
							size="sm"
							onclick={clearMessages}
							class="ml-2 h-auto p-1 text-xs"
						>
							Dismiss
						</Button>
					</AlertDescription>
				</Alert>
			{/if}

			<!-- Last Operation Info -->
			{#if lastOperation}
				<div class="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
					<strong>Last Operation:</strong> {lastOperation}
				</div>
			{/if}

			<!-- Feature Information -->
			<div class="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
				<div class="flex items-center gap-2 mb-2">
					<Package size={12} />
					<strong>Collection Features:</strong>
				</div>
				<ul class="list-disc list-inside space-y-1 ml-4">
					<li>Export all data sources as a single collection file</li>
					<li>Import collections from other CCL Test Viewer instances</li>
					<li>Automatic offline caching of imported data</li>
					<li>Persistent local storage for desktop sessions</li>
				</ul>
			</div>

			<!-- Offline Mode Status -->
			{#if offlineStats.offlineCapable}
				<div class="border rounded-lg p-4">
					<div class="flex items-center justify-between mb-3">
						<h5 class="text-sm font-medium flex items-center gap-2">
							<HardDrive size={16} />
							Offline Mode Status
						</h5>
						<Badge variant={offlineStats.isOnline ? "default" : "secondary"}>
							{offlineStats.isOnline ? "Online" : "Offline"}
						</Badge>
					</div>

					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-muted-foreground">Cached Sources:</span>
							<span class="font-medium ml-2">{offlineStats.cachedDataSources}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Cache Size:</span>
							<span class="font-medium ml-2">{formatFileSize(offlineStats.totalCacheSize)}</span>
						</div>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

<!-- Fallback for Web Environment -->
{:else}
	<Card class="w-full">
		<CardContent class="py-6">
			<div class="text-center space-y-4">
				<div class="text-muted-foreground">
					<Package size={48} class="mx-auto mb-3 opacity-50" />
					<h3 class="text-lg font-medium">Collection Manager Unavailable</h3>
					<p class="text-sm">
						Data collection import/export features are only available in the desktop application.
					</p>
				</div>

				<div class="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
					<strong>Desktop Features:</strong>
					<ul class="list-disc list-inside mt-2 space-y-1">
						<li>Export data collections as portable files</li>
						<li>Import collections from other instances</li>
						<li>Local file persistence and caching</li>
						<li>Offline mode capabilities</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
{/if}