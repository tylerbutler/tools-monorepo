// Data merging utilities for combining multiple data sources
import type { GeneratedTest, TestCategory, TestStats } from "../data/types.js";
import type {
	DataSource,
	MergedDataStats,
	UploadValidationResult,
} from "../stores/dataSource.js";

/**
 * Validates uploaded JSON data to ensure it matches expected test format
 */
export function validateTestData(
	jsonData: any,
	filename: string,
): UploadValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Only accept CCL schema format
	if (!jsonData || typeof jsonData !== "object" || Array.isArray(jsonData)) {
		errors.push(
			"JSON must be a CCL schema format object with $schema and tests properties",
		);
		return {
			isValid: false,
			errors,
			warnings,
			stats: {
				testCount: 0,
				categoryCount: 0,
				functions: [],
				features: [],
				behaviors: [],
			},
		};
	}

	// Validate CCL schema structure
	if (!jsonData.$schema) {
		errors.push("Missing required $schema property in CCL format");
	}

	if (!jsonData.tests || !Array.isArray(jsonData.tests)) {
		errors.push("Missing or invalid 'tests' array in CCL format");
		return {
			isValid: false,
			errors,
			warnings,
			stats: {
				testCount: 0,
				categoryCount: 0,
				functions: [],
				features: [],
				behaviors: [],
			},
		};
	}

	// Extract tests array for validation
	const testsArray = jsonData.tests;

	if (testsArray.length === 0) {
		warnings.push("File contains no test data");
	}

	// Validate test structure
	const validTests: GeneratedTest[] = [];
	const functions = new Set<string>();
	const features = new Set<string>();
	const behaviors = new Set<string>();

	for (let i = 0; i < testsArray.length; i++) {
		const test = testsArray[i];

		if (!test || typeof test !== "object") {
			errors.push(`Test at index ${i} is not a valid object`);
			continue;
		}

		// Required fields validation
		if (typeof test.name !== "string") {
			errors.push(`Test at index ${i} missing or invalid 'name' field`);
		}
		if (typeof test.input !== "string") {
			errors.push(`Test at index ${i} missing or invalid 'input' field`);
		}
		if (!test.expected || typeof test.expected.count !== "number") {
			errors.push(
				`Test at index ${i} missing or invalid 'expected.count' field`,
			);
		}

		// Optional arrays validation
		if (test.functions && Array.isArray(test.functions)) {
			test.functions.forEach((f: string) => functions.add(f));
		} else if (test.functions) {
			warnings.push(
				`Test ${test.name} has invalid 'functions' field - should be array`,
			);
		}

		if (test.features && Array.isArray(test.features)) {
			test.features.forEach((f: string) => features.add(f));
		} else if (test.features) {
			warnings.push(
				`Test ${test.name} has invalid 'features' field - should be array`,
			);
		}

		if (test.behaviors && Array.isArray(test.behaviors)) {
			test.behaviors.forEach((b: string) => behaviors.add(b));
		} else if (test.behaviors) {
			warnings.push(
				`Test ${test.name} has invalid 'behaviors' field - should be array`,
			);
		}

		if (errors.length === 0) {
			validTests.push(test as GeneratedTest);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		stats: {
			testCount: validTests.length,
			categoryCount: 1, // Each file becomes one category
			functions: Array.from(functions),
			features: Array.from(features),
			behaviors: Array.from(behaviors),
		},
	};
}

/**
 * Converts JSON data to TestCategory format
 */
export function jsonToTestCategory(
	jsonData: GeneratedTest[],
	filename: string,
): TestCategory {
	const categoryName = filename
		.replace(/\.json$/i, "")
		.replace(/[-_]/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());

	return {
		name: categoryName,
		description: `Uploaded test category from ${filename}`,
		tests: jsonData,
		file: filename,
	};
}

/**
 * Calculates statistics for a set of test categories
 */
export function calculateStats(categories: TestCategory[]): TestStats {
	const functionsCount: Record<string, number> = {};
	const featuresCount: Record<string, number> = {};
	const behaviorsCount: Record<string, number> = {};
	const categoriesCount: Record<string, number> = {};

	let totalTests = 0;
	let totalAssertions = 0;

	for (const category of categories) {
		categoriesCount[category.name] = category.tests.length;
		totalTests += category.tests.length;

		for (const test of category.tests) {
			totalAssertions += test.expected.count || 0;

			// Count functions
			for (const func of test.functions || []) {
				functionsCount[func] = (functionsCount[func] || 0) + 1;
			}

			// Count features
			for (const feature of test.features || []) {
				featuresCount[feature] = (featuresCount[feature] || 0) + 1;
			}

			// Count behaviors
			for (const behavior of test.behaviors || []) {
				behaviorsCount[behavior] = (behaviorsCount[behavior] || 0) + 1;
			}
		}
	}

	return {
		totalTests,
		totalAssertions,
		categories: categoriesCount,
		functions: functionsCount,
		features: featuresCount,
		behaviors: behaviorsCount,
	};
}

/**
 * Merges multiple data sources into combined categories and stats
 */
export function mergeDataSources(dataSources: DataSource[]): {
	categories: TestCategory[];
	stats: TestStats;
	mergedStats: MergedDataStats;
} {
	const activeSources = dataSources.filter((source) => source.active);
	const allCategories: TestCategory[] = [];

	// Collect all categories from active sources
	for (const source of activeSources) {
		// Add source prefix to category names to avoid conflicts
		const prefixedCategories = source.categories.map((category) => ({
			...category,
			name:
				source.type === "static"
					? category.name
					: `${source.name}: ${category.name}`,
			file:
				source.type === "static"
					? category.file
					: `${source.name}/${category.file}`,
		}));
		allCategories.push(...prefixedCategories);
	}

	// Calculate combined stats
	const combinedStats = calculateStats(allCategories);

	// Create merged data stats
	const mergedStats: MergedDataStats = {
		totalSources: dataSources.length,
		activeSources: activeSources.length,
		totalTests: combinedStats.totalTests,
		totalAssertions: combinedStats.totalAssertions,
		totalCategories: allCategories.length,
		sourceBreakdown: activeSources.map((source) => ({
			sourceId: source.id,
			sourceName: source.name,
			testCount: source.stats.totalTests,
			categoryCount: source.categories.length,
		})),
	};

	return {
		categories: allCategories,
		stats: combinedStats,
		mergedStats,
	};
}

/**
 * Creates a data source from uploaded file data
 */
export function createDataSourceFromUpload(
	file: File,
	jsonData: GeneratedTest[],
	validationResult: UploadValidationResult,
): DataSource {
	const category = jsonToTestCategory(jsonData, file.name);
	const stats = calculateStats([category]);

	return {
		id: generateDataSourceId(),
		name: file.name.replace(/\.json$/i, ""),
		type: "uploaded",
		active: true,
		filename: file.name,
		uploadedAt: new Date(),
		categories: [category],
		stats,
		metadata: {
			fileSize: file.size,
			originalName: file.name,
		},
	};
}

/**
 * Generates a unique ID for data sources
 */
export function generateDataSourceId(): string {
	return `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a data source from GitHub repository data
 */
export function createDataSourceFromGitHub(repositoryData: {
	files: { name: string; content: any; url: string }[];
	repository: { owner: string; repo: string; branch?: string; path?: string };
	metadata: {
		loadedAt: Date;
		totalFiles: number;
		successfulFiles: number;
		source: "github";
	};
}): DataSource {
	const { files, repository, metadata } = repositoryData;

	// Process all JSON files into categories
	const categories: TestCategory[] = [];
	let totalTests = 0;
	let totalAssertions = 0;

	for (const file of files) {
		const validationResult = validateTestData(file.content, file.name);

		if (validationResult.isValid && Array.isArray(file.content)) {
			const category = jsonToTestCategory(file.content, file.name);
			categories.push(category);
			totalTests += validationResult.stats.testCount;
			totalAssertions += file.content.reduce(
				(sum, test) => sum + (test.expected?.count || 0),
				0,
			);
		}
	}

	const stats = calculateStats(categories);
	const repoName = `${repository.owner}/${repository.repo}`;
	const branchPath =
		repository.branch !== "main" ? `@${repository.branch}` : "";
	const pathSuffix = repository.path ? `/${repository.path}` : "";
	const sourceName = `${repoName}${branchPath}${pathSuffix}`;

	return {
		id: generateDataSourceId(),
		name: sourceName,
		type: "github",
		active: true,
		url: `https://github.com/${repository.owner}/${repository.repo}`,
		uploadedAt: metadata.loadedAt,
		categories,
		stats,
		metadata: {
			githubRepo: repoName,
			githubBranch: repository.branch || "main",
			lastFetched: metadata.loadedAt,
			originalName: `GitHub: ${sourceName}`,
		},
	};
}

/**
 * Creates the default static data source entry
 */
export function createStaticDataSource(
	categories: TestCategory[],
	stats: TestStats,
): DataSource {
	return {
		id: "static_default",
		name: "Built-in Test Data",
		type: "static",
		active: true,
		uploadedAt: new Date(), // Build time
		categories,
		stats,
		metadata: {
			originalName: "ccl-test-data",
		},
	};
}
