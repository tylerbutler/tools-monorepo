/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { IBuildProject, IPackage } from "./types.js";
export declare const defaultSelectionKinds: readonly ["dir", "all"];
/**
 * A convenience type representing a glob string.
 */
export type GlobString = string;
/**
 * The criteria that should be used for selecting package-like objects from a collection.
 */
export interface PackageSelectionCriteria {
    /**
     * An array of workspaces whose packages are selected. All packages in the workspace _except_ the root package
     * will be selected. To include workspace roots, use the `workspaceRoots` property.
     *
     * Values should either be complete workspace names or micromatch glob strings. To select all workspaces, use `"*"`.
     * See https://www.npmjs.com/package/micromatch?activeTab=readme#extended-globbing for more details.
     *
     * Workspace names will be compared against all globs - if any match, the workspace will be selected.
     */
    workspaces: (GlobString | string)[];
    /**
     * An array of workspaces whose root packages are selected. Only the roots of each workspace will be included.
     *
     * Values should either be complete workspace names or micromatch glob strings. To select all workspaces, use `"*"`.
     * See https://www.npmjs.com/package/micromatch?activeTab=readme#extended-globbing for more details.
     *
     * Workspace names will be compared against all globs - if any match, the workspace will be selected.
     */
    workspaceRoots: (GlobString | string)[];
    /**
     * An array of release groups whose packages are selected. All packages in the release group _except_ the root package
     * will be selected. To include release group roots, use the `releaseGroupRoots` property.
     *
     * Values should either be complete release group names or micromatch glob strings. To select all release groups, use
     * `"*"`. See https://www.npmjs.com/package/micromatch?activeTab=readme#extended-globbing for more details.
     *
     * Workspace names will be compared against all globs - if any match, the workspace will be selected.
     */
    releaseGroups: (GlobString | string)[];
    /**
     * An array of release groups whose root packages are selected. Only the roots of each release group will be included.
     * Rootless release groups will never be selected with this criteria.
     *
     * The reserved string "\*" will select all packages when included in one of the criteria. If used, the "\*" value is
     * expected to be the only item in the selection array.
     */
    releaseGroupRoots: (GlobString | string)[];
    /**
     * If set, only selects the single package in this directory.
     */
    directory?: string | undefined;
    /**
     * If set, only selects packages that have changes when compared with the branch of this name.
     */
    changedSinceBranch?: string | undefined;
}
/**
 * A pre-defined {@link PackageSelectionCriteria} that selects all packages.
 */
export declare const AllPackagesSelectionCriteria: PackageSelectionCriteria;
/**
 * An empty {@link PackageSelectionCriteria} that selects no packages.
 */
export declare const EmptySelectionCriteria: PackageSelectionCriteria;
/**
 * The criteria that should be used for filtering package-like objects from a collection.
 */
export interface PackageFilterOptions {
    /**
     * If set, filters IN packages whose scope matches the strings provided.
     */
    scope?: string[] | undefined;
    /**
     * If set, filters OUT packages whose scope matches the strings provided.
     */
    skipScope?: string[] | undefined;
    /**
     * If set, filters private packages in/out.
     */
    private: boolean | undefined;
}
/**
 * Selects packages from the BuildProject based on the selection criteria. The selected packages will be filtered by the
 * filter criteria if provided.
 *
 * @param buildProject - The BuildProject.
 * @param selection - The selection criteria to use to select packages.
 * @param filter - An optional filter criteria to filter selected packages by.
 * @returns An object containing the selected packages and the filtered packages.
 */
export declare function selectAndFilterPackages<P extends IPackage>(buildProject: IBuildProject<P>, selection: PackageSelectionCriteria, filter?: PackageFilterOptions): Promise<{
    selected: P[];
    filtered: P[];
}>;
/**
 * Convenience type that contains only the properties of a package that are needed for filtering.
 */
export interface FilterablePackage {
    name: string;
    private?: boolean | undefined;
}
/**
 * Filters a list of packages by the filter criteria.
 *
 * @param packages - An array of packages to be filtered.
 * @param filters - The filter criteria to filter the packages by.
 * @typeParam T - The type of the package-like objects being filtered.
 * @returns An array containing only the filtered items.
 */
export declare function filterPackages<T extends FilterablePackage>(packages: T[], filters: PackageFilterOptions): Promise<T[]>;
/**
 * Adds all the items of an iterable to a set.
 *
 * @param set - The set to which items will be added.
 * @param iterable - The iterable containing items to add to the set.
 */
export declare function addAllToSet<T>(set: Set<T>, iterable: Iterable<T>): void;
//# sourceMappingURL=filter.d.ts.map