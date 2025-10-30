/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { WorkspaceDefinition } from "./config.js";
import type { IBuildProject, IPackage, IPackageManager, IReleaseGroup, IWorkspace, ReleaseGroupName, WorkspaceName } from "./types.js";
/**
 * {@inheritDoc IWorkspace}
 */
export declare class Workspace implements IWorkspace {
    /**
     * {@inheritDoc IWorkspace.buildProject}
     */
    readonly buildProject: IBuildProject;
    /**
     * {@inheritDoc IWorkspace.name}
     */
    readonly name: WorkspaceName;
    /**
     * {@inheritDoc IWorkspace.releaseGroups}
     */
    readonly releaseGroups: Map<ReleaseGroupName, IReleaseGroup>;
    /**
     * {@inheritDoc IWorkspace.rootPackage}
     */
    readonly rootPackage: IPackage;
    /**
     * {@inheritDoc IWorkspace.packages}
     */
    readonly packages: IPackage[];
    /**
     * {@inheritDoc IWorkspace.directory}
     */
    readonly directory: string;
    /**
     * {@inheritDoc IWorkspace.packageManager}
     */
    readonly packageManager: IPackageManager;
    /**
     * Construct a new workspace object.
     *
     * @param name - The name of the workspace.
     * @param definition - The definition of the workspace.
     * @param root - The path to the root of the workspace.
     */
    private constructor();
    /**
     * {@inheritDoc Installable.checkInstall}
     */
    checkInstall(): Promise<true | string[]>;
    /**
     * The package manager used to manage this package. This is an async operation.
     */
    /**
     * {@inheritDoc Installable.install}
     */
    /**
     * {@inheritDoc Installable.install}
     */
    install(updateLockfile: boolean): Promise<boolean>;
    /**
     * Synchronously reload all of the packages in the workspace.
     */
    reload(): void;
    toString(): string;
    /**
     * Load a workspace from a {@link WorkspaceDefinition}.
     *
     * @param name - The name of the workspace.
     * @param definition - The definition for the workspace.
     * @param root - The path to the root of the workspace.
     * @param buildProject - The build project that the workspace belongs to.
     * @returns A loaded {@link IWorkspace}.
     */
    static load(name: string, definition: WorkspaceDefinition, root: string, buildProject: IBuildProject): IWorkspace;
}
//# sourceMappingURL=workspace.d.ts.map