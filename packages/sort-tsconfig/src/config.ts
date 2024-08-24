import type { OrderList } from "./api.js";

/**
 * Configuration for the sort-tsconfig command.
 */
export interface SortTsconfigConfiguration {
	/**
	 * An array of configuration keys in the order that they should be sorted.
	 *
	 * @defaultValue - {@link defaultSortOrder}
	 */
	order: OrderList;
}
