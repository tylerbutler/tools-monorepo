// Data source manager for multi-source data handling with Svelte 5 runes

import type { TestCategory, TestStats } from "../data/types.js";
import {
	createDataSourceFromGitHub,
	createDataSourceFromUpload,
	createStaticDataSource,
	mergeDataSources,
	validateTestData,
} from "../utils/dataMerger.js";
import type {
	DataSource,
	DataSourceSummary,
	FileProcessingResult,
} from "./dataSource.js";

/**
 * Data source manager class using Svelte 5 runes for reactive state management
 */
class DataSourceManager {
	// Core data sources state
	dataSources = $state<DataSource[]>([]);

	// Processing state
	isProcessing = $state(false);
	processingFiles = $state<string[]>([]);
	lastError = $state<string | null>(null);

	// Track if we should auto-save (avoid saving during initial load)
	private shouldAutoSave = $state(false);

	constructor() {
		// Set up reactive auto-save effect using $effect.root for manual control
		$effect.root(() => {
			$effect(() => {
				if (this.shouldAutoSave && this.dataSources.length >= 0) {
					this.saveToStorage();
				}
			});
		});
	}

	// Merged data state (computed from active sources)
	mergedData = $derived.by(() => {
		const result = mergeDataSources(this.dataSources);
		return result;
	});

	// Quick access to merged categories and stats
	categories = $derived(this.mergedData.categories);
	stats = $derived(this.mergedData.stats);
	mergedStats = $derived(this.mergedData.mergedStats);

	// Data source summaries for UI display
	sourceSummaries = $derived.by(() => {
		return this.dataSources.map(
			(source) =>
				({
					id: source.id,
					name: source.name,
					type: source.type,
					active: source.active,
					testCount: source.stats.totalTests,
					categoryCount: source.categories.length,
					uploadedAt: source.uploadedAt,
					metadata: source.metadata,
				}) as DataSourceSummary,
		);
	});

	// Active sources count
	activeSourceCount = $derived(this.dataSources.filter((s) => s.active).length);
	totalSourceCount = $derived(this.dataSources.length);

	// Processing state helpers
	hasActiveSources = $derived(this.activeSourceCount > 0);
	hasMultipleSources = $derived(this.totalSourceCount > 1);
	isReady = $derived(this.hasActiveSources && !this.isProcessing);
	hasStaticData = $derived(this.dataSources.some((s) => s.type === "static"));

	/**
	 * Initialize the data source manager with static data
	 */
	async initialize() {
		try {
			// Load static data (existing build-time data)
			const staticCategories = await this.loadStaticCategories();
			const staticStats = await this.loadStaticStats();

			if (staticCategories && staticStats) {
				const staticSource = createStaticDataSource(
					staticCategories,
					staticStats,
				);
				this.dataSources = [staticSource];
			}

			this.lastError = null;
			return true;
		} catch (error) {
			this.lastError =
				error instanceof Error
					? error.message
					: "Failed to initialize data sources";
			return false;
		}
	}

	/**
	 * Initialize the data source manager without loading any default data
	 * Used when data must be uploaded instead of using static build-time data
	 * Loads from localStorage if available to persist across page navigation
	 */
	async initializeEmpty() {
		try {
			// Only initialize if empty - first try to load from localStorage
			if (this.dataSources.length === 0) {
				const saved = this.loadFromStorage();
				if (saved) {
				} else {
					this.dataSources = [];
				}
			} else {
			}

			// Enable auto-save after initialization
			this.shouldAutoSave = true;
			this.lastError = null;
			return true;
		} catch (error) {
			this.lastError =
				error instanceof Error
					? error.message
					: "Failed to initialize data sources";
			return false;
		}
	}

	/**
	 * Process uploaded files and add them as data sources
	 */
	async processUploadedFiles(files: File[]): Promise<FileProcessingResult[]> {
		this.isProcessing = true;
		this.processingFiles = files.map((f) => f.name);
		this.lastError = null;

		const results: FileProcessingResult[] = [];

		try {
			for (const file of files) {
				const result = await this.processFile(file);
				results.push(result);

				if (result.success && result.dataSource) {
					// Add successful data source
					this.dataSources = [...this.dataSources, result.dataSource];
				}
			}
		} catch (error) {
			this.lastError =
				error instanceof Error ? error.message : "Failed to process files";
		} finally {
			this.isProcessing = false;
			this.processingFiles = [];

			// Auto-save will trigger from the reactive effect
		}

		return results;
	}

	/**
	 * Process a single uploaded file
	 */
	private async processFile(file: File): Promise<FileProcessingResult> {
		try {
			const text = await file.text();
			const jsonData = JSON.parse(text);

			// Validate the data
			const validationResult = validateTestData(jsonData, file.name);

			if (!validationResult.isValid) {
				return {
					success: false,
					error: `Validation failed: ${validationResult.errors.join(", ")}`,
					validationResult,
				};
			}

			// Extract tests array from CCL schema format
			const testsArray = jsonData.tests;

			// Create data source
			const dataSource = createDataSourceFromUpload(
				file,
				testsArray,
				validationResult,
			);

			return {
				success: true,
				dataSource,
				validationResult,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to process file",
			};
		}
	}

	/**
	 * Toggle active state of a data source
	 */
	toggleSource(sourceId: string) {
		const sourceIndex = this.dataSources.findIndex((s) => s.id === sourceId);
		if (sourceIndex >= 0) {
			this.dataSources[sourceIndex].active =
				!this.dataSources[sourceIndex].active;
			// Force reactivity update
			this.dataSources = [...this.dataSources];
			// Auto-save will trigger from the reactive effect
		}
	}

	/**
	 * Remove a data source (except static)
	 */
	removeSource(sourceId: string) {
		if (sourceId === "static_default") {
			return;
		}

		this.dataSources = this.dataSources.filter((s) => s.id !== sourceId);
		// Auto-save will trigger from the reactive effect
	}

	/**
	 * Process GitHub repository data and add as data source
	 */
	async processGitHubRepository(repositoryData: {
		files: { name: string; content: any; url: string }[];
		repository: { owner: string; repo: string; branch?: string; path?: string };
		metadata: {
			loadedAt: Date;
			totalFiles: number;
			successfulFiles: number;
			source: "github";
		};
	}): Promise<{ success: boolean; dataSource?: DataSource; error?: string }> {
		this.isProcessing = true;
		this.lastError = null;

		try {
			// Validate that we have files
			if (repositoryData.files.length === 0) {
				return {
					success: false,
					error: "No JSON files found in the repository",
				};
			}

			// Create data source from GitHub data
			const dataSource = createDataSourceFromGitHub(repositoryData);

			// Check if we have valid categories
			if (dataSource.categories.length === 0) {
				return {
					success: false,
					error: "No valid test data found in the repository files",
				};
			}

			// Add to data sources
			this.dataSources = [...this.dataSources, dataSource];
			// Auto-save will trigger from the reactive effect

			return {
				success: true,
				dataSource,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to process GitHub repository";
			this.lastError = errorMessage;

			return {
				success: false,
				error: errorMessage,
			};
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Clear all uploaded data sources (keep static)
	 */
	clearUploadedSources() {
		this.dataSources = this.dataSources.filter((s) => s.type === "static");
		// Auto-save will trigger from the reactive effect
	}

	/**
	 * Clear all non-static data sources (uploaded + GitHub)
	 */
	clearAllImportedSources() {
		this.dataSources = this.dataSources.filter((s) => s.type === "static");
		// Auto-save will trigger from the reactive effect
	}

	/**
	 * Clear all data sources and reset to completely empty state
	 */
	clearAllData() {
		this.dataSources = [];
		this.lastError = null;
		this.isProcessing = false;
		this.processingFiles = [];
		this.clearStorage();
	}

	/**
	 * Get a specific data source by ID
	 */
	getSource(sourceId: string): DataSource | undefined {
		return this.dataSources.find((s) => s.id === sourceId);
	}

	/**
	 * Get sources by type
	 */
	getSourcesByType(type: DataSource["type"]): DataSource[] {
		return this.dataSources.filter((s) => s.type === type);
	}

	/**
	 * Load static categories from build-time data
	 */
	private async loadStaticCategories(): Promise<TestCategory[] | null> {
		try {
			const response = await fetch("/data/categories.json");
			if (!response.ok) {
				return null;
			}
			return await response.json();
		} catch (_error) {
			return null;
		}
	}

	/**
	 * Load static stats from build-time data
	 */
	private async loadStaticStats(): Promise<TestStats | null> {
		try {
			const response = await fetch("/data/stats.json");
			if (!response.ok) {
				return null;
			}
			return await response.json();
		} catch (_error) {
			return null;
		}
	}

	/**
	 * Export current data sources configuration
	 */
	exportConfiguration() {
		return {
			sources: this.sourceSummaries,
			mergedStats: this.mergedStats,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Load all built-in data files and add as static data source
	 * If static data is already loaded, this does nothing
	 */
	async loadBuiltInData(): Promise<{ success: boolean; message: string }> {
		// Check if static data source already exists
		const existingStatic = this.dataSources.find((s) => s.type === "static");
		if (existingStatic) {
			return {
				success: true,
				message: "Built-in data is already loaded",
			};
		}

		this.isProcessing = true;
		this.lastError = null;

		try {
			// Load static data (existing build-time data)
			const staticCategories = await this.loadStaticCategories();
			const staticStats = await this.loadStaticStats();

			if (staticCategories && staticStats) {
				const staticSource = createStaticDataSource(
					staticCategories,
					staticStats,
				);
				this.dataSources = [...this.dataSources, staticSource];

				// Ensure auto-save is enabled and trigger save
				this.shouldAutoSave = true;
				this.saveToStorage();

				return {
					success: true,
					message: `Loaded built-in data: ${staticStats.totalTests} tests across ${staticCategories.length} categories`,
				};
			}
			return {
				success: false,
				message: "Failed to load built-in data files",
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to load built-in data";
			this.lastError = errorMessage;

			return {
				success: false,
				message: errorMessage,
			};
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Reset to initial state (static data only)
	 */
	reset() {
		const staticSource = this.dataSources.find((s) => s.type === "static");
		this.dataSources = staticSource ? [staticSource] : [];
		this.lastError = null;
		// Auto-save will trigger from the reactive effect
	}

	/**
	 * Save data sources to localStorage for persistence across page navigation
	 */
	private saveToStorage() {
		if (typeof window === "undefined" || typeof localStorage === "undefined") {
			return; // SSR guard
		}

		try {
			// Use $state.snapshot to convert proxy to plain object for serialization
			const dataToSave = {
				dataSources: $state.snapshot(this.dataSources),
				timestamp: new Date().toISOString(),
			};
			localStorage.setItem(
				"ccl-test-viewer-data-sources",
				JSON.stringify(dataToSave),
			);
		} catch (_error) {
			// QuotaExceededError or storage access denied - silently fail
		}
	}

	/**
	 * Load data sources from localStorage
	 * Returns true if data was loaded, false if no data or error
	 */
	private loadFromStorage(): boolean {
		if (typeof window === "undefined" || typeof localStorage === "undefined") {
			return false; // SSR guard
		}

		try {
			const saved = localStorage.getItem("ccl-test-viewer-data-sources");
			if (!saved) {
				return false;
			}

			const data = JSON.parse(saved);
			if (
				data.dataSources &&
				Array.isArray(data.dataSources) &&
				data.dataSources.length > 0
			) {
				// Restore Date objects from serialized strings
				const restoredDataSources = data.dataSources.map((source: any) => ({
					...source,
					uploadedAt: new Date(source.uploadedAt),
				}));

				// Force reactivity by replacing the entire array
				this.dataSources.length = 0;
				this.dataSources.push(...restoredDataSources);
				return true;
			}
			return false;
		} catch (_error) {
			// Clear corrupted data
			try {
				localStorage.removeItem("ccl-test-viewer-data-sources");
			} catch (_cleanupError) {
				// Silently fail on cleanup
			}
			return false;
		}
	}

	/**
	 * Clear localStorage data
	 */
	clearStorage() {
		if (typeof window === "undefined") {
			return;
		}

		try {
			localStorage.removeItem("ccl-test-viewer-data-sources");
		} catch (_error) {
			// Silently fail
		}
	}
}

// Global data source manager instance
export const dataSourceManager = new DataSourceManager();

// Helper function to initialize the data source manager
export async function initializeDataSources() {
	const success = await dataSourceManager.initialize();
	if (!success) {
	}
	return success;
}
