<!--
  Tauri-enhanced file upload component
  Provides native file dialogs in desktop app, falls back to web upload
-->
<script lang="ts">
import { Download, File, Folder, HardDrive, Upload, X } from "@lucide/svelte";
import { onMount } from "svelte";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	checkFileSystemPermissions,
	isTauriEnvironment,
	openMultiFileDialog,
	type TauriFileResult,
} from "@/services/tauriFileService";

// Props
interface Props {
	onFilesLoaded?: (files: TauriFileResult[]) => void;
	onError?: (error: string) => void;
	maxFiles?: number;
	maxFileSize?: number;
}

let {
	onFilesLoaded = () => {},
	onError = () => {},
	maxFiles = 10,
	maxFileSize = 10 * 1024 * 1024, // 10MB
}: Props = $props();

// State
let isDesktopApp = $state(false);
let hasFileSystemPermissions = $state(false);
let isLoading = $state(false);
let loadedFiles = $state<TauriFileResult[]>([]);
let error = $state<string | null>(null);
let progress = $state(0);

// Check Tauri environment on mount
onMount(async () => {
	isDesktopApp = isTauriEnvironment();

	if (isDesktopApp) {
		hasFileSystemPermissions = await checkFileSystemPermissions();
	}
});

/**
 * Handle native file dialog selection
 */
async function handleNativeFileDialog() {
	if (!isDesktopApp) {
		error = "Native file dialogs only available in desktop app";
		onError(error);
		return;
	}

	isLoading = true;
	error = null;
	progress = 0;

	try {
		const files = await openMultiFileDialog();

		if (files.length === 0) {
			isLoading = false;
			return;
		}

		// Validate file count
		if (files.length > maxFiles) {
			throw new Error(
				`Too many files selected. Maximum ${maxFiles} files allowed.`,
			);
		}

		// Validate file sizes
		for (const file of files) {
			if (file.size > maxFileSize) {
				throw new Error(
					`File "${file.name}" is too large. Maximum size: ${formatFileSize(maxFileSize)}`,
				);
			}
		}

		// Process files with progress updates
		const processedFiles: TauriFileResult[] = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			progress = ((i + 1) / files.length) * 100;

			try {
				// Validate JSON content
				JSON.parse(file.content);
				processedFiles.push(file);
			} catch (jsonError) {
				throw new Error(`File "${file.name}" contains invalid JSON`);
			}
		}

		loadedFiles = processedFiles;
		onFilesLoaded(processedFiles);
	} catch (err) {
		error = err instanceof Error ? err.message : "Failed to load files";
		onError(error);
	} finally {
		isLoading = false;
		progress = 0;
	}
}

/**
 * Remove a loaded file
 */
function removeFile(index: number) {
	loadedFiles = loadedFiles.filter((_, i) => i !== index);
	onFilesLoaded(loadedFiles);
}

/**
 * Clear all loaded files
 */
function clearFiles() {
	loadedFiles = [];
	error = null;
	onFilesLoaded([]);
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

/**
 * Get file status badge variant
 */
function getFileStatusVariant(file: TauriFileResult) {
	try {
		JSON.parse(file.content);
		return "default";
	} catch {
		return "destructive";
	}
}
</script>

<!-- Desktop App File Upload Interface -->
{#if isDesktopApp}
	<Card class="w-full">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<HardDrive size={20} />
				Desktop File Manager
			</CardTitle>
			{#if !hasFileSystemPermissions}
				<Alert variant="destructive">
					<AlertDescription>
						File system permissions not available. Some features may be limited.
					</AlertDescription>
				</Alert>
			{/if}
		</CardHeader>

		<CardContent class="space-y-4">
			<!-- File Selection Controls -->
			<div class="flex flex-col sm:flex-row gap-2">
				<Button
					onclick={handleNativeFileDialog}
					disabled={isLoading}
					class="flex items-center gap-2"
				>
					<Folder size={16} />
					{isLoading ? 'Loading Files...' : 'Browse Files'}
				</Button>

				{#if loadedFiles.length > 0}
					<Button
						variant="outline"
						onclick={clearFiles}
						disabled={isLoading}
						class="flex items-center gap-2"
					>
						<X size={16} />
						Clear All
					</Button>
				{/if}
			</div>

			<!-- Loading Progress -->
			{#if isLoading && progress > 0}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Processing files...</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<Progress value={progress} class="w-full" />
				</div>
			{/if}

			<!-- Error Display -->
			{#if error}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}

			<!-- File List -->
			{#if loadedFiles.length > 0}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h4 class="text-sm font-medium">
							Loaded Files ({loadedFiles.length})
						</h4>
						<Badge variant="secondary">
							{formatFileSize(loadedFiles.reduce((sum, f) => sum + f.size, 0))} total
						</Badge>
					</div>

					<div class="max-h-48 overflow-y-auto space-y-2">
						{#each loadedFiles as file, index}
							<div class="flex items-center justify-between p-3 border rounded-lg">
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<File size={16} class="text-muted-foreground flex-shrink-0" />
									<div class="min-w-0 flex-1">
										<div class="font-medium truncate">{file.name}</div>
										<div class="text-sm text-muted-foreground">
											{formatFileSize(file.size)} • {file.path}
										</div>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<Badge variant={getFileStatusVariant(file)}>
										{getFileStatusVariant(file) === 'default' ? 'Valid' : 'Invalid'}
									</Badge>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => removeFile(index)}
										disabled={isLoading}
									>
										<X size={14} />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Desktop App Info -->
			<div class="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
				<div class="flex items-center gap-2 mb-1">
					<HardDrive size={12} />
					<strong>Desktop App Features:</strong>
				</div>
				<ul class="list-disc list-inside space-y-1 ml-4">
					<li>Native file dialogs with multi-selection</li>
					<li>Direct file system access</li>
					<li>Local data persistence</li>
					<li>Offline mode capabilities</li>
				</ul>
			</div>
		</CardContent>
	</Card>

<!-- Fallback for Web Environment -->
{:else}
	<Card class="w-full">
		<CardContent class="py-6">
			<div class="text-center space-y-4">
				<div class="text-muted-foreground">
					<Upload size={48} class="mx-auto mb-3 opacity-50" />
					<h3 class="text-lg font-medium">Desktop Features Unavailable</h3>
					<p class="text-sm">
						Native file dialogs and desktop features are only available in the desktop application.
					</p>
				</div>

				<div class="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
					<strong>To use desktop features:</strong>
					<ul class="list-disc list-inside mt-2 space-y-1">
						<li>Download the desktop application</li>
						<li>Install and run the Tauri-based app</li>
						<li>Access enhanced file management capabilities</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
{/if}

<style>
	/* Custom scrollbar for file list */
	.max-h-48::-webkit-scrollbar {
		width: 6px;
	}

	.max-h-48::-webkit-scrollbar-track {
		background: transparent;
	}

	.max-h-48::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground) / 0.3);
		border-radius: 3px;
	}

	.max-h-48::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.5);
	}
</style>