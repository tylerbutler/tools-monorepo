/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { SemVer } from "semver";
import type { IPackage, PackageJson } from "./types.js";
/**
 * Sets the version of a group of packages, writing the new version in package.json. After the update, the packages are
 * reloaded so the in-memory data reflects the version changes.
 *
 * @param packages - An array of objects whose version should be updated.
 * @param version - The version to set.
 */
export declare function setVersion<J extends PackageJson>(packages: IPackage<J>[], version: SemVer): Promise<void>;
//# sourceMappingURL=versions.d.ts.map