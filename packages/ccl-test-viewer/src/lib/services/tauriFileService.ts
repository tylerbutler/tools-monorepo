import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
	BaseDirectory,
	create,
	exists,
	readTextFile,
	writeTextFile,
} from "@tauri-apps/plugin-fs";

/**
 * Tauri-specific file service for desktop application functionality
 * Provides native file dialogs, local persistence, and desktop-specific features
 */

export interface TauriFileResult {
	name: string;
	content: string;
	path: string;
	size: number;
}

export interface LocalDataSource {
	id: string;
	name: string;
	files: TauriFileResult[];
	savedAt: Date;
	persistent: boolean;
}

/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
	// Check for Tauri-specific globals
	return (
		typeof window !== "undefined" &&
		"__TAURI__" in window &&
		(window as any).__TAURI__ !== undefined
	);
}

/**
 * Open native file dialog for multiple JSON file selection
 */
export async function openMultiFileDialog(): Promise<TauriFileResult[]> {
	if (!isTauriEnvironment()) {
		throw new Error("Tauri file dialogs only available in desktop app");
	}

	try {
		const selected = await open({
			multiple: true,
			filters: [
				{
					name: "JSON Files",
					extensions: ["json"],
				},
				{
					name: "All Files",
					extensions: ["*"],
				},
			],
			title: "Select CCL Test Data Files",
		});

		if (!selected || (Array.isArray(selected) && selected.length === 0)) {
			return [];
		}

		// Handle both single file and multiple files
		const paths = Array.isArray(selected) ? selected : [selected];
		const results: TauriFileResult[] = [];

		for (const path of paths) {
			try {
				const content = await readTextFile(path);
				const fileName = path.split(/[\\/]/).pop() || "unknown.json";

				// Validate JSON content
				JSON.parse(content);

				results.push({
					name: fileName,
					content,
					path,
					size: content.length,
				});
			} catch (_error) {
				// Continue with other files even if one fails
			}
		}

		return results;
	} catch (error) {
		throw new Error(
			`File dialog error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Save data source configuration to local storage
 */
export async function saveDataSourceToLocal(
	dataSource: LocalDataSource,
): Promise<void> {
	if (!isTauriEnvironment()) {
		throw new Error("Local file persistence only available in desktop app");
	}

	try {
		const dataDir = "ccl-test-viewer";
		const fileName = `datasource-${dataSource.id}.json`;

		// Ensure data directory exists
		const dirPath = `${dataDir}`;
		const dirExists = await exists(dirPath, {
			baseDir: BaseDirectory.AppLocalData,
		});

		if (!dirExists) {
			await create(dirPath, {
				baseDir: BaseDirectory.AppLocalData,
			});
		}

		// Save data source metadata and file references
		const filesWithHashes = await Promise.all(
			dataSource.files.map(async (f) => ({
				name: f.name,
				path: f.path,
				size: f.size,
				// Don't save full content to avoid bloat, just reference
				contentHash: await contentHash(f.content),
			})),
		);

		const saveData = {
			...dataSource,
			savedAt: new Date(),
			files: filesWithHashes,
		};

		await writeTextFile(
			`${dirPath}/${fileName}`,
			JSON.stringify(saveData, null, 2),
			{ baseDir: BaseDirectory.AppLocalData },
		);
	} catch (error) {
		throw new Error(
			`Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Load saved data sources from local storage
 */
export async function loadSavedDataSources(): Promise<LocalDataSource[]> {
	if (!isTauriEnvironment()) {
		return [];
	}

	try {
		const dataDir = "ccl-test-viewer";
		const dirExists = await exists(dataDir, {
			baseDir: BaseDirectory.AppLocalData,
		});

		if (!dirExists) {
			return [];
		}

		// This would require directory listing functionality
		// For now, return empty array - would need to implement directory scanning
		return [];
	} catch (_error) {
		return [];
	}
}

/**
 * Export data sources as a collection file
 */
export async function exportDataCollection(
	dataSources: LocalDataSource[],
	fileName?: string,
): Promise<void> {
	if (!isTauriEnvironment()) {
		throw new Error("Export functionality only available in desktop app");
	}

	try {
		const exportData = {
			exportedAt: new Date(),
			version: "1.0",
			sources: dataSources.map((source) => ({
				...source,
				// Include full file content for export
				files: source.files,
			})),
		};

		const defaultFileName = `ccl-data-collection-${new Date().toISOString().split("T")[0]}.json`;

		// Open save dialog
		const savePath = await open({
			multiple: false,
			filters: [
				{
					name: "JSON Files",
					extensions: ["json"],
				},
			],
			title: "Export Data Collection",
			defaultPath: fileName || defaultFileName,
		});

		if (savePath && typeof savePath === "string") {
			await writeTextFile(savePath, JSON.stringify(exportData, null, 2));
		}
	} catch (error) {
		throw new Error(
			`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Import data collection from file
 */
export async function importDataCollection(): Promise<LocalDataSource[]> {
	if (!isTauriEnvironment()) {
		throw new Error("Import functionality only available in desktop app");
	}

	try {
		const selected = await open({
			multiple: false,
			filters: [
				{
					name: "JSON Files",
					extensions: ["json"],
				},
			],
			title: "Import Data Collection",
		});

		if (!selected || Array.isArray(selected)) {
			return [];
		}

		const content = await readTextFile(selected);
		const importData = JSON.parse(content);

		// Validate import data structure
		if (!(importData.sources && Array.isArray(importData.sources))) {
			throw new Error("Invalid collection file format");
		}

		return importData.sources as LocalDataSource[];
	} catch (error) {
		throw new Error(
			`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Check for file system permissions (desktop-specific)
 */
export async function checkFileSystemPermissions(): Promise<boolean> {
	if (!isTauriEnvironment()) {
		return false;
	}

	try {
		// Try to create a test file in app local data directory
		const testDir = "ccl-test-viewer";
		const testFile = "permission-test.txt";

		await create(testDir, {
			baseDir: BaseDirectory.AppLocalData,
		});
		await writeTextFile(`${testDir}/${testFile}`, "test", {
			baseDir: BaseDirectory.AppLocalData,
		});

		return true;
	} catch (_error) {
		return false;
	}
}

/**
 * Content hash using Web Crypto API (SHA-256) for better collision resistance
 * Falls back to simple hash if crypto API unavailable
 */
async function contentHash(str: string): Promise<string> {
	// Use Web Crypto API for better hash quality
	if (typeof crypto !== "undefined" && crypto.subtle) {
		try {
			const encoder = new TextEncoder();
			const data = encoder.encode(str);
			const hashBuffer = await crypto.subtle.digest("SHA-256", data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			// Return first 16 bytes as hex string (32 chars) for reasonable size
			return hashArray
				.slice(0, 16)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
		} catch (_error) {
			// Fall back to simple hash
		}
	}

	// Fallback: Simple hash for older environments
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash; // Convert to 32-bit integer
	}
	return hash.toString(36);
}

/**
 * Desktop-specific GitHub OAuth flow (placeholder for future implementation)
 */
export async function initializeDesktopGitHubAuth(): Promise<void> {
	if (!isTauriEnvironment()) {
		throw new Error("Desktop OAuth only available in Tauri app");
	}
	throw new Error("Desktop GitHub OAuth not yet implemented");
}

/**
 * Check if offline mode is available (desktop-specific)
 */
export function isOfflineModeAvailable(): boolean {
	return isTauriEnvironment();
}

/**
 * Get desktop app information
 */
export async function getDesktopAppInfo(): Promise<{
	version: string;
	platform: string;
} | null> {
	if (!isTauriEnvironment()) {
		return null;
	}

	try {
		const version = (await invoke("app_version")) as string;
		const platform = (await invoke("platform")) as string;

		return { version, platform };
	} catch (_error) {
		return null;
	}
}
