// necessary for oclif
export { run } from "@oclif/core";
export {
	isSorted,
	type SortTsconfigResult,
	sortTsconfigFile,
	TsConfigSorter,
} from "./api.js";
export type { SortTsconfigConfiguration } from "./config.js";
export {
	defaultSortOrder,
	type OrderList,
	preferredSortOrder,
} from "./orders.js";
export { SortTsconfigsPolicy } from "./policy.js";
