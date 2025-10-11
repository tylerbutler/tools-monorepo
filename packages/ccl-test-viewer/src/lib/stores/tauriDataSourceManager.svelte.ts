/**
 * Tauri-enhanced data source manager with local persistence
 * Extends the existing data source manager with desktop-specific capabilities
 */

import {
	exportDataCollection,
	importDataCollection,
	isTauriEnvironment,
	type LocalDataSource,
	loadSavedDataSources,
	saveDataSourceToLocal,
	type TauriFileResult,
} from "@/services/tauriFileService";
import type { DataSource } from "./dataSource.js";
import { dataSourceManager } from "./dataSourceManager.svelte.js";

/**
 * Tauri-enhanced data source manager
 * Provides local persistence and desktop-specific features
 */
class TauriDataSourceManager {
	// State
	private _isDesktopApp = $state(false);
	private _localSources = $state<LocalDataSource[]>([]);
	private _autoSave = $state(true);
	private _lastSyncTime = $state<Date | null>(null);

	constructor() {
		// Initialize Tauri environment detection
		this._isDesktopApp = isTauriEnvironment();

		// Load saved sources on initialization
		if (this._isDesktopApp) {
			void this.loadLocalSources();
		}
	}

	// Getters
	get isDesktopApp() {
		return this._isDesktopApp;
	}

	get localSources() {
		return this._localSources;
	}

	get autoSave() {
		return this._autoSave;
	}

	get lastSyncTime() {
		return this._lastSyncTime;
	}

	// Combined data sources (existing + local)
	get allDataSources() {
		const existingSources = dataSourceManager.dataSources;
		const localSourcesAsDataSources = this._localSources.map(
			this.localToDataSource,
		);
		return [...existingSources, ...localSourcesAsDataSources];
	}

	/**
	 * Convert TauriFileResult array to LocalDataSource
	 */
	async createLocalSourceFromFiles(
		files: TauriFileResult[],
		name?: string,
	): Promise<LocalDataSource> {
		if (!this._isDesktopApp) {
			throw new Error("Local sources only available in desktop app");
		}

		const sourceId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const sourceName =
			name || `Local Files - ${new Date().toLocaleDateString()}`;

		const localSource: LocalDataSource = {
			id: sourceId,
			name: sourceName,
			files,
			savedAt: new Date(),
			persistent: true,
		};

		// Add to local sources
		this._localSources.push(localSource);

		// Auto-save if enabled
		if (this._autoSave) {
			await this.saveLocalSource(localSource);
		}

		// Sync with main data source manager
		await this.syncWithMainManager();

		return localSource;
	}

	/**
	 * Save local data source to file system
	 */
	async saveLocalSource(source: LocalDataSource): Promise<void> {
		if (!this._isDesktopApp) {
			throw new Error("Local persistence only available in desktop app");
		}
		await saveDataSourceToLocal(source);
		this._lastSyncTime = new Date();
	}

	/**
	 * Load saved data sources from file system
	 */
	async loadLocalSources(): Promise<void> {
		if (!this._isDesktopApp) {
			return;
		}

		try {
			const savedSources = await loadSavedDataSources();
			this._localSources = savedSources;
			this._lastSyncTime = new Date();

			// Sync with main manager
			await this.syncWithMainManager();
		} catch (_error) {}
	}

	/**
	 * Remove local data source
	 */
	async removeLocalSource(sourceId: string): Promise<void> {
		const index = this._localSources.findIndex((s) => s.id === sourceId);
		if (index === -1) {
			return;
		}

		this._localSources.splice(index, 1);

		// Also remove from main data source manager
		dataSourceManager.removeSource(sourceId);

		// Sync changes
		await this.syncWithMainManager();
	}

	/**
	 * Toggle auto-save functionality
	 */
	setAutoSave(enabled: boolean): void {
		this._autoSave = enabled;
	}

	/**
	 * Export all data sources as a collection
	 */
	async exportAllSources(fileName?: string): Promise<void> {
		if (!this._isDesktopApp) {
			throw new Error("Export functionality only available in desktop app");
		}
		await exportDataCollection(this._localSources, fileName);
	}

	/**
	 * Import data sources from collection file
	 */
	async importSourceCollection(): Promise<LocalDataSource[]> {
		if (!this._isDesktopApp) {
			throw new Error("Import functionality only available in desktop app");
		}
		const importedSources = await importDataCollection();

		// Add imported sources to local sources
		this._localSources.push(...importedSources);

		// Auto-save if enabled
		if (this._autoSave) {
			for (const source of importedSources) {
				await this.saveLocalSource(source);
			}
		}

		// Sync with main manager
		await this.syncWithMainManager();

		return importedSources;
	}

	/**
	 * Sync local sources with main data source manager
	 */
	private async syncWithMainManager(): Promise<void> {
		// Convert local sources to DataSource format and add to main manager
		for (const localSource of this._localSources) {
			const dataSource = this.localToDataSource(localSource);

			// Check if already exists in main manager
			const existing = dataSourceManager.dataSources.find(
				(ds) => ds.id === dataSource.id,
			);
			if (!existing) {
				// Add to main manager (this will trigger UI updates)
				await dataSourceManager.processUploadedFiles(
					localSource.files.map(
						(f) =>
							({
								name: f.name,
								content: f.content,
								size: f.size,
								type: "application/json" as const,
								lastModified: Date.now(),
								webkitRelativePath: "",
								arrayBuffer: async () => new ArrayBuffer(0),
								stream: () => new ReadableStream(),
								text: async () => f.content,
								slice: () => new Blob(),
							}) as File,
					),
				);
			}
		}
	}

	/**
	 * Convert LocalDataSource to DataSource format
	 */
	private localToDataSource(localSource: LocalDataSource): DataSource {
		// Parse file contents to get categories and stats
		const allTests: any[] = [];

		for (const file of localSource.files) {
			try {
				const fileData = JSON.parse(file.content);
				if (Array.isArray(fileData)) {
					allTests.push(...fileData);
				}
			} catch (_error) {}
		}

		// Generate basic stats
		const stats: import("./dataSource").DataSource["stats"] = {
			totalTests: allTests.length,
			totalAssertions: allTests.reduce(
				(sum, test) => sum + (test.expected?.count || 0),
				0,
			),
			categories: {},
			functions: {},
			features: {},
			behaviors: {},
		};

		return {
			id: localSource.id,
			name: localSource.name,
			type: "uploaded" as const,
			uploadedAt: localSource.savedAt,
			active: true,
			categories: [], // Would need proper category processing
			stats,
			metadata: {
				fileSize: localSource.files.reduce((sum, f) => sum + f.size, 0),
				originalName: localSource.name,
			},
		};
	}

	/**
	 * Clear all local sources
	 */
	async clearAllLocalSources(): Promise<void> {
		// Remove from main manager first
		for (const source of this._localSources) {
			dataSourceManager.removeSource(source.id);
		}

		// Clear local array
		this._localSources = [];

		// Sync changes
		await this.syncWithMainManager();
	}

	/**
	 * Get storage usage statistics
	 */
	get storageStats(): {
		sourceCount: number;
		totalFiles: number;
		totalSize: number;
		lastSync: Date | null;
	} {
		const totalFiles = this._localSources.reduce(
			(sum, source) => sum + source.files.length,
			0,
		);
		const totalSize = this._localSources.reduce(
			(sum, source) =>
				sum + source.files.reduce((fileSum, file) => fileSum + file.size, 0),
			0,
		);

		return {
			sourceCount: this._localSources.length,
			totalFiles,
			totalSize,
			lastSync: this._lastSyncTime,
		};
	}
}

// Create singleton instance
export const tauriDataSourceManager = new TauriDataSourceManager();
