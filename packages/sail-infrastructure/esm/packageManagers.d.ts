/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { IPackageManager, PackageManagerInstallName, PackageManagerName } from "./types.js";
export declare class PackageManager implements IPackageManager {
    readonly name: PackageManagerName;
    private readonly installName;
    /**
     * Instantiates a new package manager object. Prefer the {@link createPackageManager} function, which retuns an
     * {@link IPackageManager}, to calling the constructor directly.
     */
    constructor(name: PackageManagerName, installName: PackageManagerInstallName);
    readonly lockfileNames: string[];
    /**
     * {@inheritdoc IPackageManager.getInstallCommandWithArgs}
     */
    getInstallCommandWithArgs(updateLockfile: boolean): string[];
}
/**
 * Create a new package manager instance.
 */
export declare function detectPackageManager(cwd?: string): IPackageManager;
//# sourceMappingURL=packageManagers.d.ts.map