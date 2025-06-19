/**
 * CLI and programmatic API for sorting TypeScript configuration files.
 *
 * @remarks
 * sort-tsconfig provides both a command-line interface and programmatic API for
 * sorting tsconfig.json files according to configurable rules. It ensures
 * consistent ordering of compiler options and top-level properties, making
 * configuration files easier to read and maintain.
 *
 * @packageDocumentation
 */

export {
	isSorted,
	sortTsconfigFile,
	type SortTsconfigResult,
	TsConfigSorter,
} from "./api.js";
export type { SortTsconfigConfiguration } from "./config.js";
export {
	defaultSortOrder,
	type OrderList,
	preferredSortOrder,
} from "./orders.js";
export { SortTsconfigsPolicy } from "./policy.js";

// necessary for oclif
export { run } from "@oclif/core";
