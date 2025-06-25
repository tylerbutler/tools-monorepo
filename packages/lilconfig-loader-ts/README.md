# @tylerbu/lilconfig-loader-ts

A TypeScript loader for [lilconfig](https://www.npmjs.com/package/lilconfig), enabling you to load TypeScript
configuration files in lilconfig.

## Installation

```
npm install @tylerbu/lilconfig-loader-ts
```

## Usage

```ts
import { lilconfig } from "lilconfig";
import { TypeScriptLoader } from "@tylerbu/lilconfig-loader-ts";

const moduleName = "myModuleName";
const explorer = lilconfig(moduleName, {
  searchPlaces: [
    "package.json",
    `.${moduleName}rc`,
    `.${moduleName}rc.json`,
    `.${moduleName}rc.ts`,
    `.${moduleName}rc.js`,
    `${moduleName}.config.ts`,
    `${moduleName}.config.js`,
  ],
  loaders: {
    ".ts": TypeScriptLoader,
  },
});
```
