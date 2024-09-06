---
"@tylerbu/cli-api": minor
---

Functions for processing JSON

The following functions are now available to work with JSON files:

```ts
export function readJsonWithIndent(filePath: PathLike): Promise<{
    json: unknown;
    indent: Indent;
}>;

export function updatePackageJsonFile<T extends PackageJson = PackageJson>(
  packagePath: string,
  packageTransformer: PackageTransformer,
  options?: JsonWriteOptions): Promise<void>;
```