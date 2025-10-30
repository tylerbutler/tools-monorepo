/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { updatePackageJsonFileAsync } from "./packageJsonUtils.js";
/**
 * Sets the version of a group of packages, writing the new version in package.json. After the update, the packages are
 * reloaded so the in-memory data reflects the version changes.
 *
 * @param packages - An array of objects whose version should be updated.
 * @param version - The version to set.
 */
export async function setVersion(packages, version) {
    const translatedVersion = version;
    const setPackagePromises = [];
    for (const pkg of packages) {
        setPackagePromises.push(updatePackageJsonFileAsync(pkg.directory, async (json) => {
            json.version = translatedVersion.version;
        }));
    }
    await Promise.all(setPackagePromises);
    // Reload all the packages to refresh the in-memory data
    for (const pkg of packages) {
        pkg.reload();
    }
}
//# sourceMappingURL=versions.js.map