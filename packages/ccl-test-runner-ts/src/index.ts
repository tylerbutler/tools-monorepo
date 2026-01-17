/**
 * CCL Test Runner - TypeScript test runner for CCL implementations.
 *
 * ## Package Exports
 *
 * - `ccl-test-runner-ts` - Main API: capabilities, test data loading, CCL functions
 * - `ccl-test-runner-ts/vitest` - Vitest integration for running CCL test suite
 * - `ccl-test-runner-ts/types` - Type-only exports for CCL domain types
 *
 * @example Import CCL domain types (type-only)
 * ```typescript
 * import type { Entry, CCLObject, ParseResult } from 'ccl-test-runner-ts/types';
 * ```
 *
 * @example Import vitest integration
 * ```typescript
 * import { defineCCLTests, Behavior, Variant } from 'ccl-test-runner-ts/vitest';
 * ```
 */

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
	Behavior,
	CapabilityValidationError,
	createCapabilities,
	DefaultBehaviors,
	getConflictingBehavior,
	getStubCapabilities,
	STANDARD_FEATURES,
	Variant,
	validateCapabilities,
} from "./capabilities.js";

// CCL functions (stub implementations)
export {
	buildHierarchy,
	getAllFunctions,
	getImplementedFunctions,
	parse,
	parseIndented,
	parseToObject,
} from "./ccl.js";

// Test data download
export type { DownloadOptions, DownloadResult } from "./download.js";
export { downloadSchema, downloadTestData } from "./download.js";

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

// Type utilities (runtime functions)
export {
	isHierarchyResult,
	isParseResult,
	normalizeBuildHierarchyFunction,
	normalizeParseFunction,
} from "./types.js";

// NOTE: CCL domain types (Entry, CCLObject, ParseResult, etc.) and function
// type signatures are exported from 'ccl-test-runner-ts/types' for type-only
// imports. This ensures consumers use `import type` for type definitions.
