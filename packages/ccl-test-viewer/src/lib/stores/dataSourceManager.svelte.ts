// Data source manager for multi-source data handling with Svelte 5 runes
import type {
  DataSource,
  DataSourceSummary,
  MergedDataStats,
  FileProcessingResult
} from "./dataSource.js";
import type { TestCategory, TestStats, GeneratedTest } from "../data/types.js";
import {
  validateTestData,
  createDataSourceFromUpload,
  createDataSourceFromGitHub,
  createStaticDataSource,
  mergeDataSources,
  generateDataSourceId
} from "../utils/dataMerger.js";

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
    return this.dataSources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      active: source.active,
      testCount: source.stats.totalTests,
      categoryCount: source.categories.length,
      uploadedAt: source.uploadedAt,
      metadata: source.metadata
    } as DataSourceSummary));
  });

  // Active sources count
  activeSourceCount = $derived(this.dataSources.filter(s => s.active).length);
  totalSourceCount = $derived(this.dataSources.length);

  // Processing state helpers
  hasActiveSources = $derived(this.activeSourceCount > 0);
  hasMultipleSources = $derived(this.totalSourceCount > 1);
  isReady = $derived(this.hasActiveSources && !this.isProcessing);

  /**
   * Initialize the data source manager with static data
   */
  async initialize() {
    try {
      // Load static data (existing build-time data)
      const staticCategories = await this.loadStaticCategories();
      const staticStats = await this.loadStaticStats();

      if (staticCategories && staticStats) {
        const staticSource = createStaticDataSource(staticCategories, staticStats);
        this.dataSources = [staticSource];
      }

      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Failed to initialize data sources';
      console.error('DataSourceManager initialization failed:', error);
      return false;
    }
  }

  /**
   * Process uploaded files and add them as data sources
   */
  async processUploadedFiles(files: File[]): Promise<FileProcessingResult[]> {
    this.isProcessing = true;
    this.processingFiles = files.map(f => f.name);
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
      this.lastError = error instanceof Error ? error.message : 'Failed to process files';
      console.error('File processing failed:', error);
    } finally {
      this.isProcessing = false;
      this.processingFiles = [];
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
          error: `Validation failed: ${validationResult.errors.join(', ')}`,
          validationResult
        };
      }

      // Create data source
      const dataSource = createDataSourceFromUpload(file, jsonData, validationResult);

      return {
        success: true,
        dataSource,
        validationResult
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process file'
      };
    }
  }

  /**
   * Toggle active state of a data source
   */
  toggleSource(sourceId: string) {
    const sourceIndex = this.dataSources.findIndex(s => s.id === sourceId);
    if (sourceIndex >= 0) {
      this.dataSources[sourceIndex].active = !this.dataSources[sourceIndex].active;
      // Force reactivity update
      this.dataSources = [...this.dataSources];
    }
  }

  /**
   * Remove a data source (except static)
   */
  removeSource(sourceId: string) {
    if (sourceId === 'static_default') {
      console.warn('Cannot remove static data source');
      return;
    }

    this.dataSources = this.dataSources.filter(s => s.id !== sourceId);
  }

  /**
   * Process GitHub repository data and add as data source
   */
  async processGitHubRepository(repositoryData: {
    files: { name: string; content: any; url: string }[];
    repository: { owner: string; repo: string; branch?: string; path?: string };
    metadata: { loadedAt: Date; totalFiles: number; successfulFiles: number; source: 'github' };
  }): Promise<{ success: boolean; dataSource?: DataSource; error?: string }> {
    this.isProcessing = true;
    this.lastError = null;

    try {
      // Validate that we have files
      if (repositoryData.files.length === 0) {
        return {
          success: false,
          error: 'No JSON files found in the repository'
        };
      }

      // Create data source from GitHub data
      const dataSource = createDataSourceFromGitHub(repositoryData);

      // Check if we have valid categories
      if (dataSource.categories.length === 0) {
        return {
          success: false,
          error: 'No valid test data found in the repository files'
        };
      }

      // Add to data sources
      this.dataSources = [...this.dataSources, dataSource];

      return {
        success: true,
        dataSource
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process GitHub repository';
      this.lastError = errorMessage;

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear all uploaded data sources (keep static)
   */
  clearUploadedSources() {
    this.dataSources = this.dataSources.filter(s => s.type === 'static');
  }

  /**
   * Clear all non-static data sources (uploaded + GitHub)
   */
  clearAllImportedSources() {
    this.dataSources = this.dataSources.filter(s => s.type === 'static');
  }

  /**
   * Get a specific data source by ID
   */
  getSource(sourceId: string): DataSource | undefined {
    return this.dataSources.find(s => s.id === sourceId);
  }

  /**
   * Get sources by type
   */
  getSourcesByType(type: DataSource['type']): DataSource[] {
    return this.dataSources.filter(s => s.type === type);
  }

  /**
   * Load static categories from build-time data
   */
  private async loadStaticCategories(): Promise<TestCategory[] | null> {
    try {
      const response = await fetch('/data/categories.json');
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to load static categories:', error);
      return null;
    }
  }

  /**
   * Load static stats from build-time data
   */
  private async loadStaticStats(): Promise<TestStats | null> {
    try {
      const response = await fetch('/data/stats.json');
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to load static stats:', error);
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
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset to initial state (static data only)
   */
  reset() {
    const staticSource = this.dataSources.find(s => s.type === 'static');
    this.dataSources = staticSource ? [staticSource] : [];
    this.lastError = null;
  }
}

// Global data source manager instance
export const dataSourceManager = new DataSourceManager();

// Helper function to initialize the data source manager
export async function initializeDataSources() {
  const success = await dataSourceManager.initialize();
  if (!success) {
    console.error('Failed to initialize data source manager');
  }
  return success;
}