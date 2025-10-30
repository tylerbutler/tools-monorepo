/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { type ReleaseGroupDefinition } from "./config.js";
import type { IPackage, IReleaseGroup, IWorkspace, ReleaseGroupName } from "./types.js";
/**
 * {@inheritDoc IReleaseGroup}
 */
export declare class ReleaseGroup implements IReleaseGroup {
    /**
     * {@inheritDoc IReleaseGroup.workspace}
     */
    workspace: IWorkspace;
    /**
     * {@inheritDoc IReleaseGroup.rootPackage}
     */
    readonly rootPackage?: IPackage | undefined;
    /**
     * {@inheritDoc IReleaseGroup.name}
     */
    readonly name: ReleaseGroupName;
    /**
     * {@inheritDoc IReleaseGroup.adoPipelineUrl}
     */
    readonly adoPipelineUrl: string | undefined;
    constructor(name: string, releaseGroupDefinition: ReleaseGroupDefinition, 
    /**
     * {@inheritDoc IReleaseGroup.workspace}
     */
    workspace: IWorkspace, 
    /**
     * {@inheritDoc IReleaseGroup.rootPackage}
     */
    rootPackage?: IPackage | undefined);
    /**
     * {@inheritDoc IReleaseGroup.packages}
     */
    readonly packages: IPackage[];
    /**
     * {@inheritDoc IReleaseGroup.version}
     */
    get version(): string;
    /**
     * {@inheritDoc IReleaseGroup.releaseGroupDependencies}
     */
    get releaseGroupDependencies(): IReleaseGroup[];
    toString(): string;
    /**
     * Synchronously reload all of the packages in the release group.
     */
    reload(): void;
}
//# sourceMappingURL=releaseGroup.d.ts.map