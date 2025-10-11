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

// necessary for oclif
export { run } from "@oclif/core";
export {
	isSorted,
	type SortTsconfigResult,
	sortTsconfigFile,
	TsConfigSorter,
} from "./api.ts";
export type { SortTsconfigConfiguration } from "./config.ts";
export {
	defaultSortOrder,
	type OrderList,
	preferredSortOrder,
} from "./orders.ts";
export { SortTsconfigsPolicy } from "./policy.ts";
