// Data merging utilities for combining multiple data sources
import type { GeneratedTest, TestCategory, TestStats } from "../data/types.js";
import type {
	DataSource,
	MergedDataStats,
	UploadValidationResult,
} from "../stores/dataSource.js";

// Security limits to prevent DoS attacks from malicious/corrupt files
const MAX_TESTS = 10_000;
const MAX_ARRAY_ITEMS = 100;

const _EMPTY_STATS: MergedDataStats = {
	totalSources: 0,
	activeSources: 0,
	totalTests: 0,
	totalAssertions: 0,
	totalCategories: 0,
	sourceBreakdown: [],
};

const EMPTY_UPLOAD_STATS: UploadValidationResult["stats"] = {
	testCount: 0,
	categoryCount: 0,
	functions: [],
	features: [],
	behaviors: [],
};

function createErrorResult(
	errors: string[],
	warnings: string[] = [],
): UploadValidationResult {
	return {
		isValid: false,
		errors,
		warnings,
		stats: { ...EMPTY_UPLOAD_STATS },
	};
}

function validateSchemaStructure(jsonData: unknown): {
	errors: string[];
	testsArray: unknown[] | null;
} {
	const errors: string[] = [];

	if (!jsonData || typeof jsonData !== "object" || Array.isArray(jsonData)) {
		errors.push(
			"JSON must be a CCL schema format object with $schema and tests properties",
		);
		return { errors, testsArray: null };
	}

	const data = jsonData as Record<string, unknown>;

	if (!data.$schema) {
		errors.push("Missing required $schema property in CCL format");
	}

	if (!(data.tests && Array.isArray(data.tests))) {
		errors.push("Missing or invalid 'tests' array in CCL format");
		return { errors, testsArray: null };
	}

	return { errors, testsArray: data.tests };
}

function validateTestObject(
	test: unknown,
	index: number,
	errors: string[],
): boolean {
	if (!test || typeof test !== "object") {
		errors.push(`Test at index ${index} is not a valid object`);
		return false;
	}

	const testObj = test as Record<string, unknown>;

	if (typeof testObj.name !== "string") {
		errors.push(`Test at index ${index} missing or invalid 'name' field`);
	}
	if (typeof testObj.input !== "string") {
		errors.push(`Test at index ${index} missing or invalid 'input' field`);
	}
	if (
		!testObj.expected ||
		typeof (testObj.expected as Record<string, unknown>).count !== "number"
	) {
		errors.push(
			`Test at index ${index} missing or invalid 'expected.count' field`,
		);
	}

	return true;
}

// Helper to process a single array field
function processArrayField(
	fieldName: string,
	fieldValue: unknown,
	targetSet: Set<string>,
	testName: unknown,
	warnings: string[],
): void {
	if (!fieldValue) {
		return;
	}

	if (!Array.isArray(fieldValue)) {
		warnings.push(
			`Test ${testName} has invalid '${fieldName}' field - should be array`,
		);
		return;
	}

	// Security: Limit array sizes
	if (fieldValue.length > MAX_ARRAY_ITEMS) {
		warnings.push(
			`Test ${testName} has excessive ${fieldName} (max ${MAX_ARRAY_ITEMS})`,
		);
		return;
	}

	for (const item of fieldValue) {
		targetSet.add(item as string);
	}
}

function collectTestArrays(
	test: Record<string, unknown>,
	warnings: string[],
	sets: {
		functions: Set<string>;
		features: Set<string>;
		behaviors: Set<string>;
	},
): void {
	processArrayField(
		"functions",
		test.functions,
		sets.functions,
		test.name,
		warnings,
	);
	processArrayField(
		"features",
		test.features,
		sets.features,
		test.name,
		warnings,
	);
	processArrayField(
		"behaviors",
		test.behaviors,
		sets.behaviors,
		test.name,
		warnings,
	);
}

/**
 * Validates uploaded JSON data to ensure it matches expected test format
 */
export function validateTestData(
	jsonData: unknown,
	_filename: string,
): UploadValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const { errors: schemaErrors, testsArray } =
		validateSchemaStructure(jsonData);
	errors.push(...schemaErrors);

	if (!testsArray) {
		return createErrorResult(errors, warnings);
	}

	if (testsArray.length === 0) {
		warnings.push("File contains no test data");
	}

	// Security: Check maximum array length to prevent DoS
	if (testsArray.length > MAX_TESTS) {
		errors.push(`Test count exceeds maximum allowed (${MAX_TESTS})`);
		return createErrorResult(errors, warnings);
	}

	const validTests: GeneratedTest[] = [];
	const sets = {
		functions: new Set<string>(),
		features: new Set<string>(),
		behaviors: new Set<string>(),
	};

	for (let i = 0; i < testsArray.length; i++) {
		const test = testsArray[i];

		if (!validateTestObject(test, i, errors)) {
			continue;
		}

		const testObj = test as Record<string, unknown>;
		collectTestArrays(testObj, warnings, sets);

		if (errors.length === 0) {
			validTests.push(testObj as unknown as GeneratedTest);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		stats: {
			testCount: validTests.length,
			categoryCount: 1,
			functions: Array.from(sets.functions),
			features: Array.from(sets.features),
			behaviors: Array.from(sets.behaviors),
		},
	};
}

/**
 * Converts JSON data to TestCategory format
 */
const JSON_EXTENSION_REGEX = /\.json$/i;

export function jsonToTestCategory(
	jsonData: GeneratedTest[],
	filename: string,
): TestCategory {
	const categoryName = filename
		.replace(JSON_EXTENSION_REGEX, "")
		.replace(/[-_]/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());

	return {
		name: categoryName,
		description: `Uploaded test category from ${filename}`,
		tests: jsonData,
		file: filename,
	};
}

function incrementCount(record: Record<string, number>, key: string): void {
	record[key] = (record[key] || 0) + 1;
}

function countTestAttributes(
	test: GeneratedTest,
	counts: {
		functionsCount: Record<string, number>;
		featuresCount: Record<string, number>;
		behaviorsCount: Record<string, number>;
	},
): number {
	const { functionsCount, featuresCount, behaviorsCount } = counts;

	for (const func of test.functions || []) {
		incrementCount(functionsCount, func);
	}

	for (const feature of test.features || []) {
		incrementCount(featuresCount, feature);
	}

	for (const behavior of test.behaviors || []) {
		incrementCount(behaviorsCount, behavior);
	}

	return test.expected.count || 0;
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
			totalAssertions += countTestAttributes(test, {
				functionsCount,
				featuresCount,
				behaviorsCount,
			});
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
	_validationResult: UploadValidationResult,
): DataSource {
	const category = jsonToTestCategory(jsonData, file.name);
	const stats = calculateStats([category]);

	return {
		id: generateDataSourceId(),
		name: file.name.replace(JSON_EXTENSION_REGEX, ""),
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
	return `ds_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a data source from GitHub repository data
 */
export function createDataSourceFromGitHub(repositoryData: {
	files: { name: string; content: unknown; url: string }[];
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
	let _totalTests = 0;
	let _totalAssertions = 0;

	for (const file of files) {
		const validationResult = validateTestData(file.content, file.name);

		if (validationResult.isValid && Array.isArray(file.content)) {
			const category = jsonToTestCategory(file.content, file.name);
			categories.push(category);
			_totalTests += validationResult.stats.testCount;
			_totalAssertions += file.content.reduce(
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
