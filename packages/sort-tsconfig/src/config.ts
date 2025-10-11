import type { OrderList } from "./orders.ts";

/**
 * Configuration for the sort-tsconfig command.
 *
 * @beta
 */
export interface SortTsconfigConfiguration {
	/**
	 * An array of configuration keys in the order that they should be sorted.
	 *
	 * @defaultValue - {@link defaultSortOrder}
	 */
	order: OrderList;
}
