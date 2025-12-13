// Capabilities configuration
export {
	ALL_FUNCTIONS,
	ALL_VARIANTS,
	BEHAVIOR_CONFLICTS,
	CapabilityValidationError,
	STANDARD_FEATURES,
	createCapabilities,
	getConflictingBehavior,
	getStubCapabilities,
	validateCapabilities,
} from "./capabilities.js";
export type {
	CCLBehavior,
	CCLFeature,
	CCLFunction,
	CCLVariant,
	ImplementationCapabilities,
} from "./capabilities.js";

// CCL functions
export {
	buildHierarchy,
	getAllFunctions,
	getImplementedFunctions,
	parse,
	parseIndented,
	parseToObject,
} from "./ccl.js";

// Download utilities
export type { DownloadOptions, DownloadResult } from "./download.js";
export {
	downloadSchema,
	downloadTestData,
	getDefaultTestDataPath,
} from "./download.js";

// Errors
export { NotYetImplementedError } from "./errors.js";

// Test data types (derived from JSON schema)
export type {
	TestCase,
	TestConflicts,
	TestExpected,
	TestFile,
} from "./schema-validation.js";

// Test data loading
export type {
	LoadedTestData,
	LoadTestDataOptions,
	TestFilterResult,
	TestStats,
} from "./test-data.js";
export {
	getTestStats,
	groupTestsByFunction,
	groupTestsBySourceTest,
	loadAllTests,
	loadTestData,
	shouldRunTest,
} from "./test-data.js";

// CCL types
export type {
	CCLObject,
	CCLValue,
	Entry,
	HierarchyResult,
	ParseError,
	ParseResult,
} from "./types.js";

// JSON schemas (for runtime validation if needed)
export { testCaseSchema, testFileSchema } from "./schema-validation.js";
