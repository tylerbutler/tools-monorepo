<script lang="ts">
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/index.js";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "@lucide/svelte";

interface UploadedFile {
	file: File;
	id: string;
	status: "pending" | "processing" | "success" | "error";
	error?: string;
	preview?: string;
}

interface Props {
	onFilesUploaded?: (files: UploadedFile[]) => void;
	maxFiles?: number;
	maxSize?: number; // in bytes
}

let {
	onFilesUploaded,
	maxFiles = 10,
	maxSize = 10 * 1024 * 1024,
}: Props = $props(); // 10MB default

// File management state using Svelte 5 runes
let uploadedFiles = $state<UploadedFile[]>([]);
let isDragOver = $state(false);
let isProcessing = $state(false);
let fileInput: HTMLInputElement;
let dropZone: HTMLElement;

// File validation
function validateFile(file: File): string | null {
	if (!file.name.endsWith(".json")) {
		return "Only JSON files are allowed";
	}
	if (file.size > maxSize) {
		return `File size must be less than ${(maxSize / (1024 * 1024)).toFixed(1)}MB`;
	}
	if (uploadedFiles.length >= maxFiles) {
		return `Maximum ${maxFiles} files allowed`;
	}
	return null;
}

// Generate unique ID for files
function generateId(): string {
	return Math.random().toString(36).substr(2, 9);
}

// Handle file selection from input or drag and drop
function handleFilesSelect(files: FileList | File[]) {
	const fileArray = Array.from(files);

	// Process files
	for (const file of fileArray) {
		const validationError = validateFile(file);
		if (validationError) {
			// Add as error file
			uploadedFiles.push({
				file,
				id: generateId(),
				status: "error",
				error: validationError,
			});
		} else {
			// Add as pending file
			uploadedFiles.push({
				file,
				id: generateId(),
				status: "pending",
			});
		}
	}

	// Process valid files
	processFiles();
}

// Handle file input change
function handleFileInputChange(event: Event) {
	const target = event.target as HTMLInputElement;
	if (target.files) {
		handleFilesSelect(target.files);
	}
}

// Handle drag and drop with neodrag integration
function handleDragEnter(event: DragEvent) {
	event.preventDefault();
	if (event.dataTransfer?.types.includes("Files")) {
		isDragOver = true;
	}
}

function handleDragOver(event: DragEvent) {
	event.preventDefault();
	event.dataTransfer!.dropEffect = "copy";
}

function handleDragLeave(event: DragEvent) {
	event.preventDefault();
	// Only set to false if we're leaving the actual drop zone
	const rect = dropZone?.getBoundingClientRect();
	if (
		rect &&
		(event.clientX < rect.left ||
			event.clientX > rect.right ||
			event.clientY < rect.top ||
			event.clientY > rect.bottom)
	) {
		isDragOver = false;
	}
}

function handleDrop(event: DragEvent) {
	event.preventDefault();
	isDragOver = false;

	if (event.dataTransfer?.files) {
		handleFilesSelect(event.dataTransfer.files);
	}
}

// Open file dialog
function openFileDialog() {
	fileInput?.click();
}

// Process uploaded files (validate JSON content)
async function processFiles() {
	if (isProcessing) {
		return;
	}

	isProcessing = true;

	const pendingFiles = uploadedFiles.filter((f) => f.status === "pending");

	for (const uploadedFile of pendingFiles) {
		uploadedFile.status = "processing";

		try {
			const text = await uploadedFile.file.text();
			const jsonData = JSON.parse(text);

			// Basic validation - just check if it's valid JSON
			// Detailed validation will be done by the dataSourceManager
			if (!jsonData) {
				uploadedFile.status = "error";
				uploadedFile.error = "Invalid JSON content";
				continue;
			}

			// Generate basic preview
			if (Array.isArray(jsonData)) {
				uploadedFile.preview = `${jsonData.length} tests, ${uploadedFile.file.name}`;
			} else if (jsonData.tests && Array.isArray(jsonData.tests)) {
				uploadedFile.preview = `${jsonData.tests.length} tests, ${uploadedFile.file.name}`;
			} else {
				uploadedFile.preview = `JSON file: ${uploadedFile.file.name}`;
			}

			uploadedFile.status = "success";
		} catch (error) {
			uploadedFile.status = "error";
			uploadedFile.error =
				error instanceof Error ? error.message : "Invalid JSON format";
		}
	}

	isProcessing = false;

	// Notify parent component of successful uploads
	const successfulFiles = uploadedFiles.filter((f) => f.status === "success");
	if (successfulFiles.length > 0 && onFilesUploaded) {
		onFilesUploaded(successfulFiles);
	}
}

// Remove file from queue
function removeFile(id: string) {
	uploadedFiles = uploadedFiles.filter((f) => f.id !== id);
}

// Clear all files
function clearAll() {
	uploadedFiles = [];
}

// Get status icon
function getStatusIcon(status: UploadedFile["status"]) {
	switch (status) {
		case "success":
			return CheckCircle2;
		case "error":
			return AlertCircle;
		case "processing":
			return Upload;
		default:
			return FileText;
	}
}

// Get status color
function getStatusColor(status: UploadedFile["status"]) {
	switch (status) {
		case "success":
			return "text-green-600 dark:text-green-400";
		case "error":
			return "text-destructive";
		case "processing":
			return "text-info";
		default:
			return "text-muted-foreground";
	}
}

// Format file size
function formatFileSize(bytes: number): string {
	if (bytes === 0) {
		return "0 B";
	}
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
</script>

<Card class="w-full">
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Upload size={20} />
			Upload JSON Test Files
		</CardTitle>
		<p class="text-sm text-muted-foreground">
			Drag and drop JSON test files here, or click to select files. Maximum {maxFiles} files, {formatFileSize(maxSize)} each.
		</p>
	</CardHeader>

	<CardContent class="space-y-4">
		<!-- Enhanced Drop Zone with @neodrag/svelte -->
		<div class="relative">
			<div
				bind:this={dropZone}
				class={`
					border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ease-in-out
					${isDragOver
						? 'border-primary bg-primary/5 text-primary scale-[1.02] shadow-lg'
						: 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
					}
				`}
				ondragenter={handleDragEnter}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={openFileDialog}
				role="button"
				tabindex="0"
				aria-label="Upload JSON files by dragging and dropping or clicking to browse"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						openFileDialog();
					}
				}}
			>
				<!-- Hidden file input -->
				<input
					bind:this={fileInput}
					type="file"
					multiple
					accept=".json,application/json"
					onchange={handleFileInputChange}
					class="sr-only"
				/>

				<Upload
					class={`mx-auto mb-4 transition-all duration-200 ${
						isDragOver ? 'text-primary scale-110' : 'text-muted-foreground'
					}`}
					size={48}
				/>

				{#if isDragOver}
					<div class="animate-pulse">
						<p class="text-lg font-medium">Drop JSON files here...</p>
						<p class="text-sm text-primary/80">Release to upload</p>
					</div>
				{:else}
					<div class="space-y-2">
						<p class="text-lg font-medium">Drag & drop JSON test files</p>
						<p class="text-sm text-muted-foreground">or click to browse files</p>
						<p class="text-xs text-muted-foreground">
							Supports: .json files up to {formatFileSize(maxSize)}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- File Queue -->
		{#if uploadedFiles.length > 0}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium">
						Uploaded Files ({uploadedFiles.length})
					</h3>
					<Button variant="outline" size="sm" onclick={clearAll} data-testid="upload-clear-all-button">
						Clear All
					</Button>
				</div>

				<div class="space-y-2 max-h-64 overflow-y-auto">
					{#each uploadedFiles as uploadedFile (uploadedFile.id)}
						{@const StatusIcon = getStatusIcon(uploadedFile.status)}
						{@const statusColor = getStatusColor(uploadedFile.status)}

						<div class="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
							<StatusIcon class={`${statusColor} flex-shrink-0`} size={16} />

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<p class="text-sm font-medium truncate">
										{uploadedFile.file.name}
									</p>
									<Badge variant={uploadedFile.status === 'success' ? 'default' :
													uploadedFile.status === 'error' ? 'destructive' : 'secondary'}>
										{uploadedFile.status}
									</Badge>
								</div>

								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<span>{formatFileSize(uploadedFile.file.size)}</span>
									{#if uploadedFile.preview}
										<span>•</span>
										<span>{uploadedFile.preview}</span>
									{/if}
								</div>

								{#if uploadedFile.error}
									<p class="text-xs text-destructive mt-1">
										{uploadedFile.error}
									</p>
								{/if}
							</div>

							<Button
								variant="ghost"
								size="sm"
								onclick={() => removeFile(uploadedFile.id)}
								class="flex-shrink-0"
							>
								<X size={14} />
							</Button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Processing State -->
		{#if isProcessing}
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<div class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
				Processing files...
			</div>
		{/if}

		<!-- Summary Stats -->
		{#if uploadedFiles.length > 0}
			{@const successCount = uploadedFiles.filter(f => f.status === 'success').length}
			{@const errorCount = uploadedFiles.filter(f => f.status === 'error').length}

			<div class="flex gap-4 text-sm">
				{#if successCount > 0}
					<div class="flex items-center gap-1 text-green-600 dark:text-green-400">
						<CheckCircle2 size={14} />
						{successCount} successful
					</div>
				{/if}
				{#if errorCount > 0}
					<div class="flex items-center gap-1 text-destructive">
						<AlertCircle size={14} />
						{errorCount} failed
					</div>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>