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
export {
	SortTsconfigsPolicy,
	type SortTsconfigsPolicyConfig,
} from "./policy.js";

// necessary for oclif
export { run } from "@oclif/core";
