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
	Behavior,
	BEHAVIOR_CONFLICTS,
	CapabilityValidationError,
	createCapabilities,
	DefaultBehaviors,
	getConflictingBehavior,
	getStubCapabilities,
	STANDARD_FEATURES,
	validateCapabilities,
	Variant,
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

// Test data paths
export { getBundledTestDataPath } from "./download.js";

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
	AnyBuildHierarchyFn,
	AnyParseFn,
	BuildHierarchyFn,
	BuildHierarchyResultFn,
	CCLObject,
	CCLValue,
	ComposeFn,
	Entry,
	FilterFn,
	GetBoolFn,
	GetFloatFn,
	GetIntFn,
	GetListFn,
	GetStringFn,
	HierarchyResult,
	ParseError,
	ParseFn,
	ParseResult,
	ParseResultFn,
} from "./types.js";

// Type utilities
export {
	isHierarchyResult,
	isParseResult,
	normalizeBuildHierarchyFunction,
	normalizeParseFunction,
} from "./types.js";
