/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { type SimpleGit } from "simple-git";
import { type BuildProjectConfig, type BuildProjectConfigV2 } from "./config.js";
import type { IBuildProject, IPackage, IReleaseGroup, IWorkspace, PackageName, ReleaseGroupName, WorkspaceName } from "./types.js";
/**
 * {@inheritDoc IBuildProject}
 */
export declare class BuildProject<P extends IPackage> implements IBuildProject<P> {
    /**
     * {@inheritDoc IBuildProject.upstreamRemotePartialUrl}
     */
    readonly upstreamRemotePartialUrl?: string | undefined;
    /**
     * The absolute path to the root of the build project. This is the path where the config file is located, if one
     * exists.
     */
    readonly root: string;
    /**
     * {@inheritDoc IBuildProject.configuration}
     */
    readonly configuration: BuildProjectConfig;
    readonly configurationSource: string;
    /**
     * The absolute path to the config file.
     */
    private readonly configFilePath;
    /**
     * @param searchPath - The path that should be searched for a BuildProject config file.
     * @param infer - Set to true to always infer the build project config.
     * @param gitRepository - A SimpleGit instance rooted in the root of the Git repository housing the BuildProject. This
     * should be set to false if the BuildProject is not within a Git repository.
     */
    constructor(searchPath: string, infer?: boolean, 
    /**
     * {@inheritDoc IBuildProject.upstreamRemotePartialUrl}
     */
    upstreamRemotePartialUrl?: string | undefined);
    private readonly _workspaces;
    /**
     * {@inheritDoc IBuildProject.workspaces}
     */
    get workspaces(): Map<WorkspaceName, IWorkspace>;
    private readonly _releaseGroups;
    /**
     * {@inheritDoc IBuildProject.releaseGroups}
     */
    get releaseGroups(): Map<ReleaseGroupName, IReleaseGroup>;
    private _packages;
    /**
     * {@inheritDoc IBuildProject.packages}
     */
    get packages(): ReadonlyMap<PackageName, P>;
    /**
     * {@inheritDoc IBuildProject.relativeToRepo}
     */
    relativeToRepo(p: string): string;
    /**
     * Reload the BuildProject by calling `reload` on each workspace in the repository.
     */
    reload(): void;
    private gitRepository;
    private _checkedForGitRepo;
    /**
     * {@inheritDoc IBuildProject.getGitRepository}
     */
    getGitRepository(): Promise<Readonly<SimpleGit>>;
    /**
     * {@inheritDoc IBuildProject.getPackageReleaseGroup}
     */
    getPackageReleaseGroup(pkg: Readonly<P>): Readonly<IReleaseGroup>;
}
/**
 * Generates a BuildProjectConfig by searching searchPath and below for workspaces. If any workspaces are found, they're
 * automatically added to the config, and a single release group is created within the workspace. Both the workspace and
 * the release group will be named the "basename" of the workspace path.
 *
 * Generated configs use the latest config version.
 */
export declare function generateBuildProjectConfig(searchPath: string): BuildProjectConfigV2;
/**
 * Searches for a BuildProject config file and loads the project from the config if found.
 *
 * @typeParam P - The type to use for Packages.
 * @param searchPath - The path to start searching for a BuildProject config.
 * @param infer - Set to true to always infer the build project config.
 * @param upstreamRemotePartialUrl - A partial URL to the upstream repo. This is used to find the local git remote that
 * corresponds to the upstream repo.
 * @returns The loaded BuildProject.
 */
export declare function loadBuildProject<P extends IPackage>(searchPath: string, infer?: boolean, upstreamRemotePartialUrl?: string): IBuildProject<P>;
/**
 * Returns an object containing all the packages, release groups, and workspaces that a given set of packages depends
 * on. This function only considers packages in the BuildProject repo.
 */
export declare function getAllDependencies(repo: IBuildProject, packages: IPackage[]): {
    packages: IPackage[];
    releaseGroups: IReleaseGroup[];
    workspaces: IWorkspace[];
};
//# sourceMappingURL=buildProject.d.ts.map