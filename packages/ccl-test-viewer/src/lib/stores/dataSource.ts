// Data source management types and interfaces for Phase 2 implementation
import type { TestCategory, TestStats } from "../data/types.js";

export type DataSourceType = "static" | "uploaded" | "github" | "url";

export interface DataSource {
	id: string;
	name: string;
	type: DataSourceType;
	active: boolean;
	filename?: string;
	url?: string;
	uploadedAt: Date;
	categories: TestCategory[];
	stats: TestStats;
	metadata?: {
		fileSize?: number;
		originalName?: string;
		githubRepo?: string;
		githubBranch?: string;
		lastFetched?: Date;
	};
}

export interface DataSourceSummary {
	id: string;
	name: string;
	type: DataSourceType;
	active: boolean;
	testCount: number;
	categoryCount: number;
	uploadedAt: Date;
	metadata?: DataSource["metadata"];
}

export interface MergedDataStats {
	totalSources: number;
	activeSources: number;
	totalTests: number;
	totalAssertions: number;
	totalCategories: number;
	sourceBreakdown: Array<{
		sourceId: string;
		sourceName: string;
		testCount: number;
		categoryCount: number;
	}>;
}

// Upload validation result interface
export interface UploadValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	stats: {
		testCount: number;
		categoryCount: number;
		functions: string[];
		features: string[];
		behaviors: string[];
	};
}

// File processing result
export interface FileProcessingResult {
	success: boolean;
	dataSource?: DataSource;
	error?: string;
	validationResult?: UploadValidationResult;
}
