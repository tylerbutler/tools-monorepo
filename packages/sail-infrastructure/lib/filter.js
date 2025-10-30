/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import * as path from "node:path";
import mm from "micromatch";
import { getChangedSinceRef, getRemote } from "./git.js";
export const defaultSelectionKinds = ["dir", "all"];
/**
 * A pre-defined {@link PackageSelectionCriteria} that selects all packages.
 */
export const AllPackagesSelectionCriteria = {
    workspaces: ["*"],
    workspaceRoots: ["*"],
    releaseGroups: [],
    releaseGroupRoots: [],
    directory: undefined,
    changedSinceBranch: undefined,
};
/**
 * An empty {@link PackageSelectionCriteria} that selects no packages.
 */
export const EmptySelectionCriteria = {
    workspaces: [],
    workspaceRoots: [],
    releaseGroups: [],
    releaseGroupRoots: [],
    directory: undefined,
    changedSinceBranch: undefined,
};
/**
 * Selects packages from a BuildProject based on the selection criteria.
 *
 * @param buildProject - The BuildProject to select from.
 * @param selection - The selection criteria to use to select packages.
 * @returns A `Set` containing the selected packages.
 */
const selectPackagesFromRepo = async (buildProject, selection) => {
    const selected = new Set();
    if (selection.changedSinceBranch !== undefined) {
        const git = await buildProject.getGitRepository();
        const remote = await getRemote(git, buildProject.upstreamRemotePartialUrl);
        if (remote === undefined) {
            throw new Error(`Can't find a remote with ${buildProject.upstreamRemotePartialUrl}`);
        }
        const { packages } = await getChangedSinceRef(buildProject, selection.changedSinceBranch, remote);
        addAllToSet(selected, packages);
    }
    if (selection.directory !== undefined) {
        const selectedAbsolutePath = path.join(selection.directory === "."
            ? process.cwd()
            : path.resolve(buildProject.root, selection.directory));
        const dirPackage = [...buildProject.packages.values()].find((p) => p.directory === selectedAbsolutePath);
        if (dirPackage === undefined) {
            throw new Error(`Cannot find package with directory: ${selectedAbsolutePath}`);
        }
        selected.add(dirPackage);
        return selected;
    }
    // Select workspace and workspace root packages
    for (const workspace of buildProject.workspaces.values()) {
        if (selection.workspaces.length > 0 && mm.isMatch(workspace.name, selection.workspaces)) {
            addAllToSet(selected, workspace.packages.filter((p) => !p.isWorkspaceRoot));
        }
        if (selection.workspaceRoots.length > 0 &&
            mm.isMatch(workspace.name, selection.workspaceRoots)) {
            addAllToSet(selected, workspace.packages.filter((p) => p.isWorkspaceRoot));
        }
    }
    // Select release group and release group root packages
    for (const releaseGroup of buildProject.releaseGroups.values()) {
        if (selection.releaseGroups.length > 0 &&
            mm.isMatch(releaseGroup.name, selection.releaseGroups)) {
            addAllToSet(selected, releaseGroup.packages.filter((p) => !p.isReleaseGroupRoot));
        }
        if (selection.releaseGroupRoots.length > 0 &&
            mm.isMatch(releaseGroup.name, selection.releaseGroupRoots)) {
            addAllToSet(selected, releaseGroup.packages.filter((p) => p.isReleaseGroupRoot));
        }
    }
    return selected;
};
/**
 * Selects packages from the BuildProject based on the selection criteria. The selected packages will be filtered by the
 * filter criteria if provided.
 *
 * @param buildProject - The BuildProject.
 * @param selection - The selection criteria to use to select packages.
 * @param filter - An optional filter criteria to filter selected packages by.
 * @returns An object containing the selected packages and the filtered packages.
 */
export async function selectAndFilterPackages(buildProject, selection, filter) {
    // Select the packages from the repo
    const selected = [...(await selectPackagesFromRepo(buildProject, selection))];
    // Filter resulting list if needed
    const filtered = filter === undefined ? selected : await filterPackages(selected, filter);
    return { selected, filtered };
}
/**
 * Filters a list of packages by the filter criteria.
 *
 * @param packages - An array of packages to be filtered.
 * @param filters - The filter criteria to filter the packages by.
 * @typeParam T - The type of the package-like objects being filtered.
 * @returns An array containing only the filtered items.
 */
export async function filterPackages(packages, filters) {
    const filtered = packages.filter((pkg) => {
        if (filters === undefined) {
            return true;
        }
        const isPrivate = pkg.private ?? false;
        if (filters.private !== undefined && filters.private !== isPrivate) {
            return false;
        }
        const scopeIn = scopesToPrefix(filters?.scope);
        const scopeOut = scopesToPrefix(filters?.skipScope);
        if (scopeIn !== undefined) {
            let found = false;
            for (const scope of scopeIn) {
                found ||= pkg.name.startsWith(scope);
            }
            if (!found) {
                return false;
            }
        }
        if (scopeOut !== undefined) {
            for (const scope of scopeOut) {
                if (pkg.name.startsWith(scope) === true) {
                    return false;
                }
            }
        }
        return true;
    });
    return filtered;
}
function scopesToPrefix(scopes) {
    return scopes === undefined ? undefined : scopes.map((s) => `${s}/`);
}
/**
 * Adds all the items of an iterable to a set.
 *
 * @param set - The set to which items will be added.
 * @param iterable - The iterable containing items to add to the set.
 */
export function addAllToSet(set, iterable) {
    for (const item of iterable) {
        set.add(item);
    }
}
//# sourceMappingURL=filter.js.map