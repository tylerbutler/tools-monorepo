/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { type WorkspaceDefinition } from "./config.js";
import type { AdditionalPackageProps, IPackage, IWorkspace, PackageDependency, PackageJson, PackageName, ReleaseGroupName } from "./types.js";
/**
 * A base class for npm packages. A custom type can be used for the package.json schema, which is useful
 * when the package.json has custom keys/values.
 *
 * @typeParam J - The package.json type to use. This type must extend the {@link PackageJson} type defined in this
 * package.
 * @typeParam TAddProps - Additional typed props that will be added to the package object.
 */
export declare abstract class PackageBase<J extends PackageJson = PackageJson, TAddProps extends AdditionalPackageProps = undefined> implements IPackage<J> {
    /**
     * {@inheritDoc IPackage.packageJsonFilePath}
     */
    readonly packageJsonFilePath: string;
    /**
     * {@inheritDoc IPackage.packageManager}
     */
    /**
     * {@inheritDoc IPackage.workspace}
     */
    readonly workspace: IWorkspace;
    /**
     * {@inheritDoc IPackage.isWorkspaceRoot}
     */
    readonly isWorkspaceRoot: boolean;
    /**
     * {@inheritDoc IPackage.releaseGroup}
     */
    readonly releaseGroup: ReleaseGroupName;
    /**
     * {@inheritDoc IPackage.isReleaseGroupRoot}
     */
    isReleaseGroupRoot: boolean;
    private static packageCount;
    private static readonly colorFunction;
    private readonly _indent;
    private _packageJson;
    private readonly packageId;
    private get color();
    /**
     * Create a new package from a package.json file. **Prefer the .load method to calling the contructor directly.**
     *
     * @param packageJsonFilePath - The path to a package.json file.
     * @param packageManager - The package manager used by the workspace.
     * @param isWorkspaceRoot - Set to true if this package is the root of a workspace.
     * @param additionalProperties - An object with additional properties that should be added to the class. This is
     * useful to augment the package class with additional properties.
     */
    constructor(
    /**
     * {@inheritDoc IPackage.packageJsonFilePath}
     */
    packageJsonFilePath: string, 
    /**
     * {@inheritDoc IPackage.packageManager}
     */
    /**
     * {@inheritDoc IPackage.workspace}
     */
    workspace: IWorkspace, 
    /**
     * {@inheritDoc IPackage.isWorkspaceRoot}
     */
    isWorkspaceRoot: boolean, 
    /**
     * {@inheritDoc IPackage.releaseGroup}
     */
    releaseGroup: ReleaseGroupName, 
    /**
     * {@inheritDoc IPackage.isReleaseGroupRoot}
     */
    isReleaseGroupRoot: boolean, additionalProperties?: TAddProps);
    /**
     * {@inheritDoc IPackage.combinedDependencies}
     */
    get combinedDependencies(): Generator<PackageDependency, void>;
    /**
     * {@inheritDoc IPackage.directory}
     */
    get directory(): string;
    /**
     * {@inheritDoc IPackage.name}
     */
    get name(): PackageName;
    /**
     * {@inheritDoc IPackage.nameColored}
     */
    get nameColored(): string;
    /**
     * {@inheritDoc IPackage.packageJson}
     */
    get packageJson(): J;
    /**
     * {@inheritDoc IPackage.private}
     */
    get private(): boolean;
    /**
     * {@inheritDoc IPackage.version}
     */
    get version(): string;
    /**
     * {@inheritDoc IPackage.savePackageJson}
     */
    savePackageJson(): Promise<void>;
    /**
     * Reload the package from the on-disk package.json.
     */
    reload(): void;
    toString(): string;
    /**
     * {@inheritDoc IPackage.getScript}
     */
    getScript(name: string): string | undefined;
    /**
     * {@inheritDoc Installable.checkInstall}
     */
    checkInstall(): Promise<true | string[]>;
    /**
     * Installs the dependencies for all packages in this package's workspace.
     */
    install(updateLockfile: boolean): Promise<boolean>;
}
/**
 * Loads an {@link IPackage} from a {@link WorkspaceDefinition}.
 *
 * @param packageJsonFilePath - The path to the package.json for the package being loaded.
 * @param packageManager - The package manager to use.
 * @param isWorkspaceRoot - Set to `true` if the package is a workspace root package.
 * @param workspaceDefinition - The workspace definition.
 * @param workspace - The workspace that this package belongs to.
 * @returns A loaded {@link IPackage} instance.
 */
export declare function loadPackageFromWorkspaceDefinition(packageJsonFilePath: string, isWorkspaceRoot: boolean, workspaceDefinition: WorkspaceDefinition, workspace: IWorkspace): IPackage;
//# sourceMappingURL=package.d.ts.map