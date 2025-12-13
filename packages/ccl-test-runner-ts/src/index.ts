// Capabilities configuration

export type {
	CCLBehavior,
	CCLFeature,
	CCLFunction,
	CCLVariant,
	ImplementationCapabilities,
} from "./capabilities.js";
export {
	ALL_FUNCTIONS,
	ALL_VARIANTS,
	BEHAVIOR_CONFLICTS,
	CapabilityValidationError,
	createCapabilities,
	getConflictingBehavior,
	getStubCapabilities,
	STANDARD_FEATURES,
	validateCapabilities,
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

// Errors
export { NotYetImplementedError } from "./errors.js";

// Test data types (derived from JSON schema)
export type {
	TestCase,
	TestConflicts,
	TestExpected,
	TestFile,
} from "./schema-validation.js";
// JSON schemas (for runtime validation if needed)
export { testCaseSchema, testFileSchema } from "./schema-validation.js";
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
