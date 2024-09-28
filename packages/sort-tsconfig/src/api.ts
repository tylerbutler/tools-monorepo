import { readFileSync, writeFileSync } from "node:fs";
import detectIndent from "detect-indent";
import { sortJsonc } from "sort-jsonc";
import JSONC from "tiny-jsonc";
import type { TsConfigJson } from "type-fest";
import { type OrderList, defaultSortOrder } from "./orders.js";

/**
 * Returns a map of each item in the order list to its sort index.
 */
function getOrderMap(order: OrderList): Map<string, number> {
	const orderMap: Map<string, number> = new Map();
	for (const [index, key] of order.entries()) {
		// Only add the index for the first item - subsequent indices will be ignored.
		if (!orderMap.has(key)) {
			orderMap.set(key, index);
		}
	}
	return orderMap;
}

/**
 * The result of a tsconfig sort operation.
 *
 * @beta
 */
export interface SortTsconfigResult {
	/**
	 * Will be `true` if the file was already sorted.
	 */
	alreadySorted: boolean;

	/**
	 * The sorted tsconfig string.
	 */
	tsconfig: string;
}

/**
 * Convenience class used to sort a tsconfig using a custom order.
 *
 * @beta
 */
export class TsConfigSorter {
	private _order: OrderList;
	private _orderMap: Map<string, number>;

	public constructor(order: OrderList) {
		this._order = order;
		this._orderMap = getOrderMap(order);
	}

	/**
	 * Gets the sort index of a key.
	 *
	 * @param key - The key to check.
	 * @returns The sort index. A number is always returned. If the key is not found, the returned index will be greater
	 * than the total number of known sort keys.
	 */
	private getSortIndex(key: string | undefined): number {
		// get the expected sort index of the key; if not found, (unexpected key) use a number greater than any sortIndex,
		// assuming those items will always be at the bottom
		return key === undefined
			? this._orderMap.size + 1
			: this._orderMap.get(key) ?? this._orderMap.size + 1;
	}

	/**
	 * Returns true if an object is sorted.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: other types are very iconvenient here.
	private objectIsSorted(obj: Record<string, any>): boolean {
		const properties = [...Object.entries(obj)];
		let index = -1;
		for (const [key, value] of Object.entries(obj)) {
			index++;

			// If the value is an object, recursively check the object's sort.
			if (isObject(value) && !this.objectIsSorted(value)) {
				return false;
			}

			const nextKey =
				index >= properties.length - 1 ? undefined : properties[index + 1]?.[0];
			const sortIndex = this.getSortIndex(key);
			const nextSortIndex = this.getSortIndex(nextKey);
			if (sortIndex > nextSortIndex) {
				return false;
			}
		}
		return true;
	}
	/**
	 * Returns true if a tsconfig file is sorted; false otherwise.
	 *
	 * @param tsconfig - Path to a tsconfig file.
	 *
	 * @beta
	 */
	public isSorted(tsconfig: string): boolean {
		// const { default: jsonc } = await JSONC;
		const content = readFileSync(tsconfig, { encoding: "utf8" });
		const currentValue: TsConfigJson = JSONC.parse(content);
		const result = this.objectIsSorted(currentValue);
		return result;
	}

	/**
	 * Sorts a tsconfig file, optionally writing the changes back to the file.
	 *
	 * @param tsconfigPath - path to a tsconfig file
	 * @param write - if true, the file will be overwritten with sorted content
	 * @returns An object containing a boolean indicating whether the file was already sorted and the sorted tsconfig
	 * string.
	 */
	public sortTsconfigFile(
		tsconfigPath: string,
		write: boolean,
	): SortTsconfigResult {
		const sorted = isSorted(tsconfigPath);

		const origString = readFileSync(tsconfigPath).toString();
		const { indent } = detectIndent(origString);
		const sortedString = sortJsonc(origString, {
			sort: this._order,
			spaces: indent,
		});

		if (!sorted && write) {
			writeFileSync(tsconfigPath, sortedString);
		}

		return {
			alreadySorted: sorted,
			tsconfig: sortedString,
		};
	}
}

const defaultSorter = new TsConfigSorter(defaultSortOrder);

/**
 * Returns true if a tsconfig file is sorted according to the default sort order; false otherwise.
 *
 * @param tsconfig - Path to a tsconfig file.
 *
 * @remarks
 *
 * To use a custom sort order, create a {@link TsConfigSorter} and use methods on that class.
 *
 * @beta
 */
export function isSorted(tsconfig: string): boolean {
	return defaultSorter.isSorted(tsconfig);
}

/**
 * Sorts a tsconfig file, optionally writing the changes back to the file.
 *
 * @param tsconfigPath - path to a tsconfig file
 * @param write - if true, the file will be overwritten with sorted content
 * @returns An object containing a boolean indicating whether the file was already sorted and the sorted tsconfig
 * string.
 *
 * @remarks
 *
 * To use a custom sort order, create a {@link TsConfigSorter} and use methods on that class.
 *
 * @beta
 */
export function sortTsconfigFile(
	tsconfigPath: string,
	write: boolean,
): SortTsconfigResult {
	return defaultSorter.sortTsconfigFile(tsconfigPath, write);
}

/**
 * Returns true if the value is an object.
 */
// biome-ignore lint/suspicious/noExplicitAny: any is the correct type here because this function's purpose is to discriminate types
function isObject(value: any): boolean {
	return value && typeof value === "object" && value.constructor === Object;
}
