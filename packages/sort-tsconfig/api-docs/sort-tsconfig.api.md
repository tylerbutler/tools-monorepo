## API Report File for "sort-tsconfig"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

// @beta
export function isSorted(tsconfig: string): boolean;

// @beta
export type OrderList = string[];

// @beta
export function sortTsconfigFile(tsconfigPath: string, write: boolean): SortTsconfigResult;

// @beta
export interface SortTsconfigResult {
    alreadySorted: boolean;
    tsconfig: string;
}

// @beta
export class TsConfigSorter {
    constructor(order: OrderList);
    isSorted(tsconfig: string): boolean;
    sortTsconfigFile(tsconfigPath: string, write: boolean): SortTsconfigResult;
}

// (No @packageDocumentation comment for this package)

```