"use strict";
/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports._dirname = void 0;
// Problem:
//   - `__dirname` is not defined in ESM
//   - `import.meta.url` is not defined in CJS
// Solution:
//   - Export '__dirname' from a .cjs file in the same directory.
//
// Note that *.cjs files are always CommonJS, but can be imported from ESM.
exports._dirname = __dirname;
//# sourceMappingURL=dirname.cjs.map