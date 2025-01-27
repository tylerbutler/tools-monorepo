# lilconfig-loader-ts

A TypeScript loader for lilconfig, enabling you to use TypeScript configuration files.

## Installation

```
npm install lilconfig-loader-ts
```

## Usage

```ts
import { lilconfig } from 'lilconfig';
import { TypeScriptLoader } from 'lilconfig-loader-ts';

const moduleName = 'myModuleName';
const explorer = lilconfig(moduleName, {
  searchPlaces: [
    'package.json',
    `.${moduleName}rc`,
    `.${moduleName}rc.json`,
    `.${moduleName}rc.ts`,
    `.${moduleName}rc.js`,
    `${moduleName}.config.ts`,
    `${moduleName}.config.js`,
  ],
  loaders: {
    '.ts': TypeScriptLoader,
  },
});
```
