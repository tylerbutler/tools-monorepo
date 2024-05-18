---
"@tylerbu/cli-api": minor
---

New feature: tsconfig sorting APIs

cli-api now provides the following exported APIs and supporting types:

```ts
// Checks if a tsconfig file is sorted.
export function isSorted(tsconfig: string): boolean;

// Sorts a file in place. The sorted contents is always returned; use `write: true` to write file.
export function sortTsconfigFile(tsconfigPath: string, write: boolean): SortTsconfigResult;

// Result of a tsconfig sort operation.
export interface SortTsconfigResult {
    // Will be `true` if the file was already sorted.
    alreadySorted: boolean;
    // The sorted tsconfig string.
    tsconfig: string;
}
```
